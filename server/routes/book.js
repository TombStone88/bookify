const express = require("express");
const router = express.Router();

const Book = require("../models/Book");
const authMiddleware = require("../middleware/authMiddleware");

const multer = require("multer");
const path = require("path");
const pdf = require("pdf-poppler");
const fs = require("fs-extra");

// =======================
// 📦 MULTER CONFIG
// =======================
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/");
  },

  filename: function (req, file, cb) {
    cb(null, Date.now() + "-" + file.originalname);
  },
});

const upload = multer({ storage });

// =======================
// 📤 UPLOAD BOOK + AUTO COVER
// =======================
router.post(
  "/upload/",
  authMiddleware,
  upload.single("file"),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          error: "No file uploaded",
        });
      }

      const filename = req.file.filename;
      const pdfPath = req.file.path;

      console.log("PDF uploaded:", filename);

      // =======================
      // 📸 AUTO COVER EXTRACTION
      // =======================
      await fs.ensureDir("uploads/covers");

      const baseName = filename.split(".")[0];

      const opts = {
        format: "png",
        out_dir: path.join(__dirname, "../uploads/covers"),
        out_prefix: baseName,
        page: 1,
      };

      let coverImageUrl = null;

      try {
        await pdf.convert(pdfPath, opts);

        const coverFile = `${baseName}-1.png`;

        coverImageUrl = `http://localhost:5000/uploads/covers/${coverFile}`;
      } catch (err) {
        console.error("Cover extraction failed:", err);

        // fallback cover
        coverImageUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(
          req.body.title
        )}&size=200`;
      }

      // =======================
      // 💾 SAVE BOOK
      // =======================
      const mongoose = require("mongoose");

const clubId =
  req.body.clubId && req.body.clubId !== ""
    ? new mongoose.Types.ObjectId(req.body.clubId)
    : null;
      const book = new Book({
        title: req.body.title,
        author: req.body.author,
        description: req.body.description,

        fileUrl: `http://localhost:5000/uploads/${filename}`,

        coverImage: coverImageUrl, // 👈 AUTO COVER

        clubId: clubId,

        uploadedBy: req.user.userId,
      });

      const saved = await book.save();

      console.log("Saved to DB:", saved.coverImage);

      res.json(saved);
    } catch (error) {
      console.error("ERROR:", error);

      res.status(500).json({
        error: error.message,
      });
    }
  }
);

// =======================
// 📚 GET USER BOOKS
// =======================
router.get("/user/books", authMiddleware, async (req, res) => {
  try {
    const books = await Book.find({
      uploadedBy: req.user.userId,
      $or: [
        { clubId: null },
        { clubId: { $exists: false } }
      ]
    });

    res.json(books);
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
});

// =======================
// 📚 GET CLUB BOOKS
// =======================
router.get("/:clubId", authMiddleware, async (req, res) => {
  try {
    const books = await Book.find({
      clubId: req.params.clubId,
    });

    res.json(books);
  } catch (error) {
    res.status(500).json({
      error: error.message,
    });
  }
});

// =======================
// 🗑 DELETE BOOK
// =======================
router.delete("/delete/:id", authMiddleware, async (req, res) => {
  try {
    const book = await Book.findById(req.params.id);

    if (!book) {
      return res.status(404).json({ message: "Book not found" });
    }

    if (book.uploadedBy.toString() !== req.user.userId) {
      return res.status(403).json({ message: "Not authorized" });
    }

    await Book.findByIdAndDelete(req.params.id);

    res.json({ message: "Book deleted" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// =======================
// 📖 UPDATE PROGRESS
// =======================
// update progress
router.put("/progress/:id", authMiddleware, async (req, res) => {
  try {
    const { progress } = req.body;

    const book = await Book.findByIdAndUpdate(
      req.params.id,
      {
        progress,
        lastReadAt: new Date(),
      },
      { new: true }
    );

    res.json(book);
  } catch (err) {
    res.status(500).json({ error: "Failed to update progress" });
  }
});

module.exports = router;