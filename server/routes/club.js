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

    const { name, description } = req.body;

    const inviteCode = generateInviteCode();

    const club = new Club({

      name,
      description,
      creator: req.user.userId,
      members: [req.user.userId],
      inviteCode

    });

    await club.save();

    res.json({
      message: "Club created successfully",
      club
    });

  } catch (error) {

    res.status(500).json({
      error: error.message
    });

  }

});



// Join Club
router.post("/join/:inviteCode", authMiddleware, async (req, res) => {

  try {

    const club = await Club.findOne({
      inviteCode: req.params.inviteCode
    });

    if (!club) {

      return res.status(404).json({
        message: "Club not found"
      });

    }

    if (!club.members.includes(req.user.userId)) {

      club.members.push(req.user.userId);

      await club.save();

    }

    res.json({
      message: "Joined club successfully",
      club
    });

  } catch (error) {

    res.status(500).json({
      error: error.message
    });

  }

});



// Get My Clubs
router.get("/my-clubs", authMiddleware, async (req, res) => {

  try {

    const clubs = await Club.find({
      members: req.user.userId
    }).populate("creator", "name email");

    res.json(clubs);

  } catch (error) {

    res.status(500).json({
      error: error.message
    });

  }

});


module.exports = router;