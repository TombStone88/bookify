const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");

const Challenge = require("../models/Challenge");
const Club = require("../models/Club");
const authMiddleware = require("../middleware/authMiddleware");
const { sendNotification } = require("../utils/notify");

// Helper: check club membership
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

// ── 1. GET ALL CHALLENGES FOR A CLUB ──────────────────────
router.get("/club/:clubId", authMiddleware, async (req, res) => {
  try {
    const check = await verifyClubMembership(req.params.clubId, req.user.userId);
    if (check.error) return res.status(check.status).json({ error: check.error });

    const challenges = await Challenge.find({ club: req.params.clubId })
      .populate("creator", "username name profileImage")
      .populate("participants.user", "username name profileImage")
      .sort({ createdAt: -1 });

    const now = new Date();

    const enriched = challenges.map((ch) => {
      const chObj = ch.toObject();
      const start = new Date(ch.startDate);
      const end = new Date(ch.endDate);

      let status = "active";
      if (now < start) status = "upcoming";
      else if (now > end) status = "completed";

      const myPart = (ch.participants || []).find(
        (p) => p.user && (p.user._id || p.user).toString() === req.user.userId.toString()
      );

      const myProgress = myPart ? myPart.currentProgress : 0;
      const myCompleted = myPart ? myPart.completed : false;
      const completedCount = (ch.participants || []).filter((p) => p.completed).length;
      const totalClubProgress = (ch.participants || []).reduce(
        (sum, p) => sum + (p.currentProgress || 0),
        0
      );

      const target = ch.targetGoal || 1;
      const myPercent = Math.min(100, Math.round((myProgress / target) * 100));

      return {
        ...chObj,
        status,
        myProgress,
        myCompleted,
        myPercent,
        completedCount,
        participantsCount: (ch.participants || []).length,
        totalClubProgress,
      };
    });

    res.json(enriched);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ── 2. CREATE A READING CHALLENGE (HOST ONLY) ─────────────
router.post("/club/:clubId", authMiddleware, async (req, res) => {
  try {
    const check = await verifyClubMembership(req.params.clubId, req.user.userId);
    if (check.error) return res.status(check.status).json({ error: check.error });
    if (!check.isHost) {
      return res.status(403).json({ error: "Only the club host can create reading challenges." });
    }

    const { title, description, goalType, targetGoal, startDate, endDate } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ error: "Challenge title is required." });
    }

    const numericGoal = Number(targetGoal);
    if (!numericGoal || numericGoal < 1) {
      return res.status(400).json({ error: "Target reading goal must be at least 1." });
    }

    if (!startDate || !endDate) {
      return res.status(400).json({ error: "Start and end dates are required." });
    }

    const parsedStart = new Date(startDate);
    const parsedEnd = new Date(endDate);

    if (isNaN(parsedStart.getTime()) || isNaN(parsedEnd.getTime())) {
      return res.status(400).json({ error: "Invalid date format provided." });
    }

    if (parsedEnd < parsedStart) {
      return res.status(400).json({ error: "End date cannot be prior to start date." });
    }

    const challenge = new Challenge({
      club: req.params.clubId,
      creator: req.user.userId,
      title: title.trim(),
      description: (description || "").trim(),
      goalType: goalType === "books" ? "books" : "pages",
      targetGoal: Math.floor(numericGoal),
      startDate: parsedStart,
      endDate: parsedEnd,
      participants: [],
    });

    await challenge.save();

    const populated = await Challenge.findById(challenge._id).populate(
      "creator",
      "username name profileImage"
    );

    // Notify club members
    const io = req.app.get("io");
    if (io) {
      io.to(req.params.clubId).emit("newChallenge", populated);
    }

    const recipients = (check.club.members || []).filter(
      (m) => m && m.toString() !== req.user.userId.toString()
    );
    sendNotification({
      io,
      recipients,
      sender: req.user.userId,
      type: "club_message",
      title: `New Challenge in ${check.club.name}`,
      message: `New reading challenge: "${title.trim()}" (${numericGoal} ${goalType === "books" ? "books" : "pages"})`,
      referenceId: check.club._id,
      referenceType: "club",
    }).catch(() => {});

    res.status(201).json(populated);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ── 3. UPDATE INDIVIDUAL PROGRESS ─────────────────────────
router.post("/:challengeId/progress", authMiddleware, async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.challengeId)) {
      return res.status(400).json({ error: "Invalid challenge ID" });
    }

    const challenge = await Challenge.findById(req.params.challengeId);
    if (!challenge) {
      return res.status(404).json({ error: "Challenge not found" });
    }

    const check = await verifyClubMembership(challenge.club, req.user.userId);
    if (check.error) return res.status(check.status).json({ error: check.error });

    const rawProgress = req.body.progress;
    if (rawProgress === undefined || isNaN(Number(rawProgress)) || Number(rawProgress) < 0) {
      return res.status(400).json({ error: "Progress must be a non-negative number." });
    }

    const newProgress = Math.floor(Number(rawProgress));
    const isCompleted = newProgress >= challenge.targetGoal;

    const existingIndex = challenge.participants.findIndex(
      (p) => p.user && p.user.toString() === req.user.userId.toString()
    );

    if (existingIndex > -1) {
      challenge.participants[existingIndex].currentProgress = newProgress;
      challenge.participants[existingIndex].completed = isCompleted;
      if (isCompleted && !challenge.participants[existingIndex].completedAt) {
        challenge.participants[existingIndex].completedAt = new Date();
      }
      challenge.participants[existingIndex].updatedAt = new Date();
    } else {
      challenge.participants.push({
        user: req.user.userId,
        currentProgress: newProgress,
        completed: isCompleted,
        completedAt: isCompleted ? new Date() : null,
        updatedAt: new Date(),
      });
    }

    await challenge.save();

    res.json({
      message: "Progress updated successfully",
      challengeId: challenge._id,
      myProgress: newProgress,
      isCompleted,
      targetGoal: challenge.targetGoal,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ── 4. DELETE CHALLENGE (HOST ONLY) ───────────────────────
router.delete("/:challengeId", authMiddleware, async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.challengeId)) {
      return res.status(400).json({ error: "Invalid challenge ID" });
    }

    const challenge = await Challenge.findById(req.params.challengeId);
    if (!challenge) {
      return res.status(404).json({ error: "Challenge not found" });
    }

    const check = await verifyClubMembership(challenge.club, req.user.userId);
    if (check.error) return res.status(check.status).json({ error: check.error });
    if (!check.isHost) {
      return res.status(403).json({ error: "Only the club host can delete reading challenges." });
    }

    await challenge.deleteOne();

    res.json({ message: "Challenge deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
