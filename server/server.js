const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config();

const http = require("http");
const { Server } = require("socket.io");
const path = require("path");
const fs = require("fs");

// ── ENSURE UPLOAD DIRECTORIES EXIST ─────────────────────────
// Prevents multer ENOENT errors on first deploy / fresh containers
["uploads", "uploads/covers", "uploads/profile"].forEach((dir) => {
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

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  socket.on("joinClub", (clubId) => {
    socket.join(clubId);
  });

  socket.on("sendMessage", (data) => {
    socket.to(data.clubId).emit("receiveMessage", data);
  });

  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
  });
});

// ── MIDDLEWARES ───────────────────────────────────────────
app.use(express.json());
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// ── ROUTES ────────────────────────────────────────────────
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/clubs", clubRoutes);
app.use("/api/books", bookRoutes);
app.use("/api/messages", messageRoutes);

app.get("/api/protected", authMiddleware, (req, res) => {
  res.json({ message: "Protected route 🔐", user: req.user });
});

app.get("/", (req, res) => {
  res.send("Bookify API is running 🚀");
});

// ── MONGODB ───────────────────────────────────────────────
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB Connected ✅"))
  .catch((err) => console.error("MongoDB Error:", err));

// ── START ─────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT} 🚀`);
});
