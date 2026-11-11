const test = require("node:test");
const assert = require("node:assert");
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");

const Notification = require("../models/Notification");
const notificationRoutes = require("../routes/notification");
const { sendNotification } = require("../utils/notify");

const JWT_SECRET = process.env.JWT_SECRET || "testjwtsecretkeybookify123456";
process.env.JWT_SECRET = JWT_SECRET;

function createTestToken(userId, username = "testuser") {
  return jwt.sign({ userId, username }, JWT_SECRET);
}

// Minimal Express mock runner for route testing
function mockRequest({
  method = "GET",
  url = "/",
  params = {},
  query = {},
  body = {},
  headers = {},
  user = null,
}) {
  const req = {
    method,
    url,
    params,
    query,
    body,
    headers: { ...headers },
    user,
    app: {
      get: () => null,
    },
  };
  return req;
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

test("Notification Center Suite", async (t) => {
  const userA = new mongoose.Types.ObjectId().toString();
  const userB = new mongoose.Types.ObjectId().toString();
  const tokenA = createTestToken(userA, "userA");
  const tokenB = createTestToken(userB, "userB");

  await t.test("1. Model Validation & Schema Constraints", () => {
    const validNotif = new Notification({
      recipient: new mongoose.Types.ObjectId(),
      sender: new mongoose.Types.ObjectId(),
      type: "club_message",
      title: "New Reflection",
      message: "Reader: 'Notes on page 42'",
      referenceId: new mongoose.Types.ObjectId(),
      referenceType: "club",
      isRead: false,
    });

    const validationError = validNotif.validateSync();
    assert.strictEqual(validationError, undefined, "Valid notification must pass validation");

    const invalidNotif = new Notification({
      recipient: new mongoose.Types.ObjectId(),
      type: "invalid_type_here",
      title: "Invalid",
    });
    const err = invalidNotif.validateSync();
    assert.ok(err, "Invalid notification must fail schema validation");
    assert.ok(err.errors.type, "Expected type validation error");
    assert.ok(err.errors.message, "Expected message validation error");
    assert.ok(err.errors.referenceId, "Expected referenceId validation error");
    assert.ok(err.errors.referenceType, "Expected referenceType validation error");
  });

  await t.test("2. Unauthenticated Requests Rejected (401)", async () => {
    const req = mockRequest({
      method: "GET",
      url: "/",
      headers: {},
    });
    const res = mockResponse();

    const authMiddleware = require("../middleware/authMiddleware");
    authMiddleware(req, res, () => {});

    assert.strictEqual(res.statusCode, 401, "Should reject unauthenticated request with 401");
  });

  await t.test("3. sendNotification helper creates notifications and avoids self-sending", async () => {
    const emittedEvents = [];
    const mockIo = {
      to: (room) => ({
        emit: (event, payload) => {
          emittedEvents.push({ room, event, payload });
        },
      }),
    };

    // Mock Notification.prototype.save and Notification.findById
    const originalSave = Notification.prototype.save;
    const originalFindById = Notification.findById;

    Notification.prototype.save = async function () {
      this._id = new mongoose.Types.ObjectId();
      return this;
    };

    Notification.findById = function (id) {
      return {
        populate: async () => ({
          _id: id,
          title: "Test Title",
          message: "Test Message",
          recipient: userA,
          sender: { _id: userB, username: "userB" },
        }),
      };
    };

    try {
      // Send notification with sender = userB, recipients = [userA, userB] (userB must be skipped)
      const clubId = new mongoose.Types.ObjectId();
      const results = await sendNotification({
        io: mockIo,
        recipients: [userA, userB],
        sender: userB,
        type: "club_message",
        title: "Test Title",
        message: "Test Message",
        referenceId: clubId,
        referenceType: "club",
      });

      assert.strictEqual(results.length, 1, "Must create notification only for userA (not sender userB)");
      assert.strictEqual(emittedEvents.length, 1, "Must emit socket event only once");
      assert.strictEqual(emittedEvents[0].room, `user:${userA}`, "Socket event must target userA isolated room");
      assert.strictEqual(emittedEvents[0].event, "newNotification", "Socket event name must be newNotification");
    } finally {
      Notification.prototype.save = originalSave;
      Notification.findById = originalFindById;
    }
  });

  await t.test("4. Cross-User Data Isolation: User A cannot read User B's notifications", async () => {
    const originalFind = Notification.find;
    const originalCount = Notification.countDocuments;

    let capturedQuery = null;

    Notification.find = function (query) {
      capturedQuery = query;
      return {
        populate: () => ({
          sort: () => ({
            skip: () => ({
              limit: async () => [],
            }),
          }),
        }),
      };
    };

    Notification.countDocuments = async function (query) {
      return 0;
    };

    try {
      const notifId = new mongoose.Types.ObjectId();
      const req = mockRequest({
        method: "GET",
        url: "/",
        user: { userId: userA },
      });
      const res = mockResponse();

      // Find the GET / route handler
      const getHandler = notificationRoutes.stack.find(
        (s) => s.route && s.route.path === "/" && s.route.methods.get
      ).route.stack[1].handle;

      await getHandler(req, res);

      assert.strictEqual(res.statusCode, 200);
      assert.strictEqual(
        capturedQuery.recipient.toString(),
        userA.toString(),
        "Query must be strictly isolated to the authenticated user's ID"
      );
    } finally {
      Notification.find = originalFind;
      Notification.countDocuments = originalCount;
    }
  });

  await t.test("5. Cross-User Authorization: User A cannot mark User B's notification as read", async () => {
    const originalFindOne = Notification.findOne;
    let capturedFilter = null;

    Notification.findOne = async function (filter) {
      capturedFilter = filter;
      return null; // Simulate notification not found for userA because it belongs to userB
    };

    try {
      const notifId = new mongoose.Types.ObjectId().toString();
      const req = mockRequest({
        method: "PATCH",
        url: `/${notifId}/read`,
        params: { id: notifId },
        user: { userId: userA },
      });
      const res = mockResponse();

      const patchHandler = notificationRoutes.stack.find(
        (s) => s.route && s.route.path === "/:id/read" && s.route.methods.patch
      ).route.stack[1].handle;

      await patchHandler(req, res);

      assert.strictEqual(res.statusCode, 404, "Must return 404 when notification does not belong to user");
      assert.strictEqual(
        capturedFilter.recipient.toString(),
        userA.toString(),
        "Lookup filter must enforce recipient === req.user.userId"
      );
    } finally {
      Notification.findOne = originalFindOne;
    }
  });

  await t.test("6. Cross-User Authorization: User A cannot delete User B's notification", async () => {
    const originalFindOne = Notification.findOne;
    let capturedFilter = null;

    Notification.findOne = async function (filter) {
      capturedFilter = filter;
      return null;
    };

    try {
      const notifId = new mongoose.Types.ObjectId().toString();
      const req = mockRequest({
        method: "DELETE",
        url: `/${notifId}`,
        params: { id: notifId },
        user: { userId: userA },
      });
      const res = mockResponse();

      const deleteHandler = notificationRoutes.stack.find(
        (s) => s.route && s.route.path === "/:id" && s.route.methods.delete
      ).route.stack[1].handle;

      await deleteHandler(req, res);

      assert.strictEqual(res.statusCode, 404, "Must return 404 when notification does not belong to user");
      assert.strictEqual(
        capturedFilter.recipient.toString(),
        userA.toString(),
        "Delete filter must enforce recipient === req.user.userId"
      );
    } finally {
      Notification.findOne = originalFindOne;
    }
  });

  await t.test("7. Mark All Read strictly targets authenticated user only", async () => {
    const originalUpdateMany = Notification.updateMany;
    let capturedFilter = null;

    Notification.updateMany = async function (filter) {
      capturedFilter = filter;
      return { modifiedCount: 3 };
    };

    try {
      const req = mockRequest({
        method: "PATCH",
        url: "/read-all",
        user: { userId: userA },
      });
      const res = mockResponse();

      const readAllHandler = notificationRoutes.stack.find(
        (s) => s.route && s.route.path === "/read-all" && s.route.methods.patch
      ).route.stack[1].handle;

      await readAllHandler(req, res);

      assert.strictEqual(res.statusCode, 200);
      assert.strictEqual(
        capturedFilter.recipient.toString(),
        userA.toString(),
        "updateMany must target recipient === req.user.userId only"
      );
      assert.strictEqual(capturedFilter.isRead, false, "updateMany must target unread notifications only");
    } finally {
      Notification.updateMany = originalUpdateMany;
    }
  });
});
