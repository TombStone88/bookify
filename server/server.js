const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config();

const clubRoutes = require("./routes/club");
const authRoutes = require("./routes/auth");
const authMiddleware = require("./middleware/authMiddleware");
const bookRoutes = require("./routes/book");
const messageRoutes = require("./routes/message");

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());

app.use("/api/messages", messageRoutes);

//club routes
app.use("/api/clubs", clubRoutes);

// Routes
app.use("/api/auth", authRoutes);

//Book routes
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
mongoose.connect(process.env.MONGO_URI, { family: 4 })
  .then(() => console.log("MongoDB Connected ✅"))
  .catch((err) => console.log("Mongo Error:", err));

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});