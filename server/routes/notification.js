const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const Notification = require("../models/Notification");
const authMiddleware = require("../middleware/authMiddleware");

// ── GET NOTIFICATIONS (WITH PAGINATION) ────────────────────
router.get("/", authMiddleware, async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const skip = (page - 1) * limit;

    const query = { recipient: req.user.userId };

    const [notifications, total, unreadCount] = await Promise.all([
      Notification.find(query)
        .populate("sender", "name username")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Notification.countDocuments(query),
      Notification.countDocuments({ recipient: req.user.userId, isRead: false }),
    ]);

    res.json({
      notifications,
      total,
      page,
      totalPages: Math.ceil(total / limit) || 1,
      unreadCount,
    });
  } catch (err) {
    console.error("Fetch notifications error:", err);
    res.status(500).json({ error: "An internal server error occurred." });
  }
});

// ── GET UNREAD NOTIFICATION COUNT ──────────────────────────
router.get("/unread-count", authMiddleware, async (req, res) => {
  try {
    const unreadCount = await Notification.countDocuments({
      recipient: req.user.userId,
      isRead: false,
    });

    res.json({ unreadCount });
  } catch (err) {
    console.error("Fetch unread count error:", err);
    res.status(500).json({ error: "An internal server error occurred." });
  }
});

// ── MARK SINGLE NOTIFICATION AS READ ───────────────────────
const markOneRead = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ error: "Invalid notification ID" });
    }

    const notification = await Notification.findOne({
      _id: id,
      recipient: req.user.userId,
    });

    if (!notification) {
      return res.status(404).json({ error: "Notification not found" });
    }

    notification.isRead = true;
    await notification.save();

    res.json({ message: "Notification marked as read", notification });
  } catch (err) {
    console.error("Mark read error:", err);
    res.status(500).json({ error: "An internal server error occurred." });
  }
};

router.patch("/:id/read", authMiddleware, markOneRead);
router.put("/:id/read", authMiddleware, markOneRead);

// ── MARK ALL NOTIFICATIONS AS READ ─────────────────────────
const markAllRead = async (req, res) => {
  try {
    const result = await Notification.updateMany(
      { recipient: req.user.userId, isRead: false },
      { $set: { isRead: true } }
    );

    res.json({
      message: "All notifications marked as read",
      modifiedCount: result.modifiedCount,
    });
  } catch (err) {
    console.error("Mark all read error:", err);
    res.status(500).json({ error: "An internal server error occurred." });
  }
};

router.patch("/read-all", authMiddleware, markAllRead);
router.put("/read-all", authMiddleware, markAllRead);

// ── DELETE NOTIFICATION ────────────────────────────────────
router.delete("/:id", authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ error: "Invalid notification ID" });
    }

    const notification = await Notification.findOne({
      _id: id,
      recipient: req.user.userId,
    });

    if (!notification) {
      return res.status(404).json({ error: "Notification not found" });
    }

    await notification.deleteOne();

    res.json({ message: "Notification deleted successfully" });
  } catch (err) {
    console.error("Delete notification error:", err);
    res.status(500).json({ error: "An internal server error occurred." });
  }
});

module.exports = router;
