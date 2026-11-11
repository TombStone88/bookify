const dns = require("dns");
const path = require("path");

// Configure DNS resolvers for reliable SRV resolution (prevents querySrv ECONNREFUSED on Jio/local resolvers)
try {
  dns.setServers(["8.8.8.8", "1.1.1.1"]);
} catch (e) {
  console.warn("DNS server configuration warning:", e.message);
}

// Preserve OS verbatim DNS result ordering (allows IPv6/NAT64 resolution on Jio/mobile/fiber networks)
// Prevents ERR_SSL_TLSV1_ALERT_INTERNAL_ERROR (SSL alert number 80) caused by forcing IPv4 to Atlas
if (typeof dns.setDefaultResultOrder === "function") {
  dns.setDefaultResultOrder("verbatim");
}

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const fs = require("fs");

// Load .env from server directory (with fallback to cwd)
const envPath = fs.existsSync(path.join(__dirname, ".env"))
  ? path.join(__dirname, ".env")
  : undefined;
require("dotenv").config({ path: envPath });

const http = require("http");
const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");
const Book = require("./models/Book");
const Club = require("./models/Club");

// ── ENSURE UPLOAD DIRECTORIES EXIST ─────────────────────────
// Prevents multer ENOENT errors on first deploy / fresh containers
["uploads", "uploads/covers", "uploads/profile", "uploads/cache"].forEach((dir) => {
  const fullPath = path.join(__dirname, dir);
  if (!fs.existsSync(fullPath)) {
    fs.mkdirSync(fullPath, { recursive: true });
  }
});

const userRoutes = require("./routes/userRoutes");
const clubRoutes = require("./routes/club");
const authRoutes = require("./routes/auth");
const authMiddleware = require("./middleware/authMiddleware");
const bookRoutes = require("./routes/book");
const messageRoutes = require("./routes/message");
const notificationRoutes = require("./routes/notification");
const imageRoutes = require("./routes/imageRoutes");

const app = express();
const server = http.createServer(app);

// ── CORS ──────────────────────────────────────────────────
const allowedOrigins = [
  "http://localhost:3000",
  process.env.CLIENT_URL, // set this on Render to your Vercel URL
].filter(Boolean);

app.use(
  cors({
    origin: function (origin, callback) {
      // Allow requests with no origin (mobile apps, curl, Postman)
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin) || allowedOrigins.includes("*")) {
        return callback(null, true);
      }
      return callback(null, true); // permissive for now — lock down after deploy
    },
    credentials: true,
  })
);

// ── SOCKET.IO ─────────────────────────────────────────────
const io = new Server(server, {
  cors: { origin: "*", methods: ["GET", "POST"] },
});

// Make io accessible throughout Express controllers
app.set("io", io);

// Authenticate socket connections with JWT
io.use((socket, next) => {
  const token =
    socket.handshake.auth?.token ||
    (socket.handshake.headers?.authorization
      ? socket.handshake.headers.authorization.split(" ")[1]
      : null) ||
    socket.handshake.query?.token;

  if (!token) {
    return next(new Error("Authentication error: Token required"));
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    socket.user = decoded;
    next();
  } catch (err) {
    return next(new Error("Authentication error: Invalid token"));
  }
});

io.on("connection", (socket) => {
  // Join authenticated user to their isolated private notification room
  if (socket.user && socket.user.userId) {
    socket.join(`user:${socket.user.userId}`);
  }
  socket.on("joinClub", async (clubId) => {
    try {
      if (!clubId || !mongoose.isValidObjectId(clubId)) {
        return socket.emit("error", { message: "Invalid club ID" });
      }
      const isMember = await Club.exists({
        _id: clubId,
        $or: [{ members: socket.user.userId }, { admin: socket.user.userId }],
      });
      if (isMember) {
        socket.join(clubId);
      } else {
        socket.emit("error", { message: "Access denied. You are not a member of this club." });
      }
    } catch (err) {
      socket.emit("error", { message: "Failed to join club room" });
    }
  });

  socket.on("sendMessage", async (data) => {
    try {
      if (!data || !data.clubId || !mongoose.isValidObjectId(data.clubId)) {
        return;
      }
      const isMember = await Club.exists({
        _id: data.clubId,
        $or: [{ members: socket.user.userId }, { admin: socket.user.userId }],
      });
      if (!isMember) {
        return socket.emit("error", { message: "Access denied. You are not a member of this club." });
      }
      socket.to(data.clubId).emit("receiveMessage", data);
    } catch (err) {
      socket.emit("error", { message: "Failed to broadcast message" });
    }
  });

  socket.on("disconnect", () => {});
});

// ── MIDDLEWARES ───────────────────────────────────────────
app.use(express.json());

// Public static assets with immutable HTTP caching (covers, profile avatars, optimized cache)
const staticImageOptions = {
  maxAge: "30d",
  immutable: true,
  etag: true,
  lastModified: true,
  setHeaders: (res) => {
    res.setHeader("Cache-Control", "public, max-age=2592000, immutable");
  },
};
app.use("/uploads/profile", express.static(path.join(__dirname, "uploads/profile"), staticImageOptions));
app.use("/uploads/covers", express.static(path.join(__dirname, "uploads/covers"), staticImageOptions));
app.use("/uploads/cache", express.static(path.join(__dirname, "uploads/cache"), staticImageOptions));

// Protected static file streaming for book PDFs
app.get("/uploads/:filename", async (req, res) => {
  try {
    const filename = req.params.filename;
    // Reject path traversal attempts
    if (filename.includes("..") || filename.includes("/") || filename.includes("\\")) {
      return res.status(400).json({ error: "Invalid filename" });
    }

    // Read token from Authorization header or query parameter
    const authHeader = req.headers.authorization;
    const token =
      (authHeader && authHeader.startsWith("Bearer ") ? authHeader.split(" ")[1] : null) ||
      req.query.token;

    if (!token) {
      return res.status(401).json({ error: "Unauthorized. Authentication token required." });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      return res.status(401).json({ error: "Unauthorized. Invalid token." });
    }

    // Locate the book associated with this file
    const escapedFilename = filename.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&");
    const book = await Book.findOne({
      fileUrl: { $regex: new RegExp(`${escapedFilename}$`) },
    });

    if (!book) {
      return res.status(404).json({ error: "File not found" });
    }

    // Authorize access
    if (book.clubId) {
      const isMember = await Club.exists({
        _id: book.clubId,
        $or: [{ members: decoded.userId }, { admin: decoded.userId }],
      });
      if (!isMember) {
        return res.status(403).json({ error: "Access denied. You are not a member of this club." });
      }
    } else {
      if (!book.uploadedBy || book.uploadedBy.toString() !== decoded.userId.toString()) {
        return res.status(403).json({ error: "Access denied. You do not own this book." });
      }
    }

    const filePath = path.join(__dirname, "uploads", filename);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: "File not found on disk" });
    }

    res.sendFile(filePath);
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
});

// ── ROUTES ────────────────────────────────────────────────
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/clubs", clubRoutes);
app.use("/api/books", bookRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/images", imageRoutes);

app.get("/api/protected", authMiddleware, (req, res) => {
  res.json({ message: "Protected route 🔐", user: req.user });
});

app.get("/", (req, res) => {
  res.send("Bookify API is running 🚀");
});

// ── MONGODB & SERVER INITIALIZATION ───────────────────────
const PORT = process.env.PORT || 5000;

async function startServer() {
  try {
    if (!process.env.MONGO_URI) {
      throw new Error("MONGO_URI environment variable is not defined");
    }
    await mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 10000,
    });
    console.log("MongoDB Connected ✅");
  } catch (err) {
    console.error("MongoDB Connection Error ❌:", err.message);
    process.exit(1);
  }

  // Handle connection events during runtime
  mongoose.connection.on("error", (err) => {
    console.error("MongoDB Runtime Error ❌:", err.message);
  });

  mongoose.connection.on("disconnected", () => {
    if (mongoose.connection.readyState === 0) {
      console.warn("MongoDB disconnected. Waiting for reconnection...");
    }
  });

  mongoose.connection.on("reconnected", () => {
    console.log("MongoDB Reconnected ✅");
  });

  server.listen(PORT, () => {
    console.log(`Server running on port ${PORT} 🚀`);
  });
}

startServer();

