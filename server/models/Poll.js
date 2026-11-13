const mongoose = require("mongoose");

const pollOptionSchema = new mongoose.Schema({
  text: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200,
  },
  votes: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  ],
});

const pollSchema = new mongoose.Schema(
  {
    club: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Club",
      required: true,
      index: true,
    },
    creator: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    question: {
      type: String,
      required: true,
      trim: true,
      maxlength: 300,
    },
    description: {
      type: String,
      default: "",
      trim: true,
      maxlength: 1000,
    },
    options: {
      type: [pollOptionSchema],
      validate: [
        (opts) => Array.isArray(opts) && opts.length >= 2,
        "A poll must contain at least 2 options.",
      ],
    },
    closesAt: {
      type: Date,
    },
    isClosed: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

pollSchema.index({ club: 1, createdAt: -1 });

module.exports = mongoose.model("Poll", pollSchema);
