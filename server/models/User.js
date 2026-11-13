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
    lowercase: true,
  },

  password: {
    type: String,
    required: function () {
      return !this.googleId;
    },
  },

  googleId: {
    type: String,
    unique: true,
    sparse: true,
    trim: true,
  },

  authProvider: {
    type: String,
    enum: ["local", "google"],
    default: "local",
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

  mood: {
    type: String,
    default: "📖 Reading",
    trim: true,
  },

  customStatus: {
    type: String,
    default: "",
    trim: true,
    maxlength: 100,
  },

  availability: {
    type: String,
    enum: ["Online", "Away", "Do Not Disturb", "Offline"],
    default: "Online",
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
