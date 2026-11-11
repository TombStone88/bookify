const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const path = require("path");
const fs = require("fs-extra");

const Book = require("../models/Book");
const Club = require("../models/Club");
const ReadingProgress = require("../models/ReadingProgress");
const User = require("../models/User");
const authMiddleware = require("../middleware/authMiddleware");
const { validateFile, generateSafeFilename } = require("../utils/fileValidation");
const { sendNotification } = require("../utils/notify");
const { discoverBookCover } = require("../utils/coverDiscovery");
const multer = require("multer");

// ── Multer config ──────────────────────────────────────────
const uploadDir = path.join(__dirname, "../uploads");
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    fs.ensureDirSync(uploadDir);
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    cb(null, generateSafeFilename(file.originalname));
  },
});
const upload = multer({ storage });

// Wrapper to catch Multer errors and return 400 with clean error JSON
const handleMulterUpload = (req, res, next) => {
  upload.single("file")(req, res, (err) => {
    if (err) {
      if (err instanceof multer.MulterError) {
        return res.status(400).json({ error: `File upload error: ${err.message}` });
      }
      return res.status(400).json({ error: err.message || "Failed to process file upload" });
    }
    next();
  });
};

// ── Helper: generate cover from PDF first page using pdf2pic ──
async function extractCover(pdfPath, baseName) {
  try {
    const { fromPath } = require("pdf2pic");
    const coversDir = path.join(__dirname, "../uploads/covers");
    await fs.ensureDir(coversDir);
    const converter = fromPath(pdfPath, {
      density: 100,
      saveFilename: baseName,
      savePath: coversDir,
      format: "png",
      width: 400,
      height: 560,
    });
    await converter(1); // convert first page
    const pngPath = path.join(coversDir, `${baseName}.1.png`);
    if (await fs.pathExists(pngPath)) {
      const { processCoverImage } = require("../utils/imageOptimizer");
      const optimized = await processCoverImage(pngPath, baseName);
      await fs.remove(pngPath).catch(() => {});
      return optimized.url;
    }
    return `/uploads/covers/${baseName}.1.png`;
  } catch (err) {
    // pdf2pic not available or failed — return null so caller uses fallback
    return null;
  }
}

// ── UPLOAD BOOK ────────────────────────────────────────────
router.post(["/upload", "/upload/"], authMiddleware, handleMulterUpload, async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    // If uploading to a club, verify club existence and user membership upfront
    let clubId = null;
    if (
      req.body.clubId &&
      req.body.clubId !== "" &&
      req.body.clubId !== "null" &&
      req.body.clubId !== "undefined"
    ) {
      if (!mongoose.isValidObjectId(req.body.clubId)) {
        await fs.remove(req.file.path).catch(() => {});
        return res.status(400).json({ error: "Invalid club ID" });
      }

      const isMember = await Club.exists({
        _id: req.body.clubId,
        $or: [{ members: req.user.userId }, { admin: req.user.userId }],
      });

      if (!isMember) {
        await fs.remove(req.file.path).catch(() => {});
        return res.status(403).json({ error: "Access denied. You are not a member of this club." });
      }

      clubId = new mongoose.Types.ObjectId(req.body.clubId);
    }

    // Integrate file validation (magic byte check, extension allowlist, and size limit)
    const validation = await validateFile(req.file.path, {
      expectedType: "pdf",
      originalFilename: req.file.originalname,
      allowedExtensions: [".pdf"],
      maxBytes: 50 * 1024 * 1024, // 50MB
    });

    if (!validation.isValid) {
      await fs.remove(req.file.path).catch(() => {});
      return res.status(400).json({ error: validation.error });
    }

    const filename = req.file.filename;
    const pdfPath = req.file.path;
    const baseName = filename.replace(/\.[^.]+$/, "");

    // Automatic Cover Discovery: PDF metadata + Google Books + Open Library + Antiquarian fallback
    let coverImageUrl = await extractCover(pdfPath, baseName);
    if (!coverImageUrl) {
      coverImageUrl = await discoverBookCover({
        title: req.body.title,
        author: req.body.author,
        pdfPath,
        baseName,
      });
    }

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

    // If uploaded to a club, notify club members about the new book
    if (clubId) {
      const club = await Club.findById(clubId).select("name admin members");
      if (club) {
        const io = req.app.get("io");
        const uploader = await User.findById(req.user.userId).select("username name");
        const uploaderName = uploader?.username || uploader?.name || "A club member";
        const recipients = [club.admin, ...(club.members || [])].filter(Boolean);

        sendNotification({
          io,
          recipients,
          sender: req.user.userId,
          type: "club_book",
          title: `New book in ${club.name}`,
          message: `${uploaderName} added "${saved.title || "a new volume"}" to the club library.`,
          referenceId: saved._id,
          referenceType: "book",
        }).catch((err) => console.error("Book notification error:", err.message));
      }
    }

    res.json(saved);
  } catch (error) {
    if (req.file?.path) {
      await fs.remove(req.file.path).catch(() => {});
    }
    console.error("Upload error:", error);
    res.status(500).json({ error: "An internal server error occurred." });
  }
});

// ── GET USER BOOKS ─────────────────────────────────────────
router.get("/user/books", authMiddleware, async (req, res) => {
  try {
    const books = await Book.find({
      uploadedBy: req.user.userId,
      $or: [{ clubId: null }, { clubId: { $exists: false } }],
    });

    const bookIds = books.map((b) => b._id);
    const progressDocs = await ReadingProgress.find({
      user: req.user.userId,
      book: { $in: bookIds },
    });
    const progressMap = new Map(progressDocs.map((p) => [p.book.toString(), p]));

    const merged = books.map((b) => {
      const bObj = typeof b.toObject === "function" ? b.toObject() : { ...b };
      const p = progressMap.get(b._id.toString());
      if (p) {
        bObj.currentPage = p.currentPage;
        bObj.progress = p.progress;
        bObj.totalPages = p.totalPages || b.totalPages;
        bObj.rating = p.rating;
        bObj.note = p.note;
        bObj.lastReadAt = p.lastReadAt;
      }
      return bObj;
    });

    res.json(merged);

    // Non-blocking background upgrade for books with missing/placeholder covers
    upgradeExistingCovers(books).catch(() => {});
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Helper for background cover resolution
async function upgradeExistingCovers(books) {
  for (const book of books) {
    if (!book.coverImage || book.coverImage.includes("ui-avatars.com")) {
      try {
        const cover = await discoverBookCover({
          title: book.title,
          author: book.author,
          baseName: `book-${book._id}`,
        });
        if (cover && cover !== book.coverImage) {
          await Book.updateOne({ _id: book._id }, { $set: { coverImage: cover } });
        }
      } catch (err) {
        // Safe non-blocking error handling
      }
    }
  }
}

// ── RESOLVE COVERS FOR EXISTING BOOKS ──────────────────────
router.post("/resolve-covers", authMiddleware, async (req, res) => {
  try {
    const books = await Book.find({
      uploadedBy: req.user.userId,
      $or: [
        { coverImage: null },
        { coverImage: "" },
        { coverImage: { $regex: /ui-avatars\.com/i } },
      ],
    });

    let resolvedCount = 0;
    const updated = [];

    for (const book of books) {
      try {
        const cover = await discoverBookCover({
          title: book.title,
          author: book.author,
          baseName: `book-${book._id}`,
        });

        if (cover && cover !== book.coverImage) {
          book.coverImage = cover;
          await book.save();
          resolvedCount++;
          updated.push({ id: book._id, title: book.title, coverImage: cover });
        }
      } catch (err) {
        console.error(`Failed resolving cover for ${book._id}:`, err.message);
      }
    }

    res.json({
      message: `Resolved covers for ${resolvedCount} book(s)`,
      resolvedCount,
      books: updated,
    });
  } catch (error) {
    console.error("Resolve covers error:", error);
    res.status(500).json({ error: "An internal server error occurred." });
  }
});

// ── GET SINGLE BOOK DETAILS ───────────────────────────────
router.get("/details/:id", authMiddleware, async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(404).json({ error: "Volume not found in the Athenaeum registry" });
    }

    const book = await Book.findById(req.params.id);
    if (!book) return res.status(404).json({ error: "Volume not found in the Athenaeum registry" });

    if (book.clubId) {
      // Club book: verify active membership
      const isMember = await Club.exists({
        _id: book.clubId,
        $or: [{ members: req.user.userId }, { admin: req.user.userId }],
      });
      if (!isMember) {
        return res.status(403).json({ error: "Access denied. You are not a member of this club." });
      }
    } else {
      // Personal book: verify uploadedBy ownership
      const isOwner =
        book.uploadedBy &&
        book.uploadedBy.toString() === req.user.userId.toString();
      if (!isOwner) {
        return res.status(403).json({ error: "Access denied. You do not own this volume." });
      }
    }

    // Attach per-user reading progress
    const userProgress = await ReadingProgress.findOne({
      user: req.user.userId,
      book: book._id,
    });

    const responseData = typeof book.toObject === "function" ? book.toObject() : { ...book };
    if (userProgress) {
      responseData.currentPage = userProgress.currentPage;
      responseData.progress = userProgress.progress;
      responseData.totalPages = userProgress.totalPages || book.totalPages;
      responseData.rating = userProgress.rating;
      responseData.note = userProgress.note;
      responseData.lastReadAt = userProgress.lastReadAt;
    } else if (book.clubId) {
      // For club books, default to clean initial user progress
      responseData.currentPage = 1;
      responseData.progress = 0;
      responseData.rating = 0;
      responseData.note = "";
    }

    res.json(responseData);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET CLUB BOOKS ─────────────────────────────────────────
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

    const books = await Book.find({ clubId: req.params.clubId });
    const bookIds = books.map((b) => b._id);
    const progressDocs = await ReadingProgress.find({
      user: req.user.userId,
      book: { $in: bookIds },
    });
    const progressMap = new Map(progressDocs.map((p) => [p.book.toString(), p]));

    const merged = books.map((b) => {
      const bObj = typeof b.toObject === "function" ? b.toObject() : { ...b };
      const p = progressMap.get(b._id.toString());
      if (p) {
        bObj.currentPage = p.currentPage;
        bObj.progress = p.progress;
        bObj.totalPages = p.totalPages || b.totalPages;
        bObj.rating = p.rating;
        bObj.note = p.note;
        bObj.lastReadAt = p.lastReadAt;
      } else {
        bObj.currentPage = 1;
        bObj.progress = 0;
        bObj.rating = 0;
        bObj.note = "";
      }
      return bObj;
    });

    res.json(merged);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ── DELETE BOOK ────────────────────────────────────────────
router.delete("/delete/:id", authMiddleware, async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: "Invalid book ID" });
    }

    const book = await Book.findById(req.params.id);
    if (!book) return res.status(404).json({ message: "Book not found" });

    if (!book.uploadedBy || book.uploadedBy.toString() !== req.user.userId) {
      return res.status(403).json({ message: "Not authorized" });
    }

    // Clean up physical files on disk
    if (book.fileUrl && book.fileUrl.startsWith("/uploads/")) {
      const pdfPath = path.join(__dirname, "..", book.fileUrl);
      await fs.remove(pdfPath).catch(() => {});
    }
    if (book.coverImage && book.coverImage.startsWith("/uploads/")) {
      const coverPath = path.join(__dirname, "..", book.coverImage);
      await fs.remove(coverPath).catch(() => {});
    }

    // Clean up associated ReadingProgress records
    await ReadingProgress.deleteMany({ book: book._id });

    // Remove from all user favoriteBooks arrays
    await User.updateMany(
      { favoriteBooks: book._id },
      { $pull: { favoriteBooks: book._id } }
    );

    await Book.findByIdAndDelete(req.params.id);
    res.json({ message: "Book deleted" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ── UPDATE PROGRESS / RATING / NOTE (Isolated Per User in ReadingProgress) ──
router.put("/progress/:id", authMiddleware, async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ error: "Invalid book ID" });
    }

    const book = await Book.findById(req.params.id);
    if (!book) return res.status(404).json({ error: "Book not found" });

    // Enforce authorization: user must own personal book OR be a member of the club book
    if (book.clubId) {
      const isMember = await Club.exists({
        _id: book.clubId,
        $or: [{ members: req.user.userId }, { admin: req.user.userId }],
      });
      if (!isMember) {
        return res.status(403).json({ error: "Access denied. You are not a member of this club." });
      }
    } else {
      if (!book.uploadedBy || book.uploadedBy.toString() !== req.user.userId.toString()) {
        return res.status(403).json({ error: "Access denied. You do not own this volume." });
      }
    }

    const { progress, currentPage, totalPages, rating, note } = req.body;
    const update = { lastReadAt: new Date() };

    if (progress !== undefined) update.progress = Math.min(100, Math.max(0, Number(progress)));
    if (currentPage !== undefined) update.currentPage = Math.max(1, Number(currentPage));
    if (totalPages !== undefined) {
      const totalNum = Math.max(1, Number(totalPages));
      update.totalPages = totalNum;
      if (totalNum > (book.totalPages || 1)) {
        await Book.findByIdAndUpdate(book._id, { totalPages: totalNum });
      }
    }
    if (rating !== undefined) update.rating = Math.min(5, Math.max(0, Number(rating)));
    if (note !== undefined) update.note = String(note);

    const userProgress = await ReadingProgress.findOneAndUpdate(
      { user: req.user.userId, book: book._id },
      { $set: update },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    const responseData = typeof book.toObject === "function" ? book.toObject() : { ...book };
    responseData.currentPage = userProgress.currentPage;
    responseData.progress = userProgress.progress;
    responseData.totalPages = userProgress.totalPages || book.totalPages;
    responseData.rating = userProgress.rating;
    responseData.note = userProgress.note;
    responseData.lastReadAt = userProgress.lastReadAt;

    res.json(responseData);
  } catch (err) {
    res.status(500).json({ error: "Failed to update reading progress" });
  }
});

module.exports = router;
