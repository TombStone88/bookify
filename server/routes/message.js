const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");

const Message = require("../models/Message");
const Club = require("../models/Club");
const authMiddleware = require("../middleware/authMiddleware");
const { sendNotification } = require("../utils/notify");

// Send Message
router.post("/send/:clubId", authMiddleware, async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.clubId)) {
      return res.status(400).json({ error: "Invalid club ID" });
    }

    if (!req.body.text || !req.body.text.trim()) {
      return res.status(400).json({ error: "Message text cannot be empty." });
    }

    const isMember = await Club.exists({
      _id: req.params.clubId,
      $or: [{ members: req.user.userId }, { admin: req.user.userId }],
    });

    if (!isMember) {
      return res.status(403).json({ error: "Access denied. You are not a member of this club." });
    }

    const message = new Message({
      clubId: req.params.clubId,
      sender: req.user.userId,
      text: req.body.text.trim(),
    });

    await message.save();

    // populate sender before returning
    const populatedMessage = await Message.findById(message._id)
      .populate("sender", "name username");

    // Dispatch real-time notification to fellow club members
    const club = await Club.findById(req.params.clubId).select("name admin members");
    if (club) {
      const io = req.app.get("io");
      const senderName =
        populatedMessage.sender?.username ||
        populatedMessage.sender?.name ||
        req.user.username ||
        "A reader";
      const snippet = req.body.text.trim();
      const preview = snippet.length > 55 ? `${snippet.slice(0, 55)}…` : snippet;
      const recipients = [club.admin, ...(club.members || [])].filter(Boolean);

      sendNotification({
        io,
        recipients,
        sender: req.user.userId,
        type: "club_message",
        title: `Discussion in ${club.name}`,
        message: `${senderName}: "${preview}"`,
        referenceId: club._id,
        referenceType: "club",
      }).catch((err) => console.error("Message notification error:", err.message));
    }

    res.json(populatedMessage);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get Messages
router.get("/:clubId", authMiddleware, async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.clubId)) {
      return res.status(400).json({ error: "Invalid club ID" });
    }

    const isMember = await Club.exists({
      _id: req.params.clubId,
      $or: [{ members: req.user.userId }, { admin: req.user.userId }],
    });

    if (!isMember) {
      return res.status(403).json({ error: "Access denied. You are not a member of this club." });
    }

    const messages = await Message.find({
      clubId: req.params.clubId,
    })
      .populate("sender", "name username")
      .sort({ createdAt: 1 });

    res.json(messages);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
