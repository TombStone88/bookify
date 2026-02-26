const express = require("express");
const Book = require("../models/Book");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();


// ➕ Add Book
router.post("/add", authMiddleware, async (req, res) => {
  try {
    const { title, author, description } = req.body;

    const newBook = new Book({
      title,
      author,
      description,
      postedBy: req.user.userId
    });

    await newBook.save();

    res.status(201).json({
      message: "Book added successfully 📚",
      book: newBook
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


// 📖 Get All Books
router.get("/all", async (req, res) => {
  try {

    const books = await Book.find()
      .populate("postedBy", "name email")
      .populate("comments.user", "name");

    res.status(200).json(books);

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


// ❌ Delete Book
router.delete("/delete/:id", authMiddleware, async (req, res) => {
  try {
    const book = await Book.findById(req.params.id);

    if (!book) {
      return res.status(404).json({
        message: "Book not found"
      });
    }

    if (book.postedBy.toString() !== req.user.userId) {
      return res.status(403).json({
        message: "Not authorized"
      });
    }

    await Book.findByIdAndDelete(req.params.id);

    res.status(200).json({
      message: "Book deleted successfully 🗑"
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


// ✏️ Update Book
router.put("/update/:id", authMiddleware, async (req, res) => {
  try {
    const { title, author, description } = req.body;

    const book = await Book.findById(req.params.id);

    if (!book) {
      return res.status(404).json({
        message: "Book not found"
      });
    }

    if (book.postedBy.toString() !== req.user.userId) {
      return res.status(403).json({
        message: "Not authorized"
      });
    }

    book.title = title || book.title;
    book.author = author || book.author;
    book.description = description || book.description;

    await book.save();

    res.status(200).json({
      message: "Book updated successfully ✏️",
      book
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put("/like/:id", authMiddleware, async (req, res) => {
  try {

    const book = await Book.findById(req.params.id);

    if (!book) {
      return res.status(404).json({
        message: "Book not found"
      });
    }

    // Check if already liked
    if (book.likes.includes(req.user.userId)) {
      return res.status(400).json({
        message: "You already liked this book"
      });
    }

    book.likes.push(req.user.userId);

    await book.save();

    res.status(200).json({
      message: "Book liked ❤️",
      totalLikes: book.likes.length
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put("/comment/:id", authMiddleware, async (req, res) => {
  try {

    const { text } = req.body;

    const book = await Book.findById(req.params.id);

    if (!book) {
      return res.status(404).json({
        message: "Book not found"
      });
    }

    const newComment = {
      text,
      user: req.user.userId
    };

    book.comments.push(newComment);

    await book.save();

    res.status(200).json({
      message: "Comment added 💬",
      comments: book.comments
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete("/comment/:bookId/:commentId", authMiddleware, async (req, res) => {
  try {

    const book = await Book.findById(req.params.bookId);

    if (!book) {
      return res.status(404).json({
        message: "Book not found"
      });
    }

    const comment = book.comments.id(req.params.commentId);

    if (!comment) {
      return res.status(404).json({
        message: "Comment not found"
      });
    }

    if (comment.user.toString() !== req.user.userId) {
      return res.status(403).json({
        message: "Not authorized"
      });
    }

    comment.deleteOne();

    await book.save();

    res.status(200).json({
      message: "Comment deleted successfully 🗑"
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;