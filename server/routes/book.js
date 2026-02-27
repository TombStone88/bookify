const express = require("express");
const router = express.Router();

const Book = require("../models/Book");
const authMiddleware = require("../middleware/authMiddleware");

const multer = require("multer");
const pdf = require("pdf-poppler");
const path = require("path");

// Storage config
const storage = multer.diskStorage({

  destination: function (req, file, cb) {

    cb(null, "uploads/");

  },

  filename: function (req, file, cb) {

    cb(null, Date.now() + "-" + file.originalname);

  }

});

const upload = multer({ storage });


const fs = require("fs-extra");

router.post("/upload/:clubId",
  authMiddleware,
  upload.single("file"),
  async (req, res) => {

    try {

      if (!req.file) {
        return res.status(400).json({
          error: "No file uploaded"
        });
      }

      const filename = req.file.filename;

      const pdfPath = req.file.path;

      console.log("PDF uploaded:", filename);

      const options = {
        format: "png",
        out_dir: "uploads",
        out_prefix: filename.replace(".pdf", ""),
        page: 1
      };

      await pdf.convert(pdfPath, options);

      console.log("PDF converted");

      // AUTO-DETECT generated cover file
      const files = await fs.readdir("uploads");

      const coverFile = files.find(file =>
        file.startsWith(filename.replace(".pdf", "")) &&
        file.endsWith(".png")
      );

      if (!coverFile) {
        return res.status(500).json({
          error: "Cover image not found"
        });
      }

      console.log("Detected cover:", coverFile);

      const book = new Book({

        title: req.body.title,
        author: req.body.author,
        description: req.body.description,

        fileUrl:
          `http://localhost:5000/uploads/${filename}`,

        coverImage:
          `http://localhost:5000/uploads/${coverFile}`,

        clubId: req.params.clubId,

        uploadedBy: req.user.userId

      });

      const saved = await book.save();

      console.log("Saved to DB:", saved.coverImage);

      res.json(saved);

    } catch (error) {

      console.error("ERROR:", error);

      res.status(500).json({
        error: error.message
      });

    }

});


// Get club books
router.get("/:clubId", authMiddleware, async (req, res) => {

  const books = await Book.find({
    clubId: req.params.clubId
  });

  res.json(books);

});

module.exports = router;