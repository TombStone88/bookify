const test = require("node:test");
const assert = require("node:assert");
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");

const Club = require("../models/Club");
const User = require("../models/User");
const clubRoutes = require("../routes/club");
const userRoutes = require("../routes/userRoutes");
const authRoutes = require("../routes/auth");

const JWT_SECRET = process.env.JWT_SECRET || "testjwtsecretkeybookify123456";
process.env.JWT_SECRET = JWT_SECRET;

function createTestToken(userId, username = "testuser") {
  return jwt.sign({ userId, username }, JWT_SECRET);
}

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

test("Category Filtering & User Mood/Status Suite", async (t) => {
  await t.test("1. Club Schema & Category Support", () => {
    const testClub = new Club({
      name: "Gothic Guild",
      description: "Dark romanticism and eerie tales",
      category: "GOTHIC",
      inviteCode: "goth12",
      admin: new mongoose.Types.ObjectId(),
      members: [],
    });

    assert.strictEqual(testClub.category, "gothic", "Category should be normalized to lowercase");

    const defaultClub = new Club({
      name: "Default Circle",
      description: "A reading circle",
      inviteCode: "def123",
      admin: new mongoose.Types.ObjectId(),
      members: [],
    });

    assert.strictEqual(defaultClub.category, "general", "Missing category should default to 'general'");
  });

  await t.test("2. User Schema & Mood / Status / Availability Support", () => {
    const testUser = new User({
      username: "booklover",
      email: "booklover@example.com",
      password: "hashedpassword123",
    });

    assert.strictEqual(testUser.mood, "📖 Reading", "Default mood should be '📖 Reading'");
    assert.strictEqual(testUser.customStatus, "", "Default customStatus should be empty string");
    assert.strictEqual(testUser.availability, "Online", "Default availability should be 'Online'");
  });

  await t.test("3. Availability & Mood Separation Logic", () => {
    const user = new User({
      username: "solitaryreader",
      email: "solitary@example.com",
      password: "hashedpassword123",
      mood: "🎧 Busy",
      availability: "Do Not Disturb",
      customStatus: "Deep in Dante's Inferno",
    });

    assert.strictEqual(user.mood, "🎧 Busy");
    assert.strictEqual(user.availability, "Do Not Disturb", "Do Not Disturb is a distinct availability setting");
    assert.strictEqual(user.customStatus, "Deep in Dante's Inferno");

    // Changing mood does not alter availability
    user.mood = "☕ Coffee time";
    assert.strictEqual(user.availability, "Do Not Disturb", "Changing mood must not reset availability to Online");
  });

  await t.test("4. Registration without Role Selection", async () => {
    // Ensure auth/register route creates user without requiring any role
    const mockFindOne = User.findOne;
    const mockSave = User.prototype.save;

    User.findOne = async () => null; // No existing user
    let savedDoc = null;
    User.prototype.save = async function () {
      savedDoc = this;
      return this;
    };

    try {
      const req = {
        body: {
          name: "Eleanor Vance",
          email: "eleanor@hillhouse.org",
          password: "hauntedpassword123",
        },
      };
      const res = mockResponse();

      // Find route handler
      const regLayer = authRoutes.stack.find(
        (l) => l.route && l.route.path === "/register" && l.route.methods.post
      );
      assert.ok(regLayer, "Register route handler must exist");

      // Find route handler (last handler in stack after middleware)
      const regHandler = regLayer.route.stack[regLayer.route.stack.length - 1].handle;
      await regHandler(req, res);

      assert.strictEqual(res.statusCode, 201);
      assert.ok(savedDoc, "User should be instantiated and saved");
      assert.strictEqual(savedDoc.username, "Eleanor Vance");
      assert.strictEqual(savedDoc.email, "eleanor@hillhouse.org");
      assert.strictEqual(savedDoc.mood, "📖 Reading", "Should have default mood");
      assert.strictEqual(savedDoc.availability, "Online", "Should have default availability");
    } finally {
      User.findOne = mockFindOne;
      User.prototype.save = mockSave;
    }
  });

  await t.test("5. Status Update Endpoint Validation", async () => {
    const statusLayer = userRoutes.stack.find(
      (l) => l.route && l.route.path === "/status" && l.route.methods.put
    );
    assert.ok(statusLayer, "PUT /status route handler must exist");

    // The route handler is the last item in the stack (after authMiddleware)
    const handler = statusLayer.route.stack[statusLayer.route.stack.length - 1].handle;

    // A. Reject invalid mood
    const reqInvalidMood = {
      user: { userId: new mongoose.Types.ObjectId().toString() },
      body: { mood: "Invalid Mood String" },
    };
    const resInvalidMood = mockResponse();
    await handler(reqInvalidMood, resInvalidMood);
    assert.strictEqual(resInvalidMood.statusCode, 400);
    assert.match(resInvalidMood.body.error, /invalid mood/i);

    // B. Reject invalid availability
    const reqInvalidAvail = {
      user: { userId: new mongoose.Types.ObjectId().toString() },
      body: { availability: "Invisible" },
    };
    const resInvalidAvail = mockResponse();
    await handler(reqInvalidAvail, resInvalidAvail);
    assert.strictEqual(resInvalidAvail.statusCode, 400);
    assert.match(resInvalidAvail.error || resInvalidAvail.body.error, /invalid availability/i);

    // C. Reject customStatus > 100 characters
    const reqLongStatus = {
      user: { userId: new mongoose.Types.ObjectId().toString() },
      body: { customStatus: "A".repeat(101) },
    };
    const resLongStatus = mockResponse();
    await handler(reqLongStatus, resLongStatus);
    assert.strictEqual(resLongStatus.statusCode, 400);
    assert.match(resLongStatus.body.error, /100 characters/i);

    // D. Valid update succeeds
    const mockFindByIdAndUpdate = User.findByIdAndUpdate;
    const testUserId = new mongoose.Types.ObjectId();
    User.findByIdAndUpdate = (id, updates) => ({
      select: () => ({
        populate: async () => ({
          _id: testUserId,
          username: "scholarly_reader",
          email: "scholar@athenaeum.org",
          profileImage: "",
          mood: updates.mood || "📖 Reading",
          customStatus: updates.customStatus || "",
          availability: updates.availability || "Online",
        }),
      }),
    });

    try {
      const reqValid = {
        user: { userId: testUserId.toString() },
        body: {
          mood: "🧠 Deep focus",
          customStatus: "Reading Critique of Pure Reason",
          availability: "Do Not Disturb",
        },
      };
      const resValid = mockResponse();
      await handler(reqValid, resValid);

      assert.strictEqual(resValid.statusCode, 200);
      assert.strictEqual(resValid.body.user.mood, "🧠 Deep focus");
      assert.strictEqual(resValid.body.user.customStatus, "Reading Critique of Pure Reason");
      assert.strictEqual(resValid.body.user.availability, "Do Not Disturb");
    } finally {
      User.findByIdAndUpdate = mockFindByIdAndUpdate;
    }
  });

  await t.test("6. Club Category in Directory and Creation", async () => {
    const dirLayer = clubRoutes.stack.find(
      (l) => l.route && l.route.path === "/directory" && l.route.methods.get
    );
    assert.ok(dirLayer, "GET /directory route handler must exist");

    const handler = dirLayer.route.stack[dirLayer.route.stack.length - 1].handle;

    const mockClubFind = Club.find;
    const mockBookFind = require("../models/Book").find;
    const callerId = new mongoose.Types.ObjectId();

    Club.find = () => ({
      populate: async () => [
        {
          _id: new mongoose.Types.ObjectId(),
          name: "Philosopher's Haven",
          description: "Reading ancient Greek philosophy",
          category: "classics",
          inviteCode: "phil01",
          admin: { _id: callerId, username: "curator" },
          members: [callerId],
          toObject() {
            return {
              _id: this._id,
              name: this.name,
              description: this.description,
              category: this.category,
              inviteCode: this.inviteCode,
              admin: this.admin,
              members: this.members,
            };
          },
        },
        {
          _id: new mongoose.Types.ObjectId(),
          name: "Cyberpunk Collective",
          description: "Neuromancer & Gibson lore",
          category: "speculative",
          inviteCode: "scifi2",
          admin: { _id: new mongoose.Types.ObjectId(), username: "neo" },
          members: [],
          toObject() {
            return {
              _id: this._id,
              name: this.name,
              description: this.description,
              category: this.category,
              inviteCode: this.inviteCode,
              admin: this.admin,
              members: this.members,
            };
          },
        },
      ],
    });

    require("../models/Book").find = () => ({
      sort: async () => [],
    });

    try {
      const req = {
        user: { userId: callerId.toString() },
      };
      const res = mockResponse();
      await handler(req, res);

      assert.strictEqual(res.statusCode, 200);
      assert.strictEqual(res.body.length, 2);
      assert.strictEqual(res.body[0].category, "classics");
      assert.strictEqual(res.body[0].isJoined, true);
      assert.strictEqual(res.body[1].category, "speculative");
      assert.strictEqual(res.body[1].isJoined, false);
    } finally {
      Club.find = mockClubFind;
      require("../models/Book").find = mockBookFind;
    }
  });
});
