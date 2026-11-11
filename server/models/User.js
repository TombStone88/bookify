const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    trim: true,
  },

  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },

  password: {
    type: String,
    required: true,
  },

  profileImage: {
    type: String,
    default: "",
  },

  bio: {
    type: String,
    default: "",
    trim: true,
    maxlength: 500,
  },

  favoriteGenres: {
    type: [String],
    default: [],
  },

  readingInterests: {
    type: [String],
    default: [],
  },

  favoriteBooks: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Book",
    },
  ],

  privacy: {
    isPublic: {
      type: Boolean,
      default: true,
    },
    showReadingActivity: {
      type: Boolean,
      default: true,
    },
    showCurrentlyReading: {
      type: Boolean,
      default: true,
    },
    showFavoriteBooks: {
      type: Boolean,
      default: true,
    },
    showClubs: {
      type: Boolean,
      default: true,
    },
  },

  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("User", userSchema);
