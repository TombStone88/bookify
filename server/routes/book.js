const express = require("express");
const router = express.Router();

const Book = require("../models/Book");
const authMiddleware = require("../middleware/authMiddleware");

const multer = require("multer");
const path = require("path");

// Storage config
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/");
  },

  filename: function (req, file, cb) {
    cb(null, Date.now() + "-" + file.originalname);
  },
});

const upload = multer({ storage });

const fs = require("fs-extra");

router.post(
  "/upload/:clubId",
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

      const book = new Book({
        title: req.body.title,
        author: req.body.author,
        description: req.body.description,

        fileUrl: `http://localhost:5000/uploads/${filename}`,

        clubId: req.params.clubId,

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
  },
);

// Get books uploaded by logged-in user
router.get("/user/books", authMiddleware, async (req, res) => {
  try {
    const books = await Book.find({
      uploadedBy: req.user.userId,
    });

    res.json(books);
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
});

// Get club books
router.get("/:clubId", authMiddleware, async (req, res) => {
  const books = await Book.find({
    clubId: req.params.clubId,
  });

  res.json(books);
});
// delete book
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

router.put("/progress/:bookId", authMiddleware, async (req, res) => {
  try {
    const { page } = req.body;

    const book = await Book.findById(req.params.bookId);

    book.currentPage = page;

    await book.save();

    res.json({ message: "Progress updated" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
