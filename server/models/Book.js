const mongoose = require("mongoose");

const bookSchema = new mongoose.Schema({
  title: String,

  author: String,

  description: String,

  fileUrl: String,

  coverImage: String,

  clubId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Club",
  },

  currentPage: {
    type: Number,
    default: 1,
  },

  totalPages: {
    type: Number,
    default: 1,
  },

  uploadedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },

  likes: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  ],

  comments: [
    {
      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
      text: String,
      createdAt: {
        type: Date,
        default: Date.now,
      },
    },
  ],

  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("Book", bookSchema);
