const express = require("express");
const router = express.Router();

const Club = require("../models/Club");
const authMiddleware = require("../middleware/authMiddleware");

// Generate random invite code
const generateInviteCode = () => {
  return Math.random().toString(36).substring(2, 8);
};

// Create Club
router.post("/create", authMiddleware, async (req, res) => {
  try {
    const inviteCode = Math.random().toString(36).substring(2, 8);

    const club = new Club({
      name: req.body.name,

      description: req.body.description,

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
router.delete("/remove-member/:clubId/:memberId",
  authMiddleware,
  async (req, res) => {

    try {

      const club = await Club.findById(req.params.clubId);

      if (!club)
        return res.status(404).json({
          error: "Club not found"
        });

      // Check admin permission
      if (club.admin.toString() !== req.user.userId)
        return res.status(403).json({
          error: "Only admin can remove members"
        });

      // Prevent admin removing themselves
      if (req.params.memberId === req.user.userId)
        return res.status(400).json({
          error: "Admin cannot remove themselves"
        });

      // Remove member
      club.members = club.members.filter(
        member =>
          member.toString() !== req.params.memberId
      );

      await club.save();

      res.json({
        message: "Member removed successfully"
      });

    } catch (error) {

      console.error(error);

      res.status(500).json({
        error: error.message
      });

    }

});

// Delete club (admin only)
router.delete("/delete/:clubId", authMiddleware, async (req, res) => {
  try {
    const club = await Club.findById(req.params.clubId);

    if (!club)
      return res.status(404).json({
        error: "Club not found",
      });

    if (club.admin.toString() !== req.user.userId)
      return res.status(403).json({
        error: "Only admin can delete club",
      });

    await club.deleteOne();

    res.json({
      message: "Club deleted",
    });
  } catch (error) {
    res.status(500).json({
      error: error.message,
    });
  }
});

// Join Club
router.post("/join/:inviteCode", authMiddleware, async (req, res) => {
  try {
    const club = await Club.findOne({
      inviteCode: req.params.inviteCode,
    });

    if (!club) {
      return res.status(404).json({
        message: "Club not found",
      });
    }

    if (!club.members.includes(req.user.userId)) {
      club.members.push(req.user.userId);

      await club.save();
    }

    res.json({
      message: "Joined club successfully",
      club,
    });
  } catch (error) {
    res.status(500).json({
      error: error.message,
    });
  }
});

// Get My Clubs
router.get("/my-clubs", authMiddleware, async (req, res) => {
  try {
    const clubs = await Club.find({
      members: req.user.userId,
    });

    res.json(clubs);
  } catch (error) {
    res.status(500).json({
      error: error.message,
    });
  }
});

// Get club members
router.get("/members/:clubId", authMiddleware, async (req, res) => {

  try {

    const club = await Club.findById(req.params.clubId)
      .populate("members", "name email");

    if (!club) {
      return res.status(404).json({
        error: "Club not found"
      });
    }

    // admin may be undefined in old clubs
    const adminId = club.admin ? club.admin.toString() : null;

    res.json({
      members: club.members,
      admin: adminId
    });

  } catch (error) {

    console.error("Members route error:", error);

    res.status(500).json({
      error: error.message
    });

  }

});

module.exports = router;
