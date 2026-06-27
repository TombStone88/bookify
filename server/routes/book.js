const express = require("express");
const router = express.Router();
const Book = require("../models/Book");
const authMiddleware = require("../middleware/authMiddleware");
const multer = require("multer");
const path = require("path");
const fs = require("fs-extra");

// ── Multer config ──────────────────────────────────────────
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/");
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + "-" + file.originalname);
  },
});
const upload = multer({ storage });

// ── Helper: generate cover from PDF first page using pdf2pic ──
async function extractCover(pdfPath, baseName) {
  try {
    const { fromPath } = require("pdf2pic");
    await fs.ensureDir("uploads/covers");
    const converter = fromPath(pdfPath, {
      density: 100,
      saveFilename: baseName,
      savePath: path.join(__dirname, "../uploads/covers"),
      format: "png",
      width: 200,
      height: 280,
    });
    await converter(1); // convert first page
    return `/uploads/covers/${baseName}.1.png`;
  } catch (err) {
    // pdf2pic not available or failed — return null so caller uses fallback
    return null;
  }
}

// ── UPLOAD BOOK ────────────────────────────────────────────
router.post("/upload/", authMiddleware, upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const filename = req.file.filename;
    const pdfPath = req.file.path;
    const baseName = filename.replace(/\.[^.]+$/, "");

    // Try to extract cover; fall back to avatar API
    let coverImageUrl = await extractCover(pdfPath, baseName);
    if (!coverImageUrl) {
      coverImageUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(
        req.body.title || "Book"
      )}&size=200&background=F0306A&color=ffffff&bold=true`;
    }

    const mongoose = require("mongoose");
    const clubId =
      req.body.clubId && req.body.clubId !== ""
        ? new mongoose.Types.ObjectId(req.body.clubId)
        : null;

    const book = new Book({
      title: req.body.title,
      author: req.body.author,
      description: req.body.description,
      fileUrl: `/uploads/${filename}`,
      coverImage: coverImageUrl,
      clubId,
      uploadedBy: req.user.userId,
    });

    const saved = await book.save();
    res.json(saved);
  } catch (error) {
    console.error("Upload error:", error);
    res.status(500).json({ error: error.message });
  }
});

// ── GET USER BOOKS ─────────────────────────────────────────
router.get("/user/books", authMiddleware, async (req, res) => {
  try {
    const books = await Book.find({
      uploadedBy: req.user.userId,
      $or: [{ clubId: null }, { clubId: { $exists: false } }],
    });
    res.json(books);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ── GET CLUB BOOKS ─────────────────────────────────────────
router.get("/:clubId", authMiddleware, async (req, res) => {
  try {
    const books = await Book.find({ clubId: req.params.clubId });
    res.json(books);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ── DELETE BOOK ────────────────────────────────────────────
router.delete("/delete/:id", authMiddleware, async (req, res) => {
  try {
    const book = await Book.findById(req.params.id);
    if (!book) return res.status(404).json({ message: "Book not found" });
    if (book.uploadedBy.toString() !== req.user.userId)
      return res.status(403).json({ message: "Not authorized" });
    await Book.findByIdAndDelete(req.params.id);
    res.json({ message: "Book deleted" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ── UPDATE PROGRESS / RATING / NOTE ───────────────────────
router.put("/progress/:id", authMiddleware, async (req, res) => {
  try {
    const { progress, rating, note } = req.body;
    const update = { lastReadAt: new Date() };
    if (progress !== undefined) update.progress = progress;
    if (rating !== undefined) update.rating = rating;
    if (note !== undefined) update.note = note;
    const book = await Book.findByIdAndUpdate(req.params.id, update, { new: true });
    res.json(book);
  } catch (err) {
    res.status(500).json({ error: "Failed to update" });
  }
});

module.exports = router;
