const mongoose = require("mongoose");

const bookSchema = new mongoose.Schema({

  title: String,

  author: String,

  description: String,

  fileUrl: String,

  coverImage: String,   // THIS MUST EXIST

  clubId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Club"
  },

  uploadedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User"
  },

  createdAt: {
    type: Date,
    default: Date.now
  }

});

module.exports = mongoose.model("Book", bookSchema);