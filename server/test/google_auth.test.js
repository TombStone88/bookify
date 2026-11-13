const test = require("node:test");
const assert = require("node:assert");
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const { OAuth2Client } = require("google-auth-library");

const User = require("../models/User");
const authRoutes = require("../routes/auth");
const { authRateLimiter, createRateLimiter } = require("../middleware/rateLimiter");

const JWT_SECRET = process.env.JWT_SECRET || "testjwtsecretkeybookify123456";
process.env.JWT_SECRET = JWT_SECRET;
process.env.GOOGLE_CLIENT_ID = "test-google-client-id.apps.googleusercontent.com";

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

test("Google Sign-In & Account Linking Security Suite", async (t) => {
  // Store original methods
  const origFindOne = User.findOne;
  const origFindById = User.findById;
  const origSave = User.prototype.save;
  const origVerifyIdToken = OAuth2Client.prototype.verifyIdToken;

  // In-memory test store
  const testUsers = new Map();

  // Helper to create and seed a mock user
  const seedUser = (userData) => {
    const id = userData._id || new mongoose.Types.ObjectId();
    const doc = new User({
      ...userData,
      _id: id,
    });
    // Attach in-memory save mock
    doc.save = async function () {
      testUsers.set(this._id.toString(), this);
      return this;
    };
    testUsers.set(id.toString(), doc);
    return doc;
  };

  // Mock User.findOne
  User.findOne = async (query) => {
    for (const user of testUsers.values()) {
      let match = true;
      if (query.email && user.email.toLowerCase() !== query.email.toLowerCase()) match = false;
      if (query.googleId && user.googleId !== query.googleId) match = false;
      if (query.username && user.username !== query.username) match = false;
      if (query._id && query._id.$ne && user._id.toString() === query._id.$ne.toString()) match = false;
      if (match) return user;
    }
    return null;
  };

  User.prototype.save = async function () {
    testUsers.set(this._id.toString(), this);
    return this;
  };

  // Extract handlers from router stack
  const getHandler = (path, method = "post") => {
    const layer = authRoutes.stack.find(
      (l) => l.route && l.route.path === path && l.route.methods[method.toLowerCase()]
    );
    if (!layer) throw new Error(`Handler not found for ${method.toUpperCase()} ${path}`);
    return layer.route.stack[layer.route.stack.length - 1].handle;
  };

  const registerHandler = getHandler("/register", "post");
  const loginHandler = getHandler("/login", "post");
  const googleHandler = getHandler("/google", "post");

  t.afterEach(() => {
    testUsers.clear();
  });

  t.after(() => {
    User.findOne = origFindOne;
    User.findById = origFindById;
    User.prototype.save = origSave;
    OAuth2Client.prototype.verifyIdToken = origVerifyIdToken;
  });

  // ── 1. NEW USER REGISTRATION THROUGH GOOGLE ────────────────
  await t.test("1. New user registers through Google", async () => {
    OAuth2Client.prototype.verifyIdToken = async ({ idToken, audience }) => {
      assert.strictEqual(idToken, "valid_new_user_token");
      assert.strictEqual(audience, process.env.GOOGLE_CLIENT_ID);
      return {
        getPayload: () => ({
          sub: "google_sub_1001",
          email: "charlotte@bronte.org",
          email_verified: true,
          name: "Charlotte Bronte",
          picture: "https://lh3.googleusercontent.com/avatar1001.webp",
          iss: "https://accounts.google.com",
        }),
      };
    };

    const req = {
      body: { idToken: "valid_new_user_token" },
    };
    const res = mockResponse();

    await googleHandler(req, res);

    assert.strictEqual(res.statusCode, 201);
    assert.strictEqual(res.body.isNewUser, true);
    assert.ok(res.body.token, "JWT token must be generated for new Google user");

    // Verify token decodes to the new user ID
    const decoded = jwt.verify(res.body.token, JWT_SECRET);
    assert.ok(decoded.userId, "Decoded token must have userId");

    // Check saved user in DB
    const createdUser = await User.findOne({ email: "charlotte@bronte.org" });
    assert.ok(createdUser, "User record must exist in DB");
    assert.strictEqual(createdUser.googleId, "google_sub_1001");
    assert.strictEqual(createdUser.authProvider, "google");
    assert.strictEqual(createdUser.profileImage, "https://lh3.googleusercontent.com/avatar1001.webp");
    assert.strictEqual(createdUser.username, "Charlotte_Bronte");

    // Password must be undefined/empty for Google-only user
    assert.strictEqual(createdUser.password, undefined);
  });

  // ── 2. EXISTING USER SIGNS IN WITH EMAIL/PASSWORD ──────────
  await t.test("2. Existing user signs in with email/password", async () => {
    const rawPassword = "JaneAustenPassword!23";
    const hashedPassword = await bcrypt.hash(rawPassword, 10);
    seedUser({
      username: "Jane Austen",
      email: "jane.austen@regency.org",
      password: hashedPassword,
      authProvider: "local",
    });

    // A. Successful login
    const reqSuccess = {
      body: { email: "jane.austen@regency.org", password: rawPassword },
    };
    const resSuccess = mockResponse();
    await loginHandler(reqSuccess, resSuccess);

    assert.strictEqual(resSuccess.statusCode, 200);
    assert.strictEqual(resSuccess.body.message, "Login successful");
    assert.ok(resSuccess.body.token);

    // B. Failed login with wrong password
    const reqFail = {
      body: { email: "jane.austen@regency.org", password: "WrongPassword999" },
    };
    const resFail = mockResponse();
    await loginHandler(reqFail, resFail);

    assert.strictEqual(resFail.statusCode, 400);
    assert.strictEqual(resFail.body.message, "Invalid credentials");
  });

  // ── 3. EXISTING USER SIGNS IN WITH GOOGLE (ACCOUNT LINKING) ──
  await t.test("3. Existing user signs in with Google using same verified email", async () => {
    const rawPassword = "ClassicWutheringPass1!";
    const hashedPassword = await bcrypt.hash(rawPassword, 10);
    const existingUserId = new mongoose.Types.ObjectId();

    const existingUser = seedUser({
      _id: existingUserId,
      username: "Emily Bronte",
      email: "emily@bronte.org",
      password: hashedPassword,
      bio: "Wuthering Heights author",
      authProvider: "local",
      mood: "🧠 Deep focus",
    });

    OAuth2Client.prototype.verifyIdToken = async () => ({
      getPayload: () => ({
        sub: "google_sub_emily_555",
        email: "emily@bronte.org",
        email_verified: true,
        name: "Emily Bronte",
        picture: "https://lh3.googleusercontent.com/emily.webp",
        iss: "accounts.google.com",
      }),
    });

    const req = {
      body: { idToken: "emily_google_token" },
    };
    const res = mockResponse();
    await googleHandler(req, res);

    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.linked, true, "Response must indicate account was linked");
    assert.strictEqual(res.body.isNewUser, false);
    assert.ok(res.body.token);

    // Verify token decodes to the original user ID
    const decoded = jwt.verify(res.body.token, JWT_SECRET);
    assert.strictEqual(decoded.userId, existingUserId.toString(), "Linked user ID must remain unchanged");

    // Verify user record
    const updatedUser = await User.findOne({ email: "emily@bronte.org" });
    assert.strictEqual(updatedUser._id.toString(), existingUserId.toString());
    assert.strictEqual(updatedUser.googleId, "google_sub_emily_555", "Google ID must be linked");
    assert.strictEqual(updatedUser.bio, "Wuthering Heights author", "Bio must remain intact");
    assert.strictEqual(updatedUser.mood, "🧠 Deep focus", "Mood and preferences must remain intact");

    // CRITICAL: Password hash must remain completely intact
    assert.strictEqual(updatedUser.password, hashedPassword, "Password hash must not be modified or erased");

    // Verify user can STILL log in via standard email and password!
    const reqPasswordLogin = {
      body: { email: "emily@bronte.org", password: rawPassword },
    };
    const resPasswordLogin = mockResponse();
    await loginHandler(reqPasswordLogin, resPasswordLogin);

    assert.strictEqual(resPasswordLogin.statusCode, 200, "Password login must continue working after Google linking");
  });

  // ── 4. ACCOUNT LINKING DOES NOT CREATE DUPLICATE ACCOUNTS ──
  await t.test("4. Account linking does not create duplicate accounts", async () => {
    const existing = seedUser({
      username: "George Eliot",
      email: "eliot@middlemarch.org",
      password: "hashedpassword456",
    });

    OAuth2Client.prototype.verifyIdToken = async () => ({
      getPayload: () => ({
        sub: "google_eliot_777",
        email: "eliot@middlemarch.org",
        email_verified: true,
        name: "George Eliot",
        iss: "accounts.google.com",
      }),
    });

    const req = { body: { idToken: "eliot_token" } };
    const res = mockResponse();
    await googleHandler(req, res);

    assert.strictEqual(res.statusCode, 200);

    // Count records with this email
    let count = 0;
    for (const u of testUsers.values()) {
      if (u.email === "eliot@middlemarch.org") count++;
    }
    assert.strictEqual(count, 1, "Exactly one account must exist for the email; zero duplicates");
  });

  // ── 5. EXISTING USER DATA REMAINS INTACT ────────────────────
  await t.test("5. Existing user data and preferences remain intact", async () => {
    const originalDate = new Date("2024-01-15T00:00:00Z");
    const bookId = new mongoose.Types.ObjectId();

    const user = seedUser({
      username: "Virginia Woolf",
      email: "virginia@lighthouse.org",
      password: "hashedpassword789",
      favoriteBooks: [bookId],
      favoriteGenres: ["Modernism", "Stream of Consciousness"],
      createdAt: originalDate,
    });

    OAuth2Client.prototype.verifyIdToken = async () => ({
      getPayload: () => ({
        sub: "google_virginia_888",
        email: "virginia@lighthouse.org",
        email_verified: true,
        iss: "https://accounts.google.com",
      }),
    });

    const req = { body: { idToken: "virginia_token" } };
    const res = mockResponse();
    await googleHandler(req, res);

    assert.strictEqual(res.statusCode, 200);

    const afterUser = await User.findOne({ email: "virginia@lighthouse.org" });
    assert.strictEqual(afterUser.favoriteGenres.length, 2);
    assert.strictEqual(afterUser.favoriteBooks[0].toString(), bookId.toString());
    assert.strictEqual(afterUser.createdAt.toISOString(), originalDate.toISOString());
  });

  // ── 6. INVALID OR EXPIRED GOOGLE TOKENS ARE REJECTED ───────
  await t.test("6. Invalid or expired Google tokens are rejected (401)", async () => {
    OAuth2Client.prototype.verifyIdToken = async () => {
      const err = new Error("Token used too late");
      err.code = "ERR_EXPIRED";
      throw err;
    };

    const req = { body: { idToken: "expired_token_123" } };
    const res = mockResponse();
    await googleHandler(req, res);

    assert.strictEqual(res.statusCode, 401);
    assert.match(res.body.message, /invalid or expired/i);
  });

  // ── 7. UNVERIFIED GOOGLE EMAILS REJECTED FOR LINKING ───────
  await t.test("7. Unverified Google emails cannot link or create accounts (400)", async () => {
    seedUser({
      username: "Target User",
      email: "unverified@target.com",
      password: "somepassword",
    });

    OAuth2Client.prototype.verifyIdToken = async () => ({
      getPayload: () => ({
        sub: "attacker_sub_999",
        email: "unverified@target.com",
        email_verified: false, // NOT verified by Google!
        iss: "accounts.google.com",
      }),
    });

    const req = { body: { idToken: "unverified_email_token" } };
    const res = mockResponse();
    await googleHandler(req, res);

    assert.strictEqual(res.statusCode, 400);
    assert.match(res.body.message, /not verified/i);

    // Target user must NOT have been linked to attacker sub
    const target = await User.findOne({ email: "unverified@target.com" });
    assert.strictEqual(target.googleId, undefined, "Unverified email must never be linked");
  });

  // ── 8. ACCOUNT TAKEOVER / IDENTITY CONFLICT PREVENTED ───────
  await t.test("8. Identity conflict prevents account takeover (409)", async () => {
    // User already legitimately linked to Google Sub A
    seedUser({
      username: "Legit Owner",
      email: "legit@domain.org",
      password: "securepass123",
      googleId: "google_legit_sub_1",
    });

    // Attacker token claiming same email but different Google account
    OAuth2Client.prototype.verifyIdToken = async () => ({
      getPayload: () => ({
        sub: "google_attacker_sub_2",
        email: "legit@domain.org",
        email_verified: true,
        iss: "accounts.google.com",
      }),
    });

    const req = { body: { idToken: "conflict_token" } };
    const res = mockResponse();
    await googleHandler(req, res);

    assert.strictEqual(res.statusCode, 409);
    assert.match(res.body.message, /already linked to a different google account/i);

    // Google ID must still belong to original legit owner
    const after = await User.findOne({ email: "legit@domain.org" });
    assert.strictEqual(after.googleId, "google_legit_sub_1");
  });

  // ── 9. PASSWORD HASHES NEVER EXPOSED IN API RESPONSES ──────
  await t.test("9. Password hashes are never exposed in responses", async () => {
    seedUser({
      username: "Arthur Conan Doyle",
      email: "arthur@bakerstreet.co.uk",
      password: "$2a$10$supersecretcryptohash1234567890",
      googleId: "google_arthur_111",
    });

    OAuth2Client.prototype.verifyIdToken = async () => ({
      getPayload: () => ({
        sub: "google_arthur_111",
        email: "arthur@bakerstreet.co.uk",
        email_verified: true,
        iss: "accounts.google.com",
      }),
    });

    const req = { body: { idToken: "arthur_token" } };
    const res = mockResponse();
    await googleHandler(req, res);

    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.user.password, undefined);
    assert.strictEqual(JSON.stringify(res.body).includes("supersecretcryptohash"), false);
  });

  // ── 10. RATE LIMITING MIDDLEWARE ENFORCEMENT ───────────────
  await t.test("10. Rate limiting middleware enforces maximum attempts", () => {
    const testLimiter = createRateLimiter({
      windowMs: 1000,
      max: 3,
      message: "Rate limit test exceeded",
    });

    const req = { ip: "192.168.1.100", socket: {} };
    let called = 0;
    const next = () => {
      called++;
    };

    // 3 allowed calls
    testLimiter(req, mockResponse(), next);
    testLimiter(req, mockResponse(), next);
    testLimiter(req, mockResponse(), next);
    assert.strictEqual(called, 3);

    // 4th call must be blocked with 429
    const blockedRes = mockResponse();
    testLimiter(req, blockedRes, next);
    assert.strictEqual(called, 3); // next not called
    assert.strictEqual(blockedRes.statusCode, 429);
    assert.strictEqual(blockedRes.body.message, "Rate limit test exceeded");
    assert.ok(blockedRes.headers["Retry-After"]);
  });
});
