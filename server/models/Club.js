const mongoose = require("mongoose");

const clubSchema = new mongoose.Schema({

  name: String,

  description: String,

  category: {
    type: String,
    default: "general",
    trim: true,
    lowercase: true,
  },

  inviteCode: String,

  admin: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },

  members: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: "User"
  }]

}, { timestamps: true });

module.exports = mongoose.model("Club", clubSchema);