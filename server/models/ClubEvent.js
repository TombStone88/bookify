const mongoose = require("mongoose");

const eventRsvpSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    status: {
      type: String,
      enum: ["going", "not_going"],
      default: "going",
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

const clubEventSchema = new mongoose.Schema(
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
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    description: {
      type: String,
      default: "",
      trim: true,
      maxlength: 3000,
    },
    eventDate: {
      type: Date,
      required: true,
    },
    endDate: {
      type: Date,
    },
    location: {
      type: String,
      default: "Online Book Club Room",
      trim: true,
      maxlength: 300,
    },
    meetingUrl: {
      type: String,
      default: "",
      trim: true,
      maxlength: 500,
    },
    rsvps: [eventRsvpSchema],
    status: {
      type: String,
      enum: ["scheduled", "cancelled", "completed"],
      default: "scheduled",
    },
  },
  { timestamps: true }
);

clubEventSchema.index({ club: 1, eventDate: 1 });

module.exports = mongoose.model("ClubEvent", clubEventSchema);
