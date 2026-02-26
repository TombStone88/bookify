const mongoose = require("mongoose");

const clubSchema = new mongoose.Schema({

  name: {
    type: String,
    required: true
  },

  description: {
    type: String,
    required: true
  },

  creator: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },

  members: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    }
  ],

  inviteCode: {
    type: String,
    required: true,
    unique: true
  }

}, { timestamps: true });

module.exports = mongoose.model("Club", clubSchema);