const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");

const DiscussionTopic = require("../models/DiscussionTopic");
const Club = require("../models/Club");
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

// ── 1. GET ALL TOPICS FOR A CLUB ──────────────────────────
router.get("/club/:clubId", authMiddleware, async (req, res) => {
  try {
    const check = await verifyClubMembership(req.params.clubId, req.user.userId);
    if (check.error) return res.status(check.status).json({ error: check.error });

    const topics = await DiscussionTopic.find({ club: req.params.clubId })
      .populate("author", "username name profileImage")
      .select("title content author pinned comments createdAt updatedAt")
      .sort({ pinned: -1, createdAt: -1 });

    const enriched = topics.map((t) => {
      const tObj = t.toObject();
      return {
        ...tObj,
        commentCount: (t.comments || []).length,
        comments: undefined, // Don't return heavy comment list in directory
      };
    });

    res.json(enriched);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ── 2. GET SINGLE TOPIC WITH FULL COMMENTS ────────────────
router.get("/:topicId", authMiddleware, async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.topicId)) {
      return res.status(400).json({ error: "Invalid topic ID" });
    }

    const topic = await DiscussionTopic.findById(req.params.topicId)
      .populate("author", "username name profileImage")
      .populate("comments.author", "username name profileImage");

    if (!topic) {
      return res.status(404).json({ error: "Discussion topic not found" });
    }

    const check = await verifyClubMembership(topic.club, req.user.userId);
    if (check.error) return res.status(check.status).json({ error: check.error });

    res.json(topic);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ── 3. CREATE A DISCUSSION TOPIC (MEMBERS) ────────────────
router.post("/club/:clubId", authMiddleware, async (req, res) => {
  try {
    const check = await verifyClubMembership(req.params.clubId, req.user.userId);
    if (check.error) return res.status(check.status).json({ error: check.error });

    const { title, content } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ error: "Topic title is required." });
    }

    if (!content || !content.trim()) {
      return res.status(400).json({ error: "Topic content/description is required." });
    }

    const topic = new DiscussionTopic({
      club: req.params.clubId,
      author: req.user.userId,
      title: title.trim(),
      content: content.trim(),
      pinned: false,
      comments: [],
    });

    await topic.save();

    const populated = await DiscussionTopic.findById(topic._id).populate(
      "author",
      "username name profileImage"
    );

    // Notify club room via socket
    const io = req.app.get("io");
    if (io) {
      io.to(req.params.clubId).emit("newTopic", populated);
    }

    res.status(201).json(populated);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ── 4. ADD A COMMENT TO A TOPIC ───────────────────────────
router.post("/:topicId/comments", authMiddleware, async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.topicId)) {
      return res.status(400).json({ error: "Invalid topic ID" });
    }

    const topic = await DiscussionTopic.findById(req.params.topicId);
    if (!topic) {
      return res.status(404).json({ error: "Discussion topic not found" });
    }

    const check = await verifyClubMembership(topic.club, req.user.userId);
    if (check.error) return res.status(check.status).json({ error: check.error });

    const { content } = req.body;
    if (!content || !content.trim()) {
      return res.status(400).json({ error: "Comment text cannot be empty." });
    }

    const comment = {
      author: req.user.userId,
      content: content.trim(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    topic.comments.push(comment);
    await topic.save();

    const updated = await DiscussionTopic.findById(topic._id).populate(
      "comments.author",
      "username name profileImage"
    );

    const newComment = updated.comments[updated.comments.length - 1];

    // Emit live comment event to club room
    const io = req.app.get("io");
    if (io) {
      io.to(topic.club.toString()).emit("newTopicComment", {
        topicId: topic._id,
        comment: newComment,
      });
    }

    res.status(201).json(newComment);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ── 5. PIN / UNPIN TOPIC (HOST ONLY) ──────────────────────
router.put("/:topicId/pin", authMiddleware, async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.topicId)) {
      return res.status(400).json({ error: "Invalid topic ID" });
    }

    const topic = await DiscussionTopic.findById(req.params.topicId);
    if (!topic) {
      return res.status(404).json({ error: "Discussion topic not found" });
    }

    const check = await verifyClubMembership(topic.club, req.user.userId);
    if (check.error) return res.status(check.status).json({ error: check.error });
    if (!check.isHost) {
      return res.status(403).json({ error: "Only the club host can pin topics." });
    }

    topic.pinned = req.body.pinned !== undefined ? Boolean(req.body.pinned) : !topic.pinned;
    await topic.save();

    res.json({ message: `Topic ${topic.pinned ? "pinned" : "unpinned"}`, pinned: topic.pinned });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ── 6. DELETE TOPIC (AUTHOR OR HOST) ──────────────────────
router.delete("/:topicId", authMiddleware, async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.topicId)) {
      return res.status(400).json({ error: "Invalid topic ID" });
    }

    const topic = await DiscussionTopic.findById(req.params.topicId);
    if (!topic) {
      return res.status(404).json({ error: "Discussion topic not found" });
    }

    const check = await verifyClubMembership(topic.club, req.user.userId);
    if (check.error) return res.status(check.status).json({ error: check.error });

    const isAuthor = topic.author.toString() === req.user.userId.toString();
    if (!isAuthor && !check.isHost) {
      return res.status(403).json({ error: "Only the topic author or club host can delete this topic." });
    }

    await topic.deleteOne();

    res.json({ message: "Topic deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ── 7. DELETE COMMENT (COMMENT AUTHOR OR HOST) ────────────
router.delete("/:topicId/comments/:commentId", authMiddleware, async (req, res) => {
  try {
    if (
      !mongoose.isValidObjectId(req.params.topicId) ||
      !mongoose.isValidObjectId(req.params.commentId)
    ) {
      return res.status(400).json({ error: "Invalid ID parameters" });
    }

    const topic = await DiscussionTopic.findById(req.params.topicId);
    if (!topic) {
      return res.status(404).json({ error: "Discussion topic not found" });
    }

    const check = await verifyClubMembership(topic.club, req.user.userId);
    if (check.error) return res.status(check.status).json({ error: check.error });

    const targetComment = topic.comments.id(req.params.commentId);
    if (!targetComment) {
      return res.status(404).json({ error: "Comment not found" });
    }

    const isAuthor = targetComment.author.toString() === req.user.userId.toString();
    if (!isAuthor && !check.isHost) {
      return res.status(403).json({ error: "Only the comment author or club host can delete this comment." });
    }

    topic.comments.pull(req.params.commentId);
    await topic.save();

    res.json({ message: "Comment deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
