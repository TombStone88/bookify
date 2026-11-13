const test = require("node:test");
const assert = require("node:assert");
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");

const Club = require("../models/Club");
const Challenge = require("../models/Challenge");
const Poll = require("../models/Poll");
const DiscussionTopic = require("../models/DiscussionTopic");
const ClubEvent = require("../models/ClubEvent");
const Notification = require("../models/Notification");

// Prevent buffering timeouts when disconnected in unit tests
Notification.prototype.save = async function () {
  return this;
};
Notification.create = async function (...args) {
  return args[0];
};
Notification.findOne = async function () {
  return null;
};
Notification.findById = function () {
  return mockQuery({});
};

function mockQuery(result) {
  const p = Promise.resolve(result);
  p.populate = () => mockQuery(result);
  p.select = () => mockQuery(result);
  p.sort = () => mockQuery(result);
  return p;
}

const challengeRoutes = require("../routes/challengeRoutes");
const pollRoutes = require("../routes/pollRoutes");
const topicRoutes = require("../routes/topicRoutes");
const eventRoutes = require("../routes/eventRoutes");

const JWT_SECRET = process.env.JWT_SECRET || "testjwtsecretkeybookify123456";
process.env.JWT_SECRET = JWT_SECRET;

function mockResponse() {
  const res = {
    statusCode: 200,
    headers: {},
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(data) {
      this.body = data;
      return this;
    },
    setHeader(key, value) {
      this.headers[key] = value;
      return this;
    },
  };
  return res;
}

test("Club Experience Upgrade: Features Suite", async (t) => {
  const hostId = new mongoose.Types.ObjectId();
  const memberId = new mongoose.Types.ObjectId();
  const nonMemberId = new mongoose.Types.ObjectId();
  const clubId = new mongoose.Types.ObjectId();

  const mockClub = {
    _id: clubId,
    name: "Book Club of Antiquities",
    admin: hostId,
    members: [hostId, memberId],
  };

  // ── 1. READING CHALLENGES SUITE ────────────────────────────
  await t.test("1. Reading Challenges", async (st) => {
    const origFindById = Club.findById;
    Club.findById = async (id) => (id.toString() === clubId.toString() ? mockClub : null);

    await st.test("Host can create challenge; non-host is rejected (403)", async () => {
      const createLayer = challengeRoutes.stack.find(
        (l) => l.route && l.route.path === "/club/:clubId" && l.route.methods.post
      );
      const handler = createLayer.route.stack[createLayer.route.stack.length - 1].handle;

      // Non-host attempt
      const reqNonHost = {
        params: { clubId: clubId.toString() },
        user: { userId: memberId.toString() },
        body: {
          title: "Winter Reading Sprint",
          targetGoal: 300,
          goalType: "pages",
          startDate: new Date(),
          endDate: new Date(Date.now() + 86400000 * 30),
        },
        app: { get: () => null },
      };
      const resNonHost = mockResponse();
      await handler(reqNonHost, resNonHost);
      assert.strictEqual(resNonHost.statusCode, 403);

      // Host attempt with invalid goal (0)
      const reqBadGoal = {
        params: { clubId: clubId.toString() },
        user: { userId: hostId.toString() },
        body: {
          title: "Winter Reading Sprint",
          targetGoal: 0,
          startDate: new Date(),
          endDate: new Date(Date.now() + 86400000 * 30),
        },
        app: { get: () => null },
      };
      const resBadGoal = mockResponse();
      await handler(reqBadGoal, resBadGoal);
      assert.strictEqual(resBadGoal.statusCode, 400);

      // Host valid attempt
      let savedChallenge = null;
      const origSave = Challenge.prototype.save;
      const origChFindById = Challenge.findById;
      Challenge.prototype.save = async function () {
        savedChallenge = this;
        return this;
      };
      Challenge.findById = () => ({
        populate: async () => savedChallenge,
      });

      const reqHost = {
        params: { clubId: clubId.toString() },
        user: { userId: hostId.toString() },
        body: {
          title: "Gothic Epics",
          description: "Explore 5 gothic novels this winter",
          goalType: "books",
          targetGoal: 5,
          startDate: new Date(),
          endDate: new Date(Date.now() + 86400000 * 30),
        },
        app: { get: () => null },
      };
      const resHost = mockResponse();
      await handler(reqHost, resHost);

      assert.strictEqual(resHost.statusCode, 201);
      assert.ok(savedChallenge);
      assert.strictEqual(savedChallenge.title, "Gothic Epics");
      assert.strictEqual(savedChallenge.goalType, "books");
      assert.strictEqual(savedChallenge.targetGoal, 5);

      Challenge.prototype.save = origSave;
      Challenge.findById = origChFindById;
    });

    await st.test("Member can log progress; completion status calculated", async () => {
      const progressLayer = challengeRoutes.stack.find(
        (l) => l.route && l.route.path === "/:challengeId/progress" && l.route.methods.post
      );
      const handler = progressLayer.route.stack[progressLayer.route.stack.length - 1].handle;

      const challengeDoc = new Challenge({
        club: clubId,
        creator: hostId,
        title: "Page Quest",
        goalType: "pages",
        targetGoal: 100,
        startDate: new Date(),
        endDate: new Date(Date.now() + 86400000),
        participants: [],
      });

      const origChFindById = Challenge.findById;
      Challenge.findById = async () => challengeDoc;
      challengeDoc.save = async function () {
        return this;
      };

      const req = {
        params: { challengeId: challengeDoc._id.toString() },
        user: { userId: memberId.toString() },
        body: { progress: 120 },
      };
      const res = mockResponse();
      await handler(req, res);

      assert.strictEqual(res.statusCode, 200);
      assert.strictEqual(res.body.myProgress, 120);
      assert.strictEqual(res.body.isCompleted, true);
      assert.strictEqual(challengeDoc.participants.length, 1);
      assert.strictEqual(challengeDoc.participants[0].completed, true);
      assert.ok(challengeDoc.participants[0].completedAt);

      Challenge.findById = origChFindById;
    });

    Club.findById = origFindById;
  });

  // ── 2. CLUB POLLS SUITE ────────────────────────────────────
  await t.test("2. Club Polls", async (st) => {
    const origFindById = Club.findById;
    Club.findById = async (id) => (id.toString() === clubId.toString() ? mockClub : null);

    await st.test("Host creates poll; members vote; duplicate vote is blocked", async () => {
      // A. Create Poll
      const createLayer = pollRoutes.stack.find(
        (l) => l.route && l.route.path === "/club/:clubId" && l.route.methods.post
      );
      const createHandler = createLayer.route.stack[createLayer.route.stack.length - 1].handle;

      let savedPoll = null;
      const origSave = Poll.prototype.save;
      const origPollFindById = Poll.findById;
      Poll.prototype.save = async function () {
        savedPoll = this;
        return this;
      };
      Poll.findById = () => ({
        populate: async () => savedPoll,
      });

      const reqCreate = {
        params: { clubId: clubId.toString() },
        user: { userId: hostId.toString() },
        body: {
          question: "Next Tome Selection",
          description: "Vote for our December classic",
          options: ["Frankenstein", "Dracula"],
        },
        app: { get: () => null },
      };
      const resCreate = mockResponse();
      await createHandler(reqCreate, resCreate);

      assert.strictEqual(resCreate.statusCode, 201);
      assert.strictEqual(savedPoll.options.length, 2);
      const option1Id = savedPoll.options[0]._id.toString();

      Poll.prototype.save = origSave;
      Poll.findById = origPollFindById;

      // B. Vote on Poll
      const voteLayer = pollRoutes.stack.find(
        (l) => l.route && l.route.path === "/:pollId/vote" && l.route.methods.post
      );
      const voteHandler = voteLayer.route.stack[voteLayer.route.stack.length - 1].handle;

      savedPoll.save = async function () {
        return this;
      };
      Poll.findById = async () => savedPoll;

      const reqVote = {
        params: { pollId: savedPoll._id.toString() },
        user: { userId: memberId.toString() },
        body: { optionId: option1Id },
      };
      const resVote = mockResponse();
      await voteHandler(reqVote, resVote);

      assert.strictEqual(resVote.statusCode, 200);
      assert.strictEqual(resVote.body.votedOptionId, option1Id);

      // C. Duplicate Vote attempt by same member is rejected (400)
      const resDuplicateVote = mockResponse();
      await voteHandler(reqVote, resDuplicateVote);
      assert.strictEqual(resDuplicateVote.statusCode, 400);
      assert.match(resDuplicateVote.body.error, /already cast your vote/i);

      // D. Closed poll rejects vote
      savedPoll.isClosed = true;
      const reqVoteClosed = {
        params: { pollId: savedPoll._id.toString() },
        user: { userId: hostId.toString() },
        body: { optionId: option1Id },
      };
      const resVoteClosed = mockResponse();
      await voteHandler(reqVoteClosed, resVoteClosed);
      assert.strictEqual(resVoteClosed.statusCode, 400);
      assert.match(resVoteClosed.body.error, /closed/i);
    });

    Club.findById = origFindById;
  });

  // ── 3. DISCUSSION TOPICS SUITE ─────────────────────────────
  await t.test("3. Discussion Topics", async (st) => {
    const origFindById = Club.findById;
    Club.findById = async (id) => (id.toString() === clubId.toString() ? mockClub : null);

    await st.test("Member creates topic and adds comment; author/host moderation verified", async () => {
      const createLayer = topicRoutes.stack.find(
        (l) => l.route && l.route.path === "/club/:clubId" && l.route.methods.post
      );
      const createHandler = createLayer.route.stack[createLayer.route.stack.length - 1].handle;

      let savedTopic = null;
      const origSave = DiscussionTopic.prototype.save;
      const origTopicFindById = DiscussionTopic.findById;
      DiscussionTopic.prototype.save = async function () {
        savedTopic = this;
        return this;
      };
      DiscussionTopic.findById = () => ({
        populate: async () => savedTopic,
      });

      // Member creates topic
      const reqCreate = {
        params: { clubId: clubId.toString() },
        user: { userId: memberId.toString() },
        body: {
          title: "Chapter 1: The Haunted Gate",
          content: "What did everyone think of the opening description?",
        },
        app: { get: () => null },
      };
      const resCreate = mockResponse();
      await createHandler(reqCreate, resCreate);

      assert.strictEqual(resCreate.statusCode, 201);
      assert.strictEqual(savedTopic.title, "Chapter 1: The Haunted Gate");

      DiscussionTopic.prototype.save = origSave;
      DiscussionTopic.findById = origTopicFindById;

      // Add comment
      const commentLayer = topicRoutes.stack.find(
        (l) => l.route && l.route.path === "/:topicId/comments" && l.route.methods.post
      );
      const commentHandler = commentLayer.route.stack[commentLayer.route.stack.length - 1].handle;

      savedTopic.save = async function () {
        return this;
      };
      DiscussionTopic.findById = (id) => mockQuery(savedTopic);

      const reqComment = {
        params: { topicId: savedTopic._id.toString() },
        user: { userId: hostId.toString() },
        body: { content: "Brilliant atmospheric setting!" },
        app: { get: () => null },
      };
      const resComment = mockResponse();
      await commentHandler(reqComment, resComment);

      assert.strictEqual(resComment.statusCode, 201);
      assert.strictEqual(savedTopic.comments.length, 1);
      assert.strictEqual(savedTopic.comments[0].content, "Brilliant atmospheric setting!");

      // Delete topic authorization: non-author non-host cannot delete
      const delLayer = topicRoutes.stack.find(
        (l) => l.route && l.route.path === "/:topicId" && l.route.methods.delete
      );
      const delHandler = delLayer.route.stack[delLayer.route.stack.length - 1].handle;

      DiscussionTopic.findById = async () => savedTopic;

      const reqDelNonAuth = {
        params: { topicId: savedTopic._id.toString() },
        user: { userId: nonMemberId.toString() },
      };
      const resDelNonAuth = mockResponse();
      await delHandler(reqDelNonAuth, resDelNonAuth);
      assert.strictEqual(resDelNonAuth.statusCode, 403);
    });

    Club.findById = origFindById;
  });

  // ── 4. CLUB EVENTS SUITE ───────────────────────────────────
  await t.test("4. Club Events", async (st) => {
    const origFindById = Club.findById;
    Club.findById = async (id) => (id.toString() === clubId.toString() ? mockClub : null);

    await st.test("Host schedules event; members RSVP without duplicate entries", async () => {
      const createLayer = eventRoutes.stack.find(
        (l) => l.route && l.route.path === "/club/:clubId" && l.route.methods.post
      );
      const createHandler = createLayer.route.stack[createLayer.route.stack.length - 1].handle;

      let savedEvent = null;
      const origSave = ClubEvent.prototype.save;
      const origEvFindById = ClubEvent.findById;
      ClubEvent.prototype.save = async function () {
        savedEvent = this;
        return this;
      };
      ClubEvent.findById = () => ({
        populate: () => ({
          populate: async () => savedEvent,
        }),
      });

      // Host creates event
      const reqCreate = {
        params: { clubId: clubId.toString() },
        user: { userId: hostId.toString() },
        body: {
          title: "Mid-Winter Book Discussion",
          description: "Live discussion and tea ceremony",
          eventDate: new Date(Date.now() + 86400000 * 7),
          location: "Online Book Club Room",
          meetingUrl: "https://meet.jit.si/bookify-club-123",
        },
        app: { get: () => null },
      };
      const resCreate = mockResponse();
      await createHandler(reqCreate, resCreate);

      assert.strictEqual(resCreate.statusCode, 201);
      assert.strictEqual(savedEvent.title, "Mid-Winter Book Discussion");
      assert.strictEqual(savedEvent.rsvps.length, 1); // Host is auto-attending
      assert.strictEqual(savedEvent.rsvps[0].status, "going");

      ClubEvent.prototype.save = origSave;
      ClubEvent.findById = origEvFindById;

      // Member RSVPs 'going'
      const rsvpLayer = eventRoutes.stack.find(
        (l) => l.route && l.route.path === "/:eventId/rsvp" && l.route.methods.post
      );
      const rsvpHandler = rsvpLayer.route.stack[rsvpLayer.route.stack.length - 1].handle;

      savedEvent.save = async function () {
        return this;
      };
      ClubEvent.findById = async () => savedEvent;

      const reqRsvp = {
        params: { eventId: savedEvent._id.toString() },
        user: { userId: memberId.toString() },
        body: { status: "going" },
      };
      const resRsvp = mockResponse();
      await rsvpHandler(reqRsvp, resRsvp);

      assert.strictEqual(resRsvp.statusCode, 200);
      assert.strictEqual(resRsvp.body.attendingCount, 2);
      assert.strictEqual(savedEvent.rsvps.length, 2);

      // Member updates RSVP to 'not_going' (updates in place, no duplicate)
      const reqRsvpChange = {
        params: { eventId: savedEvent._id.toString() },
        user: { userId: memberId.toString() },
        body: { status: "not_going" },
      };
      const resRsvpChange = mockResponse();
      await rsvpHandler(reqRsvpChange, resRsvpChange);

      assert.strictEqual(resRsvpChange.statusCode, 200);
      assert.strictEqual(resRsvpChange.body.attendingCount, 1);
      assert.strictEqual(savedEvent.rsvps.length, 2); // Length remains 2!
      assert.strictEqual(savedEvent.rsvps[1].status, "not_going");
    });

    Club.findById = origFindById;
  });
});
