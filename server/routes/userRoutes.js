const express = require("express");
const router = express.Router();
const multer = require("multer");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const path = require("path");
const fs = require("fs-extra");

const User = require("../models/User");
const Book = require("../models/Book");
const Club = require("../models/Club");
const ReadingProgress = require("../models/ReadingProgress");
const authMiddleware = require("../middleware/authMiddleware");
const { validateFile } = require("../utils/fileValidation");
const { processProfileImage } = require("../utils/imageOptimizer");

const VALID_MOODS = [
  "📖 Reading",
  "💬 Available to chat",
  "🎧 Busy",
  "✨ Taking a break",
  "☕ Coffee time",
  "🧠 Deep focus",
];

const VALID_AVAILABILITIES = ["Online", "Away", "Do Not Disturb", "Offline"];

// ── Optional Auth Middleware for Public Views ───────────────
const optionalAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return next();
  const token = authHeader.split(" ")[1];
  if (!token) return next();

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
  } catch (err) {
    // Ignore invalid token on optional routes
  }
  next();
};

// ── Storage Configuration ──────────────────────────────────
const profileUploadDir = path.join(__dirname, "../uploads/profile");
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    fs.ensureDirSync(profileUploadDir);
    cb(null, profileUploadDir);
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + "-" + file.originalname.replace(/[^a-zA-Z0-9.-]/g, "_"));
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Only image files are allowed"), false);
    }
  },
});

// ── Helper: Compute Real Reading Activity ──────────────────
function computeReadingActivity(books) {
  const currentYear = new Date().getFullYear();
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  const monthlyActivity = months.map((m, idx) => ({
    month: m,
    monthIndex: idx,
    completed: 0,
    active: 0,
  }));

  let totalCompleted = 0;
  let inProgress = 0;

  books.forEach((b) => {
    const isCompleted = (b.progress || 0) >= 100;
    const isInProgress = (b.progress || 0) > 0 && (b.progress || 0) < 100;
    if (isCompleted) totalCompleted++;
    if (isInProgress) inProgress++;

    const dateToUse = b.lastReadAt ? new Date(b.lastReadAt) : b.createdAt ? new Date(b.createdAt) : null;
    if (dateToUse && dateToUse.getFullYear() === currentYear) {
      const mIdx = dateToUse.getMonth();
      if (mIdx >= 0 && mIdx < 12) {
        if (isCompleted) {
          monthlyActivity[mIdx].completed++;
        }
        monthlyActivity[mIdx].active++;
      }
    }
  });

  const quarters = [
    { label: "Q1 • Vellum Days", count: monthlyActivity.slice(0, 3).reduce((acc, c) => acc + c.completed, 0), months: "Jan - Mar" },
    { label: "Q2 • Summer Solstice", count: monthlyActivity.slice(3, 6).reduce((acc, c) => acc + c.completed, 0), months: "Apr - Jun" },
    { label: "Q3 • Autumn Harvest", count: monthlyActivity.slice(6, 9).reduce((acc, c) => acc + c.completed, 0), months: "Jul - Sep" },
    { label: "Q4 • Winter Vigils", count: monthlyActivity.slice(9, 12).reduce((acc, c) => acc + c.completed, 0), months: "Oct - Dec" },
  ];

  let peak = { month: "None", count: 0 };
  monthlyActivity.forEach((m) => {
    if (m.completed > peak.count) {
      peak = { month: m.month, count: m.completed };
    }
  });

  return {
    year: currentYear,
    totalBooks: books.length,
    completed: totalCompleted,
    inProgress,
    monthlyActivity,
    quarters,
    peakMonth: peak.count > 0 ? `${peak.month} (${peak.count} ${peak.count === 1 ? "Tome" : "Tomes"})` : "None recorded yet",
    completionRate: books.length > 0 ? Math.round((totalCompleted / books.length) * 100) : 0,
  };
}

// ── 1. UPLOAD PROFILE IMAGE ────────────────────────────────
router.post(
  "/upload-profile",
  authMiddleware,
  upload.single("image"),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No image file provided" });
      }

      // Validate file with magic-byte check, extension allowlist, and size cap
      const validation = await validateFile(req.file.path, {
        expectedType: "image",
        originalFilename: req.file.originalname,
        allowedExtensions: [".jpg", ".jpeg", ".png", ".webp"],
        maxBytes: 5 * 1024 * 1024,
      });

      if (!validation.isValid) {
        await fs.remove(req.file.path).catch(() => {});
        return res.status(400).json({ error: validation.error });
      }

      // Clean up previous uploaded avatar if it was a local file
      const currentUser = await User.findById(req.user.userId);
      if (
        currentUser &&
        currentUser.profileImage &&
        currentUser.profileImage.startsWith("/uploads/profile/")
      ) {
        const oldPath = path.join(__dirname, "..", currentUser.profileImage);
        const oldThumbPath = oldPath.replace(/\.webp$/, "-thumb.webp");
        await fs.remove(oldPath).catch(() => {});
        await fs.remove(oldThumbPath).catch(() => {});
      }

      // Resize and compress avatar to WebP standard (256x256) and thumbnail (64x64)
      const optimized = await processProfileImage(req.file.path);
      const imageUrl = optimized.url;

      const user = await User.findByIdAndUpdate(
        req.user.userId,
        { profileImage: imageUrl },
        { new: true }
      ).select("-password").populate("favoriteBooks");

      res.json(user);
    } catch (err) {
      if (req.file?.path) {
        await fs.remove(req.file.path).catch(() => {});
      }
      res.status(500).json({ error: err.message });
    }
  }
);

// ── 2. UPDATE USERNAME (Backward-Compatible) ───────────────
router.put("/username", authMiddleware, async (req, res) => {
  try {
    const { username } = req.body;
    if (!username || !username.trim()) {
      return res.status(400).json({ error: "Username cannot be empty" });
    }

    const trimmed = username.trim();
    // Check if taken by another user
    const existing = await User.findOne({
      username: new RegExp(`^${trimmed}$`, "i"),
      _id: { $ne: req.user.userId },
    });
    if (existing) {
      return res.status(400).json({ error: "Username is already claimed by another reader" });
    }

    const user = await User.findByIdAndUpdate(
      req.user.userId,
      { username: trimmed },
      { new: true }
    ).select("-password").populate("favoriteBooks");

    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── 3. UPDATE PROFILE (Bio, Genres, Interests, Favs, Status) ───────
router.put("/profile", authMiddleware, async (req, res) => {
  try {
    const { username, bio, favoriteGenres, readingInterests, favoriteBooks, mood, customStatus, availability } = req.body;

    const updates = {};
    if (username !== undefined) {
      const trimmed = username.trim();
      if (!trimmed) {
        return res.status(400).json({ error: "Username cannot be empty" });
      }
      const existing = await User.findOne({
        username: new RegExp(`^${trimmed}$`, "i"),
        _id: { $ne: req.user.userId },
      });
      if (existing) {
        return res.status(400).json({ error: "Username is already claimed by another reader" });
      }
      updates.username = trimmed;
    }

    if (bio !== undefined) updates.bio = bio.trim().slice(0, 500);
    if (favoriteGenres !== undefined) updates.favoriteGenres = favoriteGenres;
    if (readingInterests !== undefined) updates.readingInterests = readingInterests;

    if (mood !== undefined) {
      if (!VALID_MOODS.includes(mood)) {
        return res.status(400).json({ error: "Invalid mood option." });
      }
      updates.mood = mood;
    }

    if (customStatus !== undefined) {
      const trimmed = (customStatus || "").toString().trim();
      if (trimmed.length > 100) {
        return res.status(400).json({ error: "Custom status must not exceed 100 characters." });
      }
      updates.customStatus = trimmed;
    }

    if (availability !== undefined) {
      if (!VALID_AVAILABILITIES.includes(availability)) {
        return res.status(400).json({ error: "Invalid availability status." });
      }
      updates.availability = availability;
    }

    if (favoriteBooks !== undefined) {
      if (!Array.isArray(favoriteBooks)) {
        return res.status(400).json({ error: "favoriteBooks must be an array of book IDs." });
      }

      for (const bookId of favoriteBooks) {
        if (!mongoose.isValidObjectId(bookId)) {
          return res.status(400).json({ error: "One or more favorite book IDs are invalid." });
        }
      }

      const uniqueIds = Array.from(new Set(favoriteBooks.map((id) => id.toString())));

      if (uniqueIds.length > 0) {
        const validBooks = await Book.find({
          _id: { $in: uniqueIds },
          uploadedBy: req.user.userId,
          $or: [{ clubId: null }, { clubId: { $exists: false } }],
        }).select("_id");

        if (validBooks.length !== uniqueIds.length) {
          return res.status(400).json({
            error: "One or more favorite books do not belong to your personal library.",
          });
        }
      }

      updates.favoriteBooks = uniqueIds;
    }

    const user = await User.findByIdAndUpdate(
      req.user.userId,
      updates,
      { new: true }
    ).select("-password").populate("favoriteBooks");

    if (user && user.favoriteBooks) {
      user.favoriteBooks = user.favoriteBooks.filter(
        (b) =>
          b &&
          b._id &&
          b.uploadedBy &&
          b.uploadedBy.toString() === req.user.userId.toString() &&
          !b.clubId
      );
    }

    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── 3B. UPDATE STATUS (Mood, Custom Status, Availability) ────
router.put("/status", authMiddleware, async (req, res) => {
  try {
    const { mood, customStatus, availability } = req.body;
    const updates = {};

    if (mood !== undefined) {
      if (!VALID_MOODS.includes(mood)) {
        return res.status(400).json({ error: "Invalid mood option." });
      }
      updates.mood = mood;
    }

    if (customStatus !== undefined) {
      const trimmed = (customStatus || "").toString().trim();
      if (trimmed.length > 100) {
        return res.status(400).json({ error: "Custom status must not exceed 100 characters." });
      }
      updates.customStatus = trimmed;
    }

    if (availability !== undefined) {
      if (!VALID_AVAILABILITIES.includes(availability)) {
        return res.status(400).json({ error: "Invalid availability status." });
      }
      updates.availability = availability;
    }

    const user = await User.findByIdAndUpdate(
      req.user.userId,
      updates,
      { new: true }
    ).select("-password").populate("favoriteBooks");

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json({
      message: "Status updated successfully",
      user: {
        _id: user._id,
        username: user.username,
        email: user.email,
        profileImage: user.profileImage,
        mood: user.mood || "📖 Reading",
        customStatus: user.customStatus || "",
        availability: user.availability || "Online",
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── 4. UPDATE PRIVACY SETTINGS ─────────────────────────────
router.put("/privacy", authMiddleware, async (req, res) => {
  try {
    const {
      isPublic,
      showReadingActivity,
      showCurrentlyReading,
      showFavoriteBooks,
      showClubs,
    } = req.body;

    const privacyUpdate = {};
    if (isPublic !== undefined) privacyUpdate["privacy.isPublic"] = Boolean(isPublic);
    if (showReadingActivity !== undefined)
      privacyUpdate["privacy.showReadingActivity"] = Boolean(showReadingActivity);
    if (showCurrentlyReading !== undefined)
      privacyUpdate["privacy.showCurrentlyReading"] = Boolean(showCurrentlyReading);
    if (showFavoriteBooks !== undefined)
      privacyUpdate["privacy.showFavoriteBooks"] = Boolean(showFavoriteBooks);
    if (showClubs !== undefined)
      privacyUpdate["privacy.showClubs"] = Boolean(showClubs);

    const user = await User.findByIdAndUpdate(
      req.user.userId,
      { $set: privacyUpdate },
      { new: true }
    ).select("-password").populate("favoriteBooks");

    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── 5. GET CURRENT USER PROFILE & DATA (/me) ───────────────
router.get("/me", authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId)
      .select("-password")
      .populate("favoriteBooks");

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Fetch user books with user's reading progress
    const books = await Book.find({
      uploadedBy: req.user.userId,
      $or: [{ clubId: null }, { clubId: { $exists: false } }],
    }).sort({ createdAt: -1 });

    const bookIds = books.map((b) => b._id);
    const progressDocs = await ReadingProgress.find({
      user: req.user.userId,
      book: { $in: bookIds },
    });
    const progressMap = new Map(progressDocs.map((p) => [p.book.toString(), p]));

    const booksWithProgress = books.map((b) => {
      const bObj = b.toObject();
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

    // Fetch user clubs
    const clubs = await Club.find({ members: req.user.userId });

    // Calculate reading activity from real books
    const activity = computeReadingActivity(booksWithProgress);

    // Identify current reading book
    const currentlyReading = booksWithProgress
      .filter((b) => (b.progress || 0) > 0 && (b.progress || 0) < 100)
      .sort((a, b) => new Date(b.lastReadAt || b.createdAt || 0) - new Date(a.lastReadAt || a.createdAt || 0))[0] || null;

    // Filter favorite books to ensure only owned personal books are returned
    const userFavoriteBooks = (user.favoriteBooks || []).filter(
      (b) =>
        b &&
        b._id &&
        b.uploadedBy &&
        b.uploadedBy.toString() === req.user.userId.toString() &&
        !b.clubId
    );

    res.json({
      user: {
        _id: user._id,
        username: user.username,
        email: user.email,
        profileImage: user.profileImage,
        bio: user.bio || "",
        mood: user.mood || "📖 Reading",
        customStatus: user.customStatus || "",
        availability: user.availability || "Online",
        favoriteGenres: user.favoriteGenres || [],
        readingInterests: user.readingInterests || [],
        favoriteBooks: userFavoriteBooks,
        privacy: user.privacy || {
          isPublic: true,
          showReadingActivity: true,
          showCurrentlyReading: true,
          showFavoriteBooks: true,
          showClubs: true,
        },
        createdAt: user.createdAt || user._id.getTimestamp(),
      },
      stats: {
        totalBooks: books.length,
        completedBooks: books.filter((b) => (b.progress || 0) >= 100).length,
        inProgressBooks: books.filter((b) => (b.progress || 0) > 0 && (b.progress || 0) < 100).length,
        activeClubs: clubs.length,
      },
      currentlyReading,
      activity,
      clubs,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── 6. GET PUBLIC PROFILE BY USERNAME ──────────────────────
// Strictly enforces privacy rules: does NOT return private data if protected!
router.get("/public/:username", optionalAuth, async (req, res) => {
  try {
    const usernameParam = req.params.username.trim();
    const user = await User.findOne({
      username: new RegExp(`^${usernameParam}$`, "i"),
    })
      .select("-password -email")
      .populate("favoriteBooks");

    if (!user) {
      return res.status(404).json({ error: "Reader not found in the Athenaeum registry" });
    }

    const isOwner =
      req.user &&
      req.user.userId &&
      req.user.userId.toString() === user._id.toString();

    const privacy = user.privacy || {
      isPublic: true,
      showReadingActivity: true,
      showCurrentlyReading: true,
      showFavoriteBooks: true,
      showClubs: true,
    };

    // If profile is private and requester is not the owner:
    if (!isOwner && !privacy.isPublic) {
      return res.json({
        isPrivate: true,
        isOwner: false,
        user: {
          _id: user._id,
          username: user.username,
          profileImage: user.profileImage,
          bio: "",
          mood: user.mood || "📖 Reading",
          customStatus: user.customStatus || "",
          availability: user.availability || "Online",
          createdAt: user.createdAt || user._id.getTimestamp(),
        },
      });
    }

    // Otherwise, public or owner. Fetch books and clubs.
    const books = await Book.find({
      uploadedBy: user._id,
      $or: [{ clubId: null }, { clubId: { $exists: false } }],
    }).sort({ createdAt: -1 });

    const bookIds = books.map((b) => b._id);
    const progressDocs = await ReadingProgress.find({
      user: user._id,
      book: { $in: bookIds },
    });
    const progressMap = new Map(progressDocs.map((p) => [p.book.toString(), p]));

    const booksWithProgress = books.map((b) => {
      const bObj = b.toObject();
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

    const clubs = await Club.find({ members: user._id });

    // Build the public payload respecting each granular privacy switch
    const payload = {
      isPrivate: false,
      isOwner,
      user: {
        _id: user._id,
        username: user.username,
        profileImage: user.profileImage,
        bio: user.bio || "",
        mood: user.mood || "📖 Reading",
        customStatus: user.customStatus || "",
        availability: user.availability || "Online",
        favoriteGenres: user.favoriteGenres || [],
        readingInterests: user.readingInterests || [],
        createdAt: user.createdAt || user._id.getTimestamp(),
      },
      stats: {
        totalBooks: booksWithProgress.length,
        completedBooks: booksWithProgress.filter((b) => (b.progress || 0) >= 100).length,
        inProgressBooks: booksWithProgress.filter((b) => (b.progress || 0) > 0 && (b.progress || 0) < 100).length,
        activeClubs: clubs.length,
      },
    };

    // Include privacy settings only if owner
    if (isOwner) {
      payload.user.privacy = privacy;
    }

    // Favorite Books: only if owner OR showFavoriteBooks is true
    if (isOwner || privacy.showFavoriteBooks) {
      payload.favoriteBooks = (user.favoriteBooks || []).filter(
        (b) =>
          b &&
          b._id &&
          b.uploadedBy &&
          b.uploadedBy.toString() === user._id.toString() &&
          !b.clubId
      );
    } else {
      payload.favoriteBooks = [];
    }

    // Currently Reading: only if owner OR showCurrentlyReading is true
    if (isOwner || privacy.showCurrentlyReading) {
      const currentlyReading = booksWithProgress
        .filter((b) => (b.progress || 0) > 0 && (b.progress || 0) < 100)
        .sort((a, b) => new Date(b.lastReadAt || b.createdAt || 0) - new Date(a.lastReadAt || a.createdAt || 0))[0] || null;
      payload.currentlyReading = currentlyReading;
    } else {
      payload.currentlyReading = null;
    }

    // Reading Activity: only if owner OR showReadingActivity is true
    if (isOwner || privacy.showReadingActivity) {
      payload.activity = computeReadingActivity(booksWithProgress);
    } else {
      payload.activity = null;
    }

    // Clubs: only if owner OR showClubs is true
    if (isOwner || privacy.showClubs) {
      payload.clubs = clubs.map((c) => ({
        _id: c._id,
        name: c.name,
        description: c.description,
        memberCount: c.members?.length || 1,
      }));
    } else {
      payload.clubs = [];
    }

    res.json(payload);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
