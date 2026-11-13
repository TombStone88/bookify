const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const path = require("path");
const fs = require("fs-extra");

const Club = require("../models/Club");
const Book = require("../models/Book");
const Message = require("../models/Message");
const ReadingProgress = require("../models/ReadingProgress");
const User = require("../models/User");
const Challenge = require("../models/Challenge");
const Poll = require("../models/Poll");
const DiscussionTopic = require("../models/DiscussionTopic");
const ClubEvent = require("../models/ClubEvent");
const authMiddleware = require("../middleware/authMiddleware");
const { sendNotification } = require("../utils/notify");

// Generate random invite code
const generateInviteCode = () => {
  return Math.random().toString(36).substring(2, 8);
};

// Create Club
router.post("/create", authMiddleware, async (req, res) => {
  try {
    const inviteCode = Math.random().toString(36).substring(2, 8);
    const category = req.body.category
      ? String(req.body.category).trim().toLowerCase()
      : "general";

    const club = new Club({
      name: req.body.name,
      description: req.body.description,
      category,
      inviteCode,
      admin: req.user.userId, // REQUIRED
      members: [req.user.userId],
    });

    await club.save();

    res.json(club);
  } catch (error) {
    console.error(error);
    res.status(500).json({
      error: error.message,
    });
  }
});

// Remove member (admin only)
router.delete("/remove-member/:clubId/:memberId", authMiddleware, async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.clubId)) {
      return res.status(400).json({ error: "Invalid club ID" });
    }

    const club = await Club.findById(req.params.clubId);
    if (!club) {
      return res.status(404).json({ error: "Club not found" });
    }

    // Check admin permission
    if (club.admin.toString() !== req.user.userId) {
      return res.status(403).json({ error: "Only admin can remove members" });
    }

    // Prevent admin removing themselves
    if (req.params.memberId === req.user.userId) {
      return res.status(400).json({ error: "Admin cannot remove themselves" });
    }

    // Remove member
    club.members = club.members.filter(
      (member) => member && member.toString() !== req.params.memberId
    );

    await club.save();

    res.json({ message: "Member removed successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

// Delete club (admin only) - cleans up all books, physical files, messages & reading progress
router.delete("/delete/:clubId", authMiddleware, async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.clubId)) {
      return res.status(400).json({ error: "Invalid club ID" });
    }

    const club = await Club.findById(req.params.clubId);
    if (!club) {
      return res.status(404).json({ error: "Club not found" });
    }

    if (club.admin.toString() !== req.user.userId) {
      return res.status(403).json({ error: "Only admin can delete club" });
    }

    // Find and delete all books belonging to this club and their files
    const clubBooks = await Book.find({ clubId: club._id });
    for (const b of clubBooks) {
      if (b.fileUrl && b.fileUrl.startsWith("/uploads/")) {
        await fs.remove(path.join(__dirname, "..", b.fileUrl)).catch(() => {});
      }
      if (b.coverImage && b.coverImage.startsWith("/uploads/")) {
        await fs.remove(path.join(__dirname, "..", b.coverImage)).catch(() => {});
      }
      await ReadingProgress.deleteMany({ book: b._id });
      await User.updateMany({ favoriteBooks: b._id }, { $pull: { favoriteBooks: b._id } });
    }
    await Book.deleteMany({ clubId: club._id });

    // Delete all messages belonging to this club
    await Message.deleteMany({ clubId: club._id });

    // Clean up all challenges, polls, discussions & events for this club
    await Challenge.deleteMany({ club: club._id });
    await Poll.deleteMany({ club: club._id });
    await DiscussionTopic.deleteMany({ club: club._id });
    await ClubEvent.deleteMany({ club: club._id });

    await club.deleteOne();

    res.json({ message: "Club deleted" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Join Club - safely handles ObjectId checking to prevent duplicate memberships
router.post("/join/:inviteCode", authMiddleware, async (req, res) => {
  try {
    const club = await Club.findOne({
      inviteCode: req.params.inviteCode,
    });

    if (!club) {
      return res.status(404).json({ message: "Club not found" });
    }

    const alreadyMember = club.members.some(
      (m) => m && m.toString() === req.user.userId.toString()
    );

    if (!alreadyMember) {
      club.members.push(req.user.userId);
      await club.save();

      // Dispatch notification to club host
      if (club.admin && club.admin.toString() !== req.user.userId.toString()) {
        const io = req.app.get("io");
        const joiner = await User.findById(req.user.userId).select("username name");
        const joinerName = joiner?.username || joiner?.name || "A new reader";

        sendNotification({
          io,
          recipients: [club.admin],
          sender: req.user.userId,
          type: "club_member_joined",
          title: `New reader in ${club.name}`,
          message: `${joinerName} has joined your club circle.`,
          referenceId: club._id,
          referenceType: "club",
        }).catch((err) => console.error("Join notification error:", err.message));
      }
    }

    res.json({
      message: "Joined club successfully",
      club,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Invite reader to club
router.post("/invite/:clubId", authMiddleware, async (req, res) => {
  try {
    const { clubId } = req.params;
    const { usernameOrEmail } = req.body;

    if (!mongoose.isValidObjectId(clubId)) {
      return res.status(400).json({ error: "Invalid club ID" });
    }

    if (!usernameOrEmail || !usernameOrEmail.trim()) {
      return res.status(400).json({ error: "Username or email is required" });
    }

    const club = await Club.findById(clubId);
    if (!club) {
      return res.status(404).json({ error: "Club not found" });
    }

    // Verify caller is member or host
    const isCallerMember =
      club.admin.toString() === req.user.userId.toString() ||
      club.members.some((m) => m && m.toString() === req.user.userId.toString());

    if (!isCallerMember) {
      return res.status(403).json({ error: "Access denied. You are not a member of this club." });
    }

    const cleanInput = usernameOrEmail.trim().toLowerCase();
    const targetUser = await User.findOne({
      $or: [{ username: cleanInput }, { email: cleanInput }],
    });

    if (!targetUser) {
      return res.status(404).json({ error: "User not found" });
    }

    if (targetUser._id.toString() === req.user.userId.toString()) {
      return res.status(400).json({ error: "You cannot invite yourself" });
    }

    const alreadyInClub =
      club.admin.toString() === targetUser._id.toString() ||
      club.members.some((m) => m && m.toString() === targetUser._id.toString());

    if (alreadyInClub) {
      return res.status(400).json({ error: "Reader is already a member of this club" });
    }

    const inviter = await User.findById(req.user.userId).select("username name");
    const inviterName = inviter?.username || inviter?.name || "A club member";
    const io = req.app.get("io");

    await sendNotification({
      io,
      recipients: [targetUser._id],
      sender: req.user.userId,
      type: "club_invitation",
      title: `Invitation to ${club.name}`,
      message: `${inviterName} invited you to join "${club.name}" with code ${club.inviteCode}`,
      referenceId: club._id,
      referenceType: "club",
    });

    res.json({ message: `Invitation sent to ${targetUser.username}!` });
  } catch (err) {
    console.error("Invite error:", err);
    res.status(500).json({ error: "An internal server error occurred." });
  }
});

// Get My Clubs - enriched with currentBook, memberCount, and messagesCount to eliminate N+1 queries
router.get("/my-clubs", authMiddleware, async (req, res) => {
  try {
    const clubs = await Club.find({
      members: req.user.userId,
    }).populate("admin", "name username");

    const clubIds = clubs.map((c) => c._id);

    // Fetch all books for these clubs
    const allBooks = await Book.find({ clubId: { $in: clubIds } }).sort({ createdAt: 1 });
    const booksByClub = new Map();
    for (const b of allBooks) {
      const cId = b.clubId.toString();
      if (!booksByClub.has(cId)) booksByClub.set(cId, []);
      booksByClub.get(cId).push(b);
    }

    // Aggregate message counts
    const msgCounts = await Message.aggregate([
      { $match: { clubId: { $in: clubIds } } },
      { $group: { _id: "$clubId", count: { $sum: 1 } } },
    ]);
    const msgCountMap = new Map(msgCounts.map((m) => [m._id.toString(), m.count]));

    const enrichedClubs = clubs.map((club) => {
      const cId = club._id.toString();
      const clubBooks = booksByClub.get(cId) || [];
      const currentBook = clubBooks.length > 0 ? clubBooks[clubBooks.length - 1] : null;
      const adminUser = club.admin;
      const curatorName = adminUser
        ? adminUser._id?.toString() === req.user.userId.toString()
          ? "You"
          : adminUser.name || adminUser.username || "Club Host"
        : "Club Host";

      const clubObj = club.toObject();
      return {
        ...clubObj,
        category: club.category || "general",
        currentBook,
        books: clubBooks,
        curatorName,
        memberCount: club.members ? club.members.length : 1,
        messagesCount: msgCountMap.get(cId) || 0,
      };
    });

    res.json(enrichedClubs);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get Club Directory - returns all Athenaeum circles for discovery with category, curator, and member count
router.get("/directory", authMiddleware, async (req, res) => {
  try {
    const clubs = await Club.find().populate("admin", "name username");
    const clubIds = clubs.map((c) => c._id);

    const allBooks = await Book.find({ clubId: { $in: clubIds } }).sort({ createdAt: 1 });
    const booksByClub = new Map();
    for (const b of allBooks) {
      const cId = b.clubId.toString();
      if (!booksByClub.has(cId)) booksByClub.set(cId, []);
      booksByClub.get(cId).push(b);
    }

    const directoryClubs = clubs.map((club) => {
      const cId = club._id.toString();
      const clubBooks = booksByClub.get(cId) || [];
      const currentBook = clubBooks.length > 0 ? clubBooks[clubBooks.length - 1] : null;
      const adminUser = club.admin;
      const curatorName = adminUser
        ? adminUser._id?.toString() === req.user.userId.toString()
          ? "You"
          : adminUser.name || adminUser.username || "Club Host"
        : "Club Host";

      const isMember = (club.members || []).some(
        (m) => m && m.toString() === req.user.userId.toString()
      );

      const clubObj = club.toObject();
      return {
        ...clubObj,
        category: club.category || "general",
        currentBook,
        books: clubBooks,
        curatorName,
        memberCount: club.members ? club.members.length : 1,
        isJoined: isMember,
      };
    });

    res.json(directoryClubs);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get club members - strictly protected by club membership authorization
router.get("/members/:clubId", authMiddleware, async (req, res) => {
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

    const club = await Club.findById(req.params.clubId).populate("members", "name username email");
    if (!club) {
      return res.status(404).json({ error: "Club not found" });
    }

    const adminId = club.admin ? club.admin.toString() : null;

    res.json({
      members: club.members,
      admin: adminId,
      inviteCode: club.inviteCode,
      name: club.name,
    });
  } catch (error) {
    console.error("Members route error:", error);
    res.status(500).json({ error: error.message });
  }
});

// Leave Club
router.delete("/leave/:clubId", authMiddleware, async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.clubId)) {
      return res.status(400).json({ error: "Invalid club ID" });
    }

    const club = await Club.findById(req.params.clubId);
    if (!club) {
      return res.status(404).json({ message: "Club not found" });
    }

    club.members = club.members.filter(
      (member) => member && member.toString() !== req.user.userId
    );

    await club.save();

    res.json({ message: "Left club successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
