const express = require("express");
const router = express.Router();
const multer = require("multer");

const User = require("../models/User");
const authMiddleware = require("../middleware/authMiddleware");

// storage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/profile/");
  },

  filename: function (req, file, cb) {
    cb(null, Date.now() + "-" + file.originalname);
  }
});

const upload = multer({ storage });


// upload profile image
router.post(
  "/upload-profile",
  authMiddleware,
  upload.single("image"),
  async (req, res) => {

    const imageUrl =
      `http://localhost:5000/uploads/profile/${req.file.filename}`;

    const user = await User.findByIdAndUpdate(
      req.user.userId,
      { profileImage: imageUrl },
      { new: true }
    );

    res.json(user);
  }
);


// update username
router.put("/username", authMiddleware, async (req, res) => {

  const user = await User.findByIdAndUpdate(
    req.user.userId,
    { username: req.body.username },
    { new: true }
  );

  res.json(user);
});

router.get("/me", authMiddleware, async (req, res) => {

  const user = await User.findById(req.user.userId);

  res.json(user);

});
module.exports = router;