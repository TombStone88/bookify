const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");

const Poll = require("../models/Poll");
const Club = require("../models/Club");
require("../models/User");
const authMiddleware = require("../middleware/authMiddleware");
const { sendNotification } = require("../utils/notify");

async function verifyClubMembership(clubId, userId) {
  if (!mongoose.isValidObjectId(clubId)) return { error: "Invalid club ID", status: 400 };
  const club = await Club.findById(clubId);
  if (!club) return { error: "Club not found", status: 404 };

  const isHost = club.admin.toString() === userId.toString();
  const isMember = isHost || (club.members || []).some((m) => m && m.toString() === userId.toString());

  if (!isMember) {
    return { error: "Access denied. You are not a member of this club.", status: 403 };
  }
  return { club, isHost, isMember };
}

function formatEnrichedPoll(p, userIdStr) {
  const pObj = typeof p.toObject === "function" ? p.toObject() : { ...p };
  const now = new Date();
  const isExpired = p.closesAt ? now > new Date(p.closesAt) : false;
  const isClosed = Boolean(p.isClosed || isExpired);

  const totalVotes = (p.options || []).reduce(
    (acc, opt) => acc + (opt.votes ? opt.votes.length : 0),
    0
  );

  let hasVoted = false;
  let votedOptionId = null;

  const enrichedOptions = (p.options || []).map((opt) => {
    const votes = opt.votes || [];
    const voteCount = votes.length;
    const isMyVote = votes.some((v) => v && v.toString() === userIdStr);
    if (isMyVote) {
      hasVoted = true;
      votedOptionId = opt._id.toString();
    }
    const percentage = totalVotes > 0 ? Math.round((voteCount / totalVotes) * 100) : 0;
    return {
      _id: opt._id,
      text: opt.text,
      voteCount,
      percentage,
      isMyVote,
    };
  });

  return {
    ...pObj,
    options: enrichedOptions,
    totalVotes,
    hasVoted,
    votedOptionId,
    isClosed,
  };
}

// ── 1. GET ALL POLLS FOR A CLUB ───────────────────────────
router.get("/club/:clubId", authMiddleware, async (req, res) => {
  try {
    const check = await verifyClubMembership(req.params.clubId, req.user.userId);
    if (check.error) return res.status(check.status).json({ error: check.error });

    const polls = await Poll.find({ club: req.params.clubId })
      .populate("creator", "username name profileImage")
      .sort({ createdAt: -1 });

    const userIdStr = req.user.userId.toString();
    const enriched = polls.map((p) => formatEnrichedPoll(p, userIdStr));

    res.json(enriched);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ── 2. CREATE A POLL (HOST ONLY) ──────────────────────────
router.post("/club/:clubId", authMiddleware, async (req, res) => {
  try {
    const check = await verifyClubMembership(req.params.clubId, req.user.userId);
    if (check.error) return res.status(check.status).json({ error: check.error });
    if (!check.isHost) {
      return res.status(403).json({ error: "Only the club host can create polls." });
    }

    const { question, description, options, closesAt } = req.body;

    if (!question || !question.trim()) {
      return res.status(400).json({ error: "Poll question is required." });
    }

    if (!Array.isArray(options) || options.length < 2) {
      return res.status(400).json({ error: "A poll must contain at least 2 options." });
    }

    const cleanedOptions = options
      .map((opt) => (typeof opt === "string" ? opt.trim() : (opt?.text || "").trim()))
      .filter(Boolean);

    if (cleanedOptions.length < 2) {
      return res.status(400).json({ error: "Please provide at least 2 non-empty options." });
    }

    let parsedClosesAt = null;
    if (closesAt) {
      parsedClosesAt = new Date(closesAt);
      if (isNaN(parsedClosesAt.getTime())) {
        return res.status(400).json({ error: "Invalid closing date and time format." });
      }
      const currentYear = new Date().getFullYear();
      if (parsedClosesAt.getFullYear() < currentYear || parsedClosesAt.getFullYear() > 2099) {
        return res
          .status(400)
          .json({ error: `Closing year must be between ${currentYear} and 2099.` });
      }
      if (parsedClosesAt <= new Date()) {
        return res.status(400).json({ error: "Poll closing date must be set in the future." });
      }
    }

    const poll = new Poll({
      club: req.params.clubId,
      creator: req.user.userId,
      question: question.trim(),
      description: (description || "").trim(),
      options: cleanedOptions.map((text) => ({ text, votes: [] })),
      closesAt: parsedClosesAt,
      isClosed: false,
    });

    await poll.save();

    let populated = null;
    const query = Poll.findById(poll._id);
    if (query && typeof query.populate === "function") {
      populated = await query.populate("creator", "username name profileImage");
    } else {
      populated = await query;
      if (populated && typeof populated.populate === "function") {
        await populated.populate("creator", "username name profileImage");
      }
    }

    const enriched = formatEnrichedPoll(populated || poll, req.user.userId.toString());

    // Broadcast new poll to club room
    const io = req.app && typeof req.app.get === "function" ? req.app.get("io") : null;
    if (io) {
      io.to(req.params.clubId).emit("newPoll", enriched);
    }

    const recipients = (check.club.members || []).filter(
      (m) => m && m.toString() !== req.user.userId.toString()
    );
    sendNotification({
      io,
      recipients,
      sender: req.user.userId,
      type: "club_message",
      title: `New Poll in ${check.club.name}`,
      message: `Vote on: "${question.trim()}"`,
      referenceId: check.club._id,
      referenceType: "club",
    }).catch(() => {});

    res.status(201).json(enriched);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ── 3. VOTE ON A POLL (MEMBERS) ───────────────────────────
router.post("/:pollId/vote", authMiddleware, async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.pollId)) {
      return res.status(400).json({ error: "Invalid poll ID" });
    }

    const poll = await Poll.findById(req.params.pollId);
    if (!poll) {
      return res.status(404).json({ error: "Poll not found" });
    }

    const check = await verifyClubMembership(poll.club, req.user.userId);
    if (check.error) return res.status(check.status).json({ error: check.error });

    const now = new Date();
    const isExpired = poll.closesAt ? now > new Date(poll.closesAt) : false;
    if (poll.isClosed || isExpired) {
      return res.status(400).json({ error: "This poll is closed for voting." });
    }

    const { optionId } = req.body;
    if (!optionId || !mongoose.isValidObjectId(optionId)) {
      return res.status(400).json({ error: "Valid option ID is required." });
    }

    const userIdStr = req.user.userId.toString();

    // Prevent duplicate voting: check if user already voted in any option
    const alreadyVoted = poll.options.some((opt) =>
      opt.votes.some((v) => v && v.toString() === userIdStr)
    );

    if (alreadyVoted) {
      return res.status(400).json({ error: "You have already cast your vote in this poll." });
    }

    const targetOption = poll.options.id(optionId);
    if (!targetOption) {
      return res.status(404).json({ error: "Poll option not found." });
    }

    targetOption.votes.push(req.user.userId);
    await poll.save();

    let populated = null;
    try {
      const query = Poll.findById(poll._id);
      if (query && typeof query.populate === "function") {
        populated = await query.populate("creator", "username name profileImage");
      } else {
        populated = await query;
        if (populated && typeof populated.populate === "function") {
          await populated.populate("creator", "username name profileImage");
        }
      }
    } catch (_) {
      populated = poll;
    }
    const enriched = formatEnrichedPoll(populated || poll, userIdStr);

    const io = req.app && typeof req.app.get === "function" ? req.app.get("io") : null;
    if (io) {
      io.to(poll.club.toString()).emit("pollUpdated", enriched);
    }

    res.json({
      message: "Vote recorded successfully",
      poll: enriched,
      votedOptionId: optionId,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ── 4. CLOSE OR REOPEN POLL (HOST ONLY) ───────────────────
router.put("/:pollId/close", authMiddleware, async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.pollId)) {
      return res.status(400).json({ error: "Invalid poll ID" });
    }

    const poll = await Poll.findById(req.params.pollId);
    if (!poll) {
      return res.status(404).json({ error: "Poll not found" });
    }

    const check = await verifyClubMembership(poll.club, req.user.userId);
    if (check.error) return res.status(check.status).json({ error: check.error });
    if (!check.isHost) {
      return res.status(403).json({ error: "Only the club host can close or manage polls." });
    }

    poll.isClosed = req.body.isClosed !== undefined ? Boolean(req.body.isClosed) : !poll.isClosed;
    await poll.save();

    let populated = null;
    try {
      const query = Poll.findById(poll._id);
      if (query && typeof query.populate === "function") {
        populated = await query.populate("creator", "username name profileImage");
      } else {
        populated = await query;
        if (populated && typeof populated.populate === "function") {
          await populated.populate("creator", "username name profileImage");
        }
      }
    } catch (_) {
      populated = poll;
    }
    const enriched = formatEnrichedPoll(populated || poll, req.user.userId.toString());

    const io = req.app && typeof req.app.get === "function" ? req.app.get("io") : null;
    if (io) {
      io.to(poll.club.toString()).emit("pollUpdated", enriched);
    }

    res.json({
      message: `Poll ${poll.isClosed ? "closed" : "reopened"} successfully`,
      poll: enriched,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ── 5. DELETE POLL (HOST ONLY) ────────────────────────────
router.delete("/:pollId", authMiddleware, async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.pollId)) {
      return res.status(400).json({ error: "Invalid poll ID" });
    }

    const poll = await Poll.findById(req.params.pollId);
    if (!poll) {
      return res.status(404).json({ error: "Poll not found" });
    }

    const check = await verifyClubMembership(poll.club, req.user.userId);
    if (check.error) return res.status(check.status).json({ error: check.error });
    if (!check.isHost) {
      return res.status(403).json({ error: "Only the club host can delete polls." });
    }

    const clubIdStr = poll.club.toString();
    await poll.deleteOne();

    const io = req.app && typeof req.app.get === "function" ? req.app.get("io") : null;
    if (io) {
      io.to(clubIdStr).emit("pollDeleted", req.params.pollId);
    }

    res.json({ message: "Poll deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
