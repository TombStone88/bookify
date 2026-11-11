/**
 * @file security_bugs_1_3_5.test.js
 * @description Integration and unit test suite for:
 * - BUG-1: Book Details Authorization (GET /api/books/details/:id)
 * - BUG-3: Club Library Membership Authorization (GET /api/books/:clubId)
 * - BUG-5: Favorite Books Ownership Validation (PUT /api/users/profile & profile population)
 *
 * Uses Node.js native test runner (node:test) and assertions (node:assert).
 */

const { test, describe, before, after } = require("node:test");
const assert = require("node:assert");
const http = require("node:http");
const express = require("express");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");

// Ensure JWT secret is set for tests
process.env.JWT_SECRET = process.env.JWT_SECRET || "test-jwt-secret-key-12345";

const Book = require("../models/Book");
const Club = require("../models/Club");
const User = require("../models/User");
const ReadingProgress = require("../models/ReadingProgress");
const bookRouter = require("../routes/book");
const userRouter = require("../routes/userRoutes");

describe("Security Fixes: BUG-1, BUG-3, BUG-5", () => {
  let server;
  let baseUrl;

  // Test identities
  const userAId = new mongoose.Types.ObjectId().toString(); // Owner of personal books
  const userBId = new mongoose.Types.ObjectId().toString(); // Non-owner / unauthorized user
  const clubAdminId = new mongoose.Types.ObjectId().toString(); // Club Admin
  const clubMemberId = new mongoose.Types.ObjectId().toString(); // Club Member
  const nonMemberId = new mongoose.Types.ObjectId().toString(); // Non-member of club

  // Test clubs
  const club1Id = new mongoose.Types.ObjectId().toString();

  // Test books
  const personalBookA1 = {
    _id: new mongoose.Types.ObjectId(),
    title: "User A Personal Tome",
    author: "Author A",
    uploadedBy: new mongoose.Types.ObjectId(userAId),
    clubId: null,
    progress: 45,
    currentPage: 90,
    totalPages: 200,
    note: "Secret personal reading notes",
  };

  const personalBookB1 = {
    _id: new mongoose.Types.ObjectId(),
    title: "User B Personal Diary",
    author: "Author B",
    uploadedBy: new mongoose.Types.ObjectId(userBId),
    clubId: null,
    progress: 10,
    note: "User B confidential thoughts",
  };

  const club1Book = {
    _id: new mongoose.Types.ObjectId(),
    title: "Club Discussion Volume",
    author: "Club Author",
    uploadedBy: new mongoose.Types.ObjectId(userAId),
    clubId: new mongoose.Types.ObjectId(club1Id),
    progress: 0,
  };

  // Auth tokens
  const tokenUserA = jwt.sign({ userId: userAId }, process.env.JWT_SECRET);
  const tokenUserB = jwt.sign({ userId: userBId }, process.env.JWT_SECRET);
  const tokenClubAdmin = jwt.sign({ userId: clubAdminId }, process.env.JWT_SECRET);
  const tokenClubMember = jwt.sign({ userId: clubMemberId }, process.env.JWT_SECRET);
  const tokenNonMember = jwt.sign({ userId: nonMemberId }, process.env.JWT_SECRET);

  // Original model methods to restore after tests
  const originalBookFindById = Book.findById;
  const originalBookFind = Book.find;
  const originalClubExists = Club.exists;
  const originalClubFind = Club.find;
  const originalUserFindOne = User.findOne;
  const originalUserFindById = User.findById;
  const originalUserFindByIdAndUpdate = User.findByIdAndUpdate;
  const originalProgressFindOne = ReadingProgress.findOne;
  const originalProgressFind = ReadingProgress.find;

  before(async () => {
    ReadingProgress.findOne = async () => null;
    ReadingProgress.find = async () => [];

    const app = express();
    app.use(express.json());
    app.use("/api/books", bookRouter);
    app.use("/api/users", userRouter);

    server = http.createServer(app);
    await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
    const port = server.address().port;
    baseUrl = `http://127.0.0.1:${port}`;
  });

  after(async () => {
    // Restore mocks
    Book.findById = originalBookFindById;
    Book.find = originalBookFind;
    Club.exists = originalClubExists;
    Club.find = originalClubFind;
    User.findOne = originalUserFindOne;
    User.findById = originalUserFindById;
    User.findByIdAndUpdate = originalUserFindByIdAndUpdate;
    ReadingProgress.findOne = originalProgressFindOne;
    ReadingProgress.find = originalProgressFind;

    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
  });

  // ══════════════════════════════════════════════════════════════
  // BUG-1: Book Details Authorization (GET /api/books/details/:id)
  // ══════════════════════════════════════════════════════════════
  describe("BUG-1: Book Details Authorization", () => {
    test("BUG1-TEST-1: Owner can access their own personal book details (200 OK)", async () => {
      Book.findById = async (id) => {
        if (id.toString() === personalBookA1._id.toString()) return personalBookA1;
        return null;
      };

      const res = await fetch(`${baseUrl}/api/books/details/${personalBookA1._id}`, {
        headers: { Authorization: `Bearer ${tokenUserA}` },
      });

      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.title, "User A Personal Tome");
      assert.strictEqual(data.note, "Secret personal reading notes");
    });

    test("BUG1-TEST-2: Other authenticated user cannot access another user's personal book (403 Forbidden)", async () => {
      Book.findById = async (id) => {
        if (id.toString() === personalBookA1._id.toString()) return personalBookA1;
        return null;
      };

      const res = await fetch(`${baseUrl}/api/books/details/${personalBookA1._id}`, {
        headers: { Authorization: `Bearer ${tokenUserB}` },
      });

      assert.strictEqual(res.status, 403);
      const data = await res.json();
      assert.strictEqual(data.error, "Access denied. You do not own this volume.");
      assert.strictEqual(data.note, undefined);
    });

    test("BUG1-TEST-3: Personal book with missing/null uploadedBy is rejected (403 Forbidden)", async () => {
      const orphanBook = {
        _id: new mongoose.Types.ObjectId(),
        title: "Orphan Book",
        uploadedBy: null,
        clubId: null,
      };

      Book.findById = async () => orphanBook;

      const res = await fetch(`${baseUrl}/api/books/details/${orphanBook._id}`, {
        headers: { Authorization: `Bearer ${tokenUserA}` },
      });

      assert.strictEqual(res.status, 403);
      const data = await res.json();
      assert.strictEqual(data.error, "Access denied. You do not own this volume.");
    });

    test("BUG1-TEST-4: Club member can access club book details (200 OK)", async () => {
      Book.findById = async (id) => {
        if (id.toString() === club1Book._id.toString()) return club1Book;
        return null;
      };

      Club.exists = async (query) => {
        const matchesClub = query._id.toString() === club1Id;
        const matchesUser = query.$or.some(
          (cond) =>
            (cond.members && cond.members.toString() === clubMemberId) ||
            (cond.admin && cond.admin.toString() === clubMemberId)
        );
        return matchesClub && matchesUser ? { _id: query._id } : null;
      };

      const res = await fetch(`${baseUrl}/api/books/details/${club1Book._id}`, {
        headers: { Authorization: `Bearer ${tokenClubMember}` },
      });

      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.title, "Club Discussion Volume");
    });

    test("BUG1-TEST-5: Club admin can access club book details (200 OK)", async () => {
      Book.findById = async (id) => {
        if (id.toString() === club1Book._id.toString()) return club1Book;
        return null;
      };

      Club.exists = async (query) => {
        const matchesClub = query._id.toString() === club1Id;
        const matchesUser = query.$or.some(
          (cond) =>
            (cond.members && cond.members.toString() === clubAdminId) ||
            (cond.admin && cond.admin.toString() === clubAdminId)
        );
        return matchesClub && matchesUser ? { _id: query._id } : null;
      };

      const res = await fetch(`${baseUrl}/api/books/details/${club1Book._id}`, {
        headers: { Authorization: `Bearer ${tokenClubAdmin}` },
      });

      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.title, "Club Discussion Volume");
    });

    test("BUG1-TEST-6: Non-member cannot access club book details (403 Forbidden)", async () => {
      Book.findById = async (id) => {
        if (id.toString() === club1Book._id.toString()) return club1Book;
        return null;
      };

      Club.exists = async (query) => {
        // Non-member does not match
        return null;
      };

      const res = await fetch(`${baseUrl}/api/books/details/${club1Book._id}`, {
        headers: { Authorization: `Bearer ${tokenNonMember}` },
      });

      assert.strictEqual(res.status, 403);
      const data = await res.json();
      assert.strictEqual(data.error, "Access denied. You are not a member of this club.");
    });

    test("BUG1-TEST-7: Invalid ObjectId returns 404 cleanly", async () => {
      const res = await fetch(`${baseUrl}/api/books/details/invalid-hex-id`, {
        headers: { Authorization: `Bearer ${tokenUserA}` },
      });

      assert.strictEqual(res.status, 404);
      const data = await res.json();
      assert.strictEqual(data.error, "Volume not found in the Athenaeum registry");
    });

    test("BUG1-TEST-8: Non-existent book ID returns 404 cleanly", async () => {
      Book.findById = async () => null;

      const nonExistentId = new mongoose.Types.ObjectId().toString();
      const res = await fetch(`${baseUrl}/api/books/details/${nonExistentId}`, {
        headers: { Authorization: `Bearer ${tokenUserA}` },
      });

      assert.strictEqual(res.status, 404);
      const data = await res.json();
      assert.strictEqual(data.error, "Volume not found in the Athenaeum registry");
    });
  });

  // ══════════════════════════════════════════════════════════════
  // BUG-3: Club Library Membership Authorization (GET /api/books/:clubId)
  // ══════════════════════════════════════════════════════════════
  describe("BUG-3: Club Library Membership Authorization", () => {
    test("BUG3-TEST-1: Active club member can retrieve club library (200 OK)", async () => {
      Club.exists = async (query) => {
        const matchesClub = query._id.toString() === club1Id;
        const matchesUser = query.$or.some(
          (cond) =>
            (cond.members && cond.members.toString() === clubMemberId) ||
            (cond.admin && cond.admin.toString() === clubMemberId)
        );
        return matchesClub && matchesUser ? { _id: query._id } : null;
      };

      Book.find = async (query) => {
        if (query.clubId.toString() === club1Id) {
          return [club1Book];
        }
        return [];
      };

      const res = await fetch(`${baseUrl}/api/books/${club1Id}`, {
        headers: { Authorization: `Bearer ${tokenClubMember}` },
      });

      assert.strictEqual(res.status, 200);
      const books = await res.json();
      assert.strictEqual(books.length, 1);
      assert.strictEqual(books[0].title, "Club Discussion Volume");
    });

    test("BUG3-TEST-2: Active club admin can retrieve club library (200 OK)", async () => {
      Club.exists = async (query) => {
        const matchesClub = query._id.toString() === club1Id;
        const matchesUser = query.$or.some(
          (cond) =>
            (cond.members && cond.members.toString() === clubAdminId) ||
            (cond.admin && cond.admin.toString() === clubAdminId)
        );
        return matchesClub && matchesUser ? { _id: query._id } : null;
      };

      Book.find = async (query) => {
        if (query.clubId.toString() === club1Id) {
          return [club1Book];
        }
        return [];
      };

      const res = await fetch(`${baseUrl}/api/books/${club1Id}`, {
        headers: { Authorization: `Bearer ${tokenClubAdmin}` },
      });

      assert.strictEqual(res.status, 200);
      const books = await res.json();
      assert.strictEqual(books.length, 1);
      assert.strictEqual(books[0].title, "Club Discussion Volume");
    });

    test("BUG3-TEST-3: Non-member cannot retrieve club library (403 Forbidden)", async () => {
      Club.exists = async () => null; // Non-member

      const res = await fetch(`${baseUrl}/api/books/${club1Id}`, {
        headers: { Authorization: `Bearer ${tokenNonMember}` },
      });

      assert.strictEqual(res.status, 403);
      const data = await res.json();
      assert.strictEqual(data.error, "Access denied. You are not a member of this club.");
    });

    test("BUG3-TEST-4: Invalid club ID returns 400 Bad Request", async () => {
      const res = await fetch(`${baseUrl}/api/books/not-a-valid-id`, {
        headers: { Authorization: `Bearer ${tokenUserA}` },
      });

      assert.strictEqual(res.status, 400);
      const data = await res.json();
      assert.strictEqual(data.error, "Invalid club ID");
    });

    test("BUG3-TEST-5: Personal books cannot be queried via club library endpoint", async () => {
      Club.exists = async () => ({ _id: club1Id });

      let receivedQuery;
      Book.find = async (query) => {
        receivedQuery = query;
        return [];
      };

      const res = await fetch(`${baseUrl}/api/books/${club1Id}`, {
        headers: { Authorization: `Bearer ${tokenClubMember}` },
      });

      assert.strictEqual(res.status, 200);
      assert.strictEqual(receivedQuery.clubId, club1Id);
      // Query specifically filters by clubId, ensuring personal books (clubId: null) are never matched
      assert.notStrictEqual(receivedQuery.clubId, null);
    });
  });

  // ══════════════════════════════════════════════════════════════
  // BUG-5: Favorite Books Ownership Validation (PUT /api/users/profile)
  // ══════════════════════════════════════════════════════════════
  describe("BUG-5: Favorite Books Ownership Validation", () => {
    test("BUG5-TEST-1: User can set their own personal books as favorites (200 OK)", async () => {
      Book.find = (filter) => {
        // Mock chainable find
        const chain = {
          select: async () => [
            { _id: personalBookA1._id },
          ],
        };
        return chain;
      };

      User.findByIdAndUpdate = (id, updates) => {
        assert.deepStrictEqual(updates.favoriteBooks, [personalBookA1._id.toString()]);
        return {
          select: () => ({
            populate: async () => ({
              _id: userAId,
              username: "UserA",
              favoriteBooks: [
                {
                  _id: personalBookA1._id,
                  title: personalBookA1.title,
                  uploadedBy: personalBookA1.uploadedBy,
                  clubId: null,
                },
              ],
            }),
          }),
        };
      };

      const res = await fetch(`${baseUrl}/api/users/profile`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${tokenUserA}`,
        },
        body: JSON.stringify({
          favoriteBooks: [personalBookA1._id.toString()],
        }),
      });

      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.favoriteBooks.length, 1);
      assert.strictEqual(data.favoriteBooks[0].title, "User A Personal Tome");
    });

    test("BUG5-TEST-2: Clearing favorite books with empty array succeeds (200 OK)", async () => {
      User.findByIdAndUpdate = (id, updates) => {
        assert.deepStrictEqual(updates.favoriteBooks, []);
        return {
          select: () => ({
            populate: async () => ({
              _id: userAId,
              username: "UserA",
              favoriteBooks: [],
            }),
          }),
        };
      };

      const res = await fetch(`${baseUrl}/api/users/profile`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${tokenUserA}`,
        },
        body: JSON.stringify({
          favoriteBooks: [],
        }),
      });

      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.deepStrictEqual(data.favoriteBooks, []);
    });

    test("BUG5-TEST-3: Attempting to set another user's personal book is rejected (400 Bad Request)", async () => {
      // User A tries to set User B's book as favorite
      Book.find = (filter) => ({
        select: async () => {
          // Filter requires uploadedBy: userAId. personalBookB1 belongs to userBId, so returns 0 matches
          return [];
        },
      });

      const res = await fetch(`${baseUrl}/api/users/profile`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${tokenUserA}`,
        },
        body: JSON.stringify({
          favoriteBooks: [personalBookB1._id.toString()],
        }),
      });

      assert.strictEqual(res.status, 400);
      const data = await res.json();
      assert.strictEqual(
        data.error,
        "One or more favorite books do not belong to your personal library."
      );
    });

    test("BUG5-TEST-4: Attempting to set a club book as favorite is rejected (400 Bad Request)", async () => {
      // User A tries to set a club book (even if uploaded by User A) as favorite
      Book.find = (filter) => ({
        select: async () => {
          // Filter requires clubId: null or missing. club1Book has clubId, so returns 0 matches
          return [];
        },
      });

      const res = await fetch(`${baseUrl}/api/users/profile`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${tokenUserA}`,
        },
        body: JSON.stringify({
          favoriteBooks: [club1Book._id.toString()],
        }),
      });

      assert.strictEqual(res.status, 400);
      const data = await res.json();
      assert.strictEqual(
        data.error,
        "One or more favorite books do not belong to your personal library."
      );
    });

    test("BUG5-TEST-5: Attempting to set a non-existent book ID is rejected (400 Bad Request)", async () => {
      Book.find = () => ({
        select: async () => [],
      });

      const randomId = new mongoose.Types.ObjectId().toString();
      const res = await fetch(`${baseUrl}/api/users/profile`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${tokenUserA}`,
        },
        body: JSON.stringify({
          favoriteBooks: [randomId],
        }),
      });

      assert.strictEqual(res.status, 400);
      const data = await res.json();
      assert.strictEqual(
        data.error,
        "One or more favorite books do not belong to your personal library."
      );
    });

    test("BUG5-TEST-6: Invalid ObjectId strings in favoriteBooks are rejected (400 Bad Request)", async () => {
      const res = await fetch(`${baseUrl}/api/users/profile`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${tokenUserA}`,
        },
        body: JSON.stringify({
          favoriteBooks: ["not-a-valid-object-id"],
        }),
      });

      assert.strictEqual(res.status, 400);
      const data = await res.json();
      assert.strictEqual(data.error, "One or more favorite book IDs are invalid.");
    });

    test("BUG5-TEST-7: Non-array favoriteBooks payload is rejected (400 Bad Request)", async () => {
      const res = await fetch(`${baseUrl}/api/users/profile`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${tokenUserA}`,
        },
        body: JSON.stringify({
          favoriteBooks: "invalid-string-payload",
        }),
      });

      assert.strictEqual(res.status, 400);
      const data = await res.json();
      assert.strictEqual(data.error, "favoriteBooks must be an array of book IDs.");
    });

    test("BUG5-TEST-8: Duplicate IDs in favoriteBooks are safely deduplicated", async () => {
      Book.find = () => ({
        select: async () => [{ _id: personalBookA1._id }],
      });

      let savedUpdates;
      User.findByIdAndUpdate = (id, updates) => {
        savedUpdates = updates;
        return {
          select: () => ({
            populate: async () => ({
              _id: userAId,
              favoriteBooks: [personalBookA1],
            }),
          }),
        };
      };

      const res = await fetch(`${baseUrl}/api/users/profile`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${tokenUserA}`,
        },
        body: JSON.stringify({
          favoriteBooks: [personalBookA1._id.toString(), personalBookA1._id.toString()],
        }),
      });

      assert.strictEqual(res.status, 200);
      assert.deepStrictEqual(savedUpdates.favoriteBooks, [personalBookA1._id.toString()]);
    });
  });

  // ══════════════════════════════════════════════════════════════
  // Profile Population Privacy & Isolation Checks
  // ══════════════════════════════════════════════════════════════
  describe("Profile Population Security: Metadata Isolation", () => {
    test("POP-TEST-1: GET /public/:username never exposes foreign or club books in favoriteBooks", async () => {
      User.findOne = () => ({
        select: () => ({
          populate: async () => ({
            _id: new mongoose.Types.ObjectId(userAId),
            username: "readerA",
            profileImage: "",
            bio: "Avid reader",
            privacy: { isPublic: true, showFavoriteBooks: true },
            favoriteBooks: [
              // 1. Valid personal book belonging to User A
              {
                _id: personalBookA1._id,
                title: "User A Personal Tome",
                uploadedBy: new mongoose.Types.ObjectId(userAId),
                clubId: null,
              },
              // 2. Corrupt legacy reference: book uploaded by User B
              {
                _id: personalBookB1._id,
                title: "User B Personal Diary",
                uploadedBy: new mongoose.Types.ObjectId(userBId),
                clubId: null,
              },
              // 3. Corrupt legacy reference: club book
              {
                _id: club1Book._id,
                title: "Club Volume",
                uploadedBy: new mongoose.Types.ObjectId(userAId),
                clubId: new mongoose.Types.ObjectId(club1Id),
              },
            ],
          }),
        }),
      });

      Book.find = () => ({
        sort: async () => [],
      });
      Club.find = async () => [];

      const res = await fetch(`${baseUrl}/api/users/public/readerA`);
      assert.strictEqual(res.status, 200);
      const data = await res.json();

      // Only User A's personal book should be returned in favoriteBooks
      assert.strictEqual(data.favoriteBooks.length, 1);
      assert.strictEqual(data.favoriteBooks[0].title, "User A Personal Tome");
      assert.strictEqual(
        data.favoriteBooks.some((b) => b.title === "User B Personal Diary"),
        false
      );
      assert.strictEqual(
        data.favoriteBooks.some((b) => b.title === "Club Volume"),
        false
      );
    });

    test("POP-TEST-2: GET /me never exposes foreign or club books in favoriteBooks", async () => {
      User.findById = () => ({
        select: () => ({
          populate: async () => ({
            _id: new mongoose.Types.ObjectId(userAId),
            username: "readerA",
            email: "a@athenaeum.org",
            profileImage: "",
            bio: "",
            privacy: { isPublic: true },
            favoriteBooks: [
              // 1. Valid personal book
              {
                _id: personalBookA1._id,
                title: "User A Personal Tome",
                uploadedBy: new mongoose.Types.ObjectId(userAId),
                clubId: null,
              },
              // 2. Corrupt legacy foreign book
              {
                _id: personalBookB1._id,
                title: "User B Personal Diary",
                uploadedBy: new mongoose.Types.ObjectId(userBId),
                clubId: null,
              },
            ],
          }),
        }),
      });

      Book.find = () => ({
        sort: async () => [],
      });
      Club.find = async () => [];

      const res = await fetch(`${baseUrl}/api/users/me`, {
        headers: { Authorization: `Bearer ${tokenUserA}` },
      });

      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.user.favoriteBooks.length, 1);
      assert.strictEqual(data.user.favoriteBooks[0].title, "User A Personal Tome");
      assert.strictEqual(
        data.user.favoriteBooks.some((b) => b.title === "User B Personal Diary"),
        false
      );
    });
  });
});
