const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");

const ClubEvent = require("../models/ClubEvent");
const Club = require("../models/Club");
const authMiddleware = require("../middleware/authMiddleware");
const { sendNotification } = require("../utils/notify");

async function verifyClubMembership(clubId, userId) {
  if (!mongoose.isValidObjectId(clubId)) return { error: "Invalid club ID", status: 400 };
  const club = await Club.findById(clubId);
  if (!club) return { error: "Club not found", status: 404 };

  const isHost = club.admin.toString() === userId.toString();
  const isMember = isHost || (club.members || []).some((m) => m && m.toString() === userId.toString());

  if (!isMember) {
    return { error: "Access denied. You are not a member of this club.", status: 403 };
  }
  return { club, isHost, isMember };
}

// ── 1. GET ALL EVENTS FOR A CLUB ──────────────────────────
router.get("/club/:clubId", authMiddleware, async (req, res) => {
  try {
    const check = await verifyClubMembership(req.params.clubId, req.user.userId);
    if (check.error) return res.status(check.status).json({ error: check.error });

    const events = await ClubEvent.find({ club: req.params.clubId })
      .populate("creator", "username name profileImage")
      .populate("rsvps.user", "username name profileImage")
      .sort({ eventDate: 1 });

    const now = new Date();
    const userIdStr = req.user.userId.toString();

    const enriched = events.map((ev) => {
      const evObj = ev.toObject();
      const evDate = new Date(ev.eventDate);
      const isPast = evDate < now;

      const goingRsvps = (ev.rsvps || []).filter((r) => r.status === "going");
      const notGoingRsvps = (ev.rsvps || []).filter((r) => r.status === "not_going");

      const myRsvpObj = (ev.rsvps || []).find(
        (r) => r.user && (r.user._id || r.user).toString() === userIdStr
      );

      const attendees = goingRsvps
        .map((r) => r.user)
        .filter(Boolean);

      return {
        ...evObj,
        isPast,
        attendingCount: goingRsvps.length,
        notGoingCount: notGoingRsvps.length,
        myRsvp: myRsvpObj ? myRsvpObj.status : null,
        attendees,
      };
    });

    res.json(enriched);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ── 2. CREATE A CLUB EVENT (HOST ONLY) ────────────────────
router.post("/club/:clubId", authMiddleware, async (req, res) => {
  try {
    const check = await verifyClubMembership(req.params.clubId, req.user.userId);
    if (check.error) return res.status(check.status).json({ error: check.error });
    if (!check.isHost) {
      return res.status(403).json({ error: "Only the club host can organize events." });
    }

    const { title, description, eventDate, endDate, location, meetingUrl } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ error: "Event title is required." });
    }

    if (!eventDate) {
      return res.status(400).json({ error: "Event date and time are required." });
    }

    const parsedEventDate = new Date(eventDate);
    if (isNaN(parsedEventDate.getTime())) {
      return res.status(400).json({ error: "Invalid event date format." });
    }

    let parsedEndDate = null;
    if (endDate) {
      parsedEndDate = new Date(endDate);
      if (isNaN(parsedEndDate.getTime())) {
        return res.status(400).json({ error: "Invalid end date format." });
      }
    }

    const event = new ClubEvent({
      club: req.params.clubId,
      creator: req.user.userId,
      title: title.trim(),
      description: (description || "").trim(),
      eventDate: parsedEventDate,
      endDate: parsedEndDate,
      location: (location || "Online Book Club Room").trim(),
      meetingUrl: (meetingUrl || "").trim(),
      rsvps: [{ user: req.user.userId, status: "going", updatedAt: new Date() }], // Host is automatically attending
      status: "scheduled",
    });

    await event.save();

    const populated = await ClubEvent.findById(event._id)
      .populate("creator", "username name profileImage")
      .populate("rsvps.user", "username name profileImage");

    // Socket notification
    const io = req.app.get("io");
    if (io) {
      io.to(req.params.clubId).emit("newEvent", populated);
    }

    const recipients = (check.club.members || []).filter(
      (m) => m && m.toString() !== req.user.userId.toString()
    );
    sendNotification({
      io,
      recipients,
      sender: req.user.userId,
      type: "club_message",
      title: `New Event in ${check.club.name}`,
      message: `Join: "${title.trim()}" on ${parsedEventDate.toLocaleDateString()}`,
      referenceId: check.club._id,
      referenceType: "club",
    }).catch(() => {});

    res.status(201).json(populated);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ── 3. EDIT A CLUB EVENT (HOST ONLY) ──────────────────────
router.put("/:eventId", authMiddleware, async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.eventId)) {
      return res.status(400).json({ error: "Invalid event ID" });
    }

    const event = await ClubEvent.findById(req.params.eventId);
    if (!event) {
      return res.status(404).json({ error: "Event not found" });
    }

    const check = await verifyClubMembership(event.club, req.user.userId);
    if (check.error) return res.status(check.status).json({ error: check.error });
    if (!check.isHost) {
      return res.status(403).json({ error: "Only the club host can edit events." });
    }

    const { title, description, eventDate, endDate, location, meetingUrl, status } = req.body;

    if (title !== undefined) {
      if (!title.trim()) return res.status(400).json({ error: "Event title cannot be empty." });
      event.title = title.trim();
    }
    if (description !== undefined) event.description = description.trim();
    if (location !== undefined) event.location = location.trim();
    if (meetingUrl !== undefined) event.meetingUrl = meetingUrl.trim();

    if (eventDate !== undefined) {
      const parsed = new Date(eventDate);
      if (isNaN(parsed.getTime())) return res.status(400).json({ error: "Invalid event date format." });
      event.eventDate = parsed;
    }

    if (endDate !== undefined) {
      if (endDate === null || endDate === "") {
        event.endDate = null;
      } else {
        const parsedEnd = new Date(endDate);
        if (isNaN(parsedEnd.getTime())) return res.status(400).json({ error: "Invalid end date format." });
        event.endDate = parsedEnd;
      }
    }

    if (status !== undefined) {
      if (["scheduled", "cancelled", "completed"].includes(status)) {
        event.status = status;
      }
    }

    await event.save();

    const populated = await ClubEvent.findById(event._id)
      .populate("creator", "username name profileImage")
      .populate("rsvps.user", "username name profileImage");

    res.json(populated);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ── 4. RSVP TO AN EVENT (MEMBERS) ─────────────────────────
router.post("/:eventId/rsvp", authMiddleware, async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.eventId)) {
      return res.status(400).json({ error: "Invalid event ID" });
    }

    const event = await ClubEvent.findById(req.params.eventId);
    if (!event) {
      return res.status(404).json({ error: "Event not found" });
    }

    const check = await verifyClubMembership(event.club, req.user.userId);
    if (check.error) return res.status(check.status).json({ error: check.error });

    if (event.status === "cancelled") {
      return res.status(400).json({ error: "This event has been cancelled." });
    }

    const { status } = req.body;
    if (!status || !["going", "not_going"].includes(status)) {
      return res.status(400).json({ error: "RSVP status must be 'going' or 'not_going'." });
    }

    const userIdStr = req.user.userId.toString();
    const existingIndex = event.rsvps.findIndex(
      (r) => r.user && r.user.toString() === userIdStr
    );

    if (existingIndex > -1) {
      event.rsvps[existingIndex].status = status;
      event.rsvps[existingIndex].updatedAt = new Date();
    } else {
      event.rsvps.push({
        user: req.user.userId,
        status,
        updatedAt: new Date(),
      });
    }

    await event.save();

    const attendingCount = event.rsvps.filter((r) => r.status === "going").length;

    res.json({
      message: `RSVP updated to ${status === "going" ? "Going" : "Not Going"}`,
      eventId: event._id,
      myRsvp: status,
      attendingCount,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ── 5. CANCEL EVENT (HOST ONLY) ───────────────────────────
router.put("/:eventId/cancel", authMiddleware, async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.eventId)) {
      return res.status(400).json({ error: "Invalid event ID" });
    }

    const event = await ClubEvent.findById(req.params.eventId);
    if (!event) {
      return res.status(404).json({ error: "Event not found" });
    }

    const check = await verifyClubMembership(event.club, req.user.userId);
    if (check.error) return res.status(check.status).json({ error: check.error });
    if (!check.isHost) {
      return res.status(403).json({ error: "Only the club host can cancel events." });
    }

    event.status = "cancelled";
    await event.save();

    res.json({ message: "Event cancelled successfully", eventId: event._id });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ── 6. DELETE EVENT (HOST ONLY) ───────────────────────────
router.delete("/:eventId", authMiddleware, async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.eventId)) {
      return res.status(400).json({ error: "Invalid event ID" });
    }

    const event = await ClubEvent.findById(req.params.eventId);
    if (!event) {
      return res.status(404).json({ error: "Event not found" });
    }

    const check = await verifyClubMembership(event.club, req.user.userId);
    if (check.error) return res.status(check.status).json({ error: check.error });
    if (!check.isHost) {
      return res.status(403).json({ error: "Only the club host can delete events." });
    }

    await event.deleteOne();

    res.json({ message: "Event deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
