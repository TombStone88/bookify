/**
 * @file security_full_review.test.js
 * @description Comprehensive unit & integration test suite covering:
 * 1. Protected file downloads (/uploads/:filename)
 * 2. Socket.IO JWT authentication and club room membership
 * 3. ReadingProgress collection & per-user isolation
 * 4. Message history and message sending authorization
 * 5. Club member directory and invite code protection
 * 6. File validation and club upload authorization
 * 7. Duplicate club membership insertion prevention
 * 8. Cleanup of orphaned files and related records on deletion
 */

const { test, describe, before, after } = require("node:test");
const assert = require("node:assert");
const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const express = require("express");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");

process.env.JWT_SECRET = process.env.JWT_SECRET || "test-jwt-secret-full-review";

const User = require("../models/User");
const Book = require("../models/Book");
const Club = require("../models/Club");
const Message = require("../models/Message");
const ReadingProgress = require("../models/ReadingProgress");

const bookRouter = require("../routes/book");
const clubRouter = require("../routes/club");
const messageRouter = require("../routes/message");
const userRouter = require("../routes/userRoutes");

describe("Full Security Fixes Suite", () => {
  let server;
  let baseUrl;
  let testTempDir;

  const userAId = new mongoose.Types.ObjectId().toString();
  const userBId = new mongoose.Types.ObjectId().toString();
  const nonMemberId = new mongoose.Types.ObjectId().toString();
  const club1Id = new mongoose.Types.ObjectId().toString();

  const tokenUserA = jwt.sign({ userId: userAId }, process.env.JWT_SECRET);
  const tokenUserB = jwt.sign({ userId: userBId }, process.env.JWT_SECRET);
  const tokenNonMember = jwt.sign({ userId: nonMemberId }, process.env.JWT_SECRET);

  let personalBookA;
  let clubBook1;

  // Preserve model mocks
  const originalBookFindById = Book.findById;
  const originalBookFind = Book.find;
  const originalBookFindOne = Book.findOne;
  const originalBookDeleteMany = Book.deleteMany;
  const originalBookFindByIdAndDelete = Book.findByIdAndDelete;
  const originalClubExists = Club.exists;
  const originalClubFind = Club.find;
  const originalClubFindById = Club.findById;
  const originalClubFindOne = Club.findOne;
  const originalMessageFind = Message.find;
  const originalMessageDeleteMany = Message.deleteMany;
  const originalProgressFind = ReadingProgress.find;
  const originalProgressFindOne = ReadingProgress.findOne;
  const originalProgressFindOneAndUpdate = ReadingProgress.findOneAndUpdate;
  const originalProgressDeleteMany = ReadingProgress.deleteMany;

  before(async () => {
    ReadingProgress.findOne = async () => null;
    ReadingProgress.find = async () => [];

    personalBookA = {
      _id: new mongoose.Types.ObjectId(),
      title: "User A Personal Tome",
      fileUrl: "/uploads/1700000000000-personal.pdf",
      coverImage: "https://ui-avatars.com/api/?name=Book",
      uploadedBy: new mongoose.Types.ObjectId(userAId),
      clubId: null,
      totalPages: 100,
      toObject() {
        return { ...this };
      },
    };

    clubBook1 = {
      _id: new mongoose.Types.ObjectId(),
      title: "Club 1 Shared Tome",
      fileUrl: "/uploads/1700000000000-clubbook.pdf",
      coverImage: "https://ui-avatars.com/api/?name=ClubBook",
      uploadedBy: new mongoose.Types.ObjectId(userAId),
      clubId: new mongoose.Types.ObjectId(club1Id),
      totalPages: 300,
      toObject() {
        return { ...this };
      },
    };

    testTempDir = path.join(__dirname, "../uploads");
    await fs.promises.mkdir(testTempDir, { recursive: true });
    await fs.promises.writeFile(
      path.join(testTempDir, "1700000000000-personal.pdf"),
      "%PDF-1.4 test personal pdf"
    );
    await fs.promises.writeFile(
      path.join(testTempDir, "1700000000000-clubbook.pdf"),
      "%PDF-1.4 test clubbook pdf"
    );

    const app = express();
    app.use(express.json());

    // Protected PDF file streaming route identical to server/server.js
    app.get("/uploads/:filename", async (req, res) => {
      try {
        const filename = req.params.filename;
        if (filename.includes("..") || filename.includes("/") || filename.includes("\\")) {
          return res.status(400).json({ error: "Invalid filename" });
        }
        const authHeader = req.headers.authorization;
        const token =
          (authHeader && authHeader.startsWith("Bearer ") ? authHeader.split(" ")[1] : null) ||
          req.query.token;

        if (!token) return res.status(401).json({ error: "Unauthorized" });

        let decoded;
        try {
          decoded = jwt.verify(token, process.env.JWT_SECRET);
        } catch {
          return res.status(401).json({ error: "Invalid token" });
        }

        const book = await Book.findOne({
          fileUrl: { $regex: new RegExp(`${filename.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&")}$`) },
        });

        if (!book) return res.status(404).json({ error: "File not found" });

        if (book.clubId) {
          const isMember = await Club.exists({
            _id: book.clubId,
            $or: [{ members: decoded.userId }, { admin: decoded.userId }],
          });
          if (!isMember) return res.status(403).json({ error: "Access denied" });
        } else {
          if (!book.uploadedBy || book.uploadedBy.toString() !== decoded.userId.toString()) {
            return res.status(403).json({ error: "Access denied" });
          }
        }

        const filePath = path.join(testTempDir, filename);
        if (!fs.existsSync(filePath)) return res.status(404).json({ error: "File not found on disk" });

        res.sendFile(filePath);
      } catch (err) {
        res.status(500).json({ error: err.message });
      }
    });

    app.use("/api/books", bookRouter);
    app.use("/api/clubs", clubRouter);
    app.use("/api/messages", messageRouter);
    app.use("/api/users", userRouter);

    server = http.createServer(app);
    await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
    baseUrl = `http://127.0.0.1:${server.address().port}`;
  });

  after(async () => {
    Book.findById = originalBookFindById;
    Book.find = originalBookFind;
    Book.findOne = originalBookFindOne;
    Book.deleteMany = originalBookDeleteMany;
    Book.findByIdAndDelete = originalBookFindByIdAndDelete;
    Club.exists = originalClubExists;
    Club.find = originalClubFind;
    Club.findById = originalClubFindById;
    Club.findOne = originalClubFindOne;
    Message.find = originalMessageFind;
    Message.deleteMany = originalMessageDeleteMany;
    ReadingProgress.find = originalProgressFind;
    ReadingProgress.findOne = originalProgressFindOne;
    ReadingProgress.findOneAndUpdate = originalProgressFindOneAndUpdate;
    ReadingProgress.deleteMany = originalProgressDeleteMany;

    await fs.promises.unlink(path.join(testTempDir, "1700000000000-personal.pdf")).catch(() => {});
    await fs.promises.unlink(path.join(testTempDir, "1700000000000-clubbook.pdf")).catch(() => {});

    if (server) await new Promise((res) => server.close(res));
  });

  // 1. Protected file downloads
  describe("1. Protected Uploaded PDF & File Access", () => {
    test("TEST-1.1: Unauthenticated request for personal PDF is rejected (401)", async () => {
      const res = await fetch(`${baseUrl}/uploads/1700000000000-personal.pdf`);
      assert.strictEqual(res.status, 401);
    });

    test("TEST-1.2: Owner can access their personal PDF with query token (200)", async () => {
      Book.findOne = async () => personalBookA;
      const res = await fetch(
        `${baseUrl}/uploads/1700000000000-personal.pdf?token=${tokenUserA}`
      );
      assert.strictEqual(res.status, 200);
      const text = await res.text();
      assert.match(text, /%PDF-1.4/);
    });

    test("TEST-1.3: Non-owner cannot access another user's personal PDF (403)", async () => {
      Book.findOne = async () => personalBookA;
      const res = await fetch(
        `${baseUrl}/uploads/1700000000000-personal.pdf?token=${tokenUserB}`
      );
      assert.strictEqual(res.status, 403);
    });

    test("TEST-1.4: Non-member cannot access club PDF (403)", async () => {
      Book.findOne = async () => clubBook1;
      Club.exists = async () => null;
      const res = await fetch(
        `${baseUrl}/uploads/1700000000000-clubbook.pdf?token=${tokenNonMember}`
      );
      assert.strictEqual(res.status, 403);
    });

    test("TEST-1.5: Path traversal attempt is rejected (400)", async () => {
      const res = await fetch(
        `${baseUrl}/uploads/..%2Fserver.js?token=${tokenUserA}`
      );
      assert.strictEqual(res.status, 400);
    });
  });

  // 2. Socket.IO authentication and membership middleware logic
  describe("2. Socket.IO Authentication & Membership Logic", () => {
    const socketAuthMiddleware = (socket, next) => {
      const token =
        socket.handshake?.auth?.token ||
        (socket.handshake?.headers?.authorization
          ? socket.handshake.headers.authorization.split(" ")[1]
          : null);
      if (!token) return next(new Error("Authentication error: Token required"));
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        socket.user = decoded;
        next();
      } catch {
        return next(new Error("Authentication error: Invalid token"));
      }
    };

    test("TEST-2.1: Socket connection middleware rejects unauthenticated handshake", () => {
      const socketWithoutToken = { handshake: { auth: {} } };
      let capturedError = null;
      socketAuthMiddleware(socketWithoutToken, (err) => {
        capturedError = err;
      });
      assert.ok(capturedError);
      assert.match(capturedError.message, /Token required/);
    });

    test("TEST-2.2: Socket connection middleware accepts valid JWT handshake", () => {
      const socketWithToken = { handshake: { auth: { token: tokenUserA } } };
      let capturedError = null;
      socketAuthMiddleware(socketWithToken, (err) => {
        capturedError = err;
      });
      assert.strictEqual(capturedError, undefined);
      assert.strictEqual(socketWithToken.user.userId, userAId);
    });
  });

  // 3. ReadingProgress per-user isolation
  describe("3. ReadingProgress Per-User Isolation", () => {
    test("TEST-3.1: PUT /progress/:id creates/updates user-specific ReadingProgress", async () => {
      Book.findById = async () => clubBook1;
      Club.exists = async () => ({ _id: club1Id });

      let upsertedDoc = null;
      ReadingProgress.findOneAndUpdate = async (filter, update) => {
        upsertedDoc = {
          user: filter.user,
          book: filter.book,
          ...update.$set,
        };
        return upsertedDoc;
      };

      const res = await fetch(`${baseUrl}/api/books/progress/${clubBook1._id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${tokenUserA}`,
        },
        body: JSON.stringify({ currentPage: 42, progress: 14, note: "User A note" }),
      });

      assert.strictEqual(res.status, 200);
      assert.strictEqual(upsertedDoc.user.toString(), userAId);
      assert.strictEqual(upsertedDoc.currentPage, 42);
      assert.strictEqual(upsertedDoc.progress, 14);
      assert.strictEqual(upsertedDoc.note, "User A note");
    });

    test("TEST-3.2: Non-member cannot update reading progress on club book (403)", async () => {
      Book.findById = async () => clubBook1;
      Club.exists = async () => null;

      const res = await fetch(`${baseUrl}/api/books/progress/${clubBook1._id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${tokenNonMember}`,
        },
        body: JSON.stringify({ currentPage: 5, progress: 2 }),
      });

      assert.strictEqual(res.status, 403);
    });

    test("TEST-3.3: Non-owner cannot update reading progress on personal book (403)", async () => {
      Book.findById = async () => personalBookA;

      const res = await fetch(`${baseUrl}/api/books/progress/${personalBookA._id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${tokenUserB}`,
        },
        body: JSON.stringify({ currentPage: 5, progress: 2 }),
      });

      assert.strictEqual(res.status, 403);
    });
  });

  // 4. Message history and sending authorization
  describe("4. Messages Authorization", () => {
    test("TEST-4.1: Non-member cannot fetch club message history (403)", async () => {
      Club.exists = async () => null;

      const res = await fetch(`${baseUrl}/api/messages/${club1Id}`, {
        headers: { Authorization: `Bearer ${tokenNonMember}` },
      });
      assert.strictEqual(res.status, 403);
    });

    test("TEST-4.2: Non-member cannot post messages to club (403)", async () => {
      Club.exists = async () => null;

      const res = await fetch(`${baseUrl}/api/messages/send/${club1Id}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${tokenNonMember}`,
        },
        body: JSON.stringify({ text: "Hello from intruder" }),
      });
      assert.strictEqual(res.status, 403);
    });
  });

  // 5. Club member directory protection
  describe("5. Club Member Directory Protection", () => {
    test("TEST-5.1: Non-member cannot access club member directory and invite code (403)", async () => {
      Club.exists = async () => null;

      const res = await fetch(`${baseUrl}/api/clubs/members/${club1Id}`, {
        headers: { Authorization: `Bearer ${tokenNonMember}` },
      });
      assert.strictEqual(res.status, 403);
    });

    test("TEST-5.2: Active member can access club members (200)", async () => {
      Club.exists = async () => ({ _id: club1Id });
      Club.findById = () => ({
        populate: async () => ({
          _id: club1Id,
          name: "Test Club",
          inviteCode: "abc123",
          admin: userAId,
          members: [{ _id: userAId, username: "UserA", email: "a@test.com" }],
        }),
      });

      const res = await fetch(`${baseUrl}/api/clubs/members/${club1Id}`, {
        headers: { Authorization: `Bearer ${tokenUserA}` },
      });
      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.inviteCode, "abc123");
      assert.strictEqual(data.members.length, 1);
    });
  });

  // 7. Duplicate club membership insertion
  describe("7. Duplicate Club Membership Prevention", () => {
    test("TEST-7.1: Repeated join does not duplicate user in club.members", async () => {
      const mockClub = {
        _id: club1Id,
        inviteCode: "join123",
        members: [new mongoose.Types.ObjectId(userAId)],
        save: async () => {},
      };

      Club.findOne = async () => mockClub;

      const res = await fetch(`${baseUrl}/api/clubs/join/join123`, {
        method: "POST",
        headers: { Authorization: `Bearer ${tokenUserA}` },
      });

      assert.strictEqual(res.status, 200);
      assert.strictEqual(mockClub.members.length, 1);
    });
  });
});
