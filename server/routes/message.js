const express = require("express");
const router = express.Router();

const Message = require("../models/Message");
const authMiddleware = require("../middleware/authMiddleware");


// Send Message
router.post("/send/:clubId", authMiddleware, async (req, res) => {

  try {

    const message = new Message({
      clubId: req.params.clubId,
      sender: req.user.userId,
      text: req.body.text
    });

    await message.save();

    // populate sender before returning
    const populatedMessage = await Message.findById(message._id)
      .populate("sender", "name username");

    res.json({
      message: "Message sent",
      data: populatedMessage
    });

  } catch (error) {

    res.status(500).json({ error: error.message });

  }

});


// Get Messages
router.get("/:clubId", authMiddleware, async (req, res) => {

  try {

    const messages = await Message.find({
      clubId: req.params.clubId
    })
    .populate("sender", "name username");

    res.json(messages);

  } catch (error) {

    res.status(500).json({ error: error.message });

  }

});

module.exports = router;