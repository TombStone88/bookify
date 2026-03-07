const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config();

const http = require("http");
const { Server } = require("socket.io");

const userRoutes = require("./routes/userRoutes");
const clubRoutes = require("./routes/club");
const authRoutes = require("./routes/auth");
const authMiddleware = require("./middleware/authMiddleware");
const bookRoutes = require("./routes/book");
const messageRoutes = require("./routes/message");

const dns = require("dns");
const path = require("path");

dns.setServers(["8.8.8.8", "8.8.4.4"]);
dns.setDefaultResultOrder("ipv4first");

const app = express();
const server = http.createServer(app);

// SOCKET.IO
const io = new Server(server, {
  cors: {
    origin: "*"
  }
});

// SOCKET EVENTS
io.on("connection", (socket) => {

  console.log("User connected:", socket.id);

  socket.on("joinClub", (clubId) => {
    socket.join(clubId);
    console.log("User joined club:", clubId);
  });

  socket.on("sendMessage", (data) => {
    io.to(data.clubId).emit("receiveMessage", data);
  });

  socket.on("disconnect", () => {
    console.log("User disconnected");
  });

});

// Middlewares
app.use(cors());
app.use(express.json());

app.use("/uploads", express.static(path.join(__dirname, "uploads")));

app.use("/api/messages", messageRoutes);
app.use("/api/users", userRoutes);
app.use("/api/clubs", clubRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/books", bookRoutes);

// Protected Route
app.get("/api/protected", authMiddleware, (req, res) => {
  res.json({
    message: "You accessed protected route 🔐",
    user: req.user
  });
});

// Root Route
app.get("/", (req, res) => {
  res.send("Book Club API is running 🚀");
});

// MongoDB Connection
mongoose.connect(process.env.MONGO_URI)
.then(() => console.log("MongoDB Connected ✅"))
.catch(err => console.log("Mongo Error:", err));

const PORT = process.env.PORT || 5000;

// IMPORTANT: server.listen instead of app.listen
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});