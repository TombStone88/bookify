const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { OAuth2Client } = require("google-auth-library");
const User = require("../models/User");
const { authRateLimiter } = require("../middleware/rateLimiter");

const router = express.Router();

let googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// ── 1. REGISTRATION ROUTE ─────────────────────────────────────
router.post("/register", authRateLimiter, async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ message: "Name is required." });
    }
    if (!email || !email.trim()) {
      return res.status(400).json({ message: "Email is required." });
    }
    if (!password || password.length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters long." });
    }

    const normalizedEmail = email.toLowerCase().trim();

    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      return res.status(400).json({ message: "User already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = new User({
      username: name.trim(),
      email: normalizedEmail,
      password: hashedPassword,
      authProvider: "local",
    });

    await newUser.save();

    res.status(201).json({ message: "User registered successfully" });
  } catch (error) {
    console.error("Registration error:", error.message);
    res.status(500).json({ error: "An internal server error occurred." });
  }
});

// ── 2. LOGIN ROUTE ────────────────────────────────────────────
router.post("/login", authRateLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required." });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Check if user exists
    const user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      return res.status(400).json({ message: "User not found" });
    }

    // Check if user signed up with Google without setting a password
    if (!user.password) {
      return res.status(400).json({
        message: "This account was created with Google. Please use 'Sign in with Google' to access your account.",
      });
    }

    // Compare password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    // Generate JWT token
    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, {
      expiresIn: "1h",
    });

    res.status(200).json({
      message: "Login successful",
      token,
      user: {
        _id: user._id,
        username: user.username,
        email: user.email,
        profileImage: user.profileImage,
      },
    });
  } catch (error) {
    console.error("Login error:", error.message);
    res.status(500).json({ error: "An internal server error occurred." });
  }
});

// ── 3. GOOGLE SIGN-IN & ACCOUNT LINKING ROUTE ────────────────
router.post("/google", authRateLimiter, async (req, res) => {
  try {
    const { idToken, credential } = req.body;
    const tokenToVerify = idToken || credential;

    if (!tokenToVerify || typeof tokenToVerify !== "string" || !tokenToVerify.trim()) {
      return res.status(400).json({ message: "Google ID token is required." });
    }

    const clientId = process.env.GOOGLE_CLIENT_ID;
    if (!clientId) {
      console.error("GOOGLE_CLIENT_ID is not configured in server environment.");
      return res.status(500).json({
        error: "Google authentication is not properly configured on the server.",
      });
    }

    // Cryptographic validation of signature, issuer, audience, and expiration
    let payload;
    try {
      const ticket = await googleClient.verifyIdToken({
        idToken: tokenToVerify,
        audience: clientId,
      });
      payload = ticket.getPayload();
    } catch (verifyErr) {
      console.error("Google token verification failed:", verifyErr.message);
      return res.status(401).json({ message: "Invalid or expired Google token." });
    }

    if (!payload || !payload.sub || !payload.email) {
      return res.status(400).json({ message: "Malformed Google token claims." });
    }

    // Validate Issuer
    if (
      payload.iss !== "accounts.google.com" &&
      payload.iss !== "https://accounts.google.com"
    ) {
      return res.status(401).json({ message: "Invalid Google token issuer." });
    }

    // CRITICAL: Protect against unverified Google accounts
    // Unverified emails cannot be linked or authenticated
    if (!payload.email_verified) {
      return res.status(400).json({
        message: "Google email is not verified. Unverified accounts cannot be authenticated.",
      });
    }

    const googleId = payload.sub;
    const email = payload.email.toLowerCase().trim();
    const name = (payload.name || payload.given_name || email.split("@")[0] || "Reader").trim();
    const picture = payload.picture || "";

    let user = null;
    let isNewUser = false;
    let linked = false;

    // A. Check if user already exists with this googleId
    user = await User.findOne({ googleId });

    if (user) {
      // Existing Google user. Synchronize email if user changed their primary email in Google
      if (user.email !== email) {
        const conflict = await User.findOne({ email, _id: { $ne: user._id } });
        if (conflict) {
          return res.status(409).json({ message: "Email conflict with an existing account." });
        }
        user.email = email;
      }
      if (!user.profileImage && picture) {
        user.profileImage = picture;
      }
      await user.save();
    } else {
      // B. Check if existing user has this email (Account Linking)
      user = await User.findOne({ email });

      if (user) {
        // Safe account linking: Verify no conflicting Google identity exists
        if (user.googleId && user.googleId !== googleId) {
          return res.status(409).json({
            message: "This account is already linked to a different Google account.",
          });
        }

        // Securely link Google ID to existing account
        user.googleId = googleId;
        if (!user.profileImage && picture) {
          user.profileImage = picture;
        }

        // Crucial: Existing user._id, password hash, books, clubs, reading progress remain untouched
        await user.save();
        linked = true;
      } else {
        // C. New user registration via Google
        isNewUser = true;

        // Generate a clean, unique username
        let baseUsername = name.trim().replace(/\s+/g, "_").replace(/[^a-zA-Z0-9_]/g, "").slice(0, 20);
        if (!baseUsername || baseUsername.length < 2) {
          baseUsername = "Reader";
        }

        let uniqueUsername = baseUsername;
        let counter = 1;
        while (await User.findOne({ username: uniqueUsername })) {
          uniqueUsername = `${baseUsername}_${Math.floor(100 + Math.random() * 900)}`;
          counter++;
          if (counter > 10) {
            uniqueUsername = `${baseUsername}_${Date.now().toString().slice(-4)}`;
            break;
          }
        }

        user = new User({
          username: uniqueUsername,
          email,
          googleId,
          authProvider: "google",
          profileImage: picture,
        });

        await user.save();
      }
    }

    // Generate Bookify JWT token
    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, {
      expiresIn: "1h",
    });

    res.status(isNewUser ? 201 : 200).json({
      message: isNewUser
        ? "Account created successfully with Google"
        : linked
        ? "Google account linked successfully"
        : "Signed in successfully with Google",
      token,
      isNewUser,
      linked,
      user: {
        _id: user._id,
        username: user.username,
        email: user.email,
        profileImage: user.profileImage,
      },
    });
  } catch (error) {
    console.error("Google authentication error:", error.message);
    res.status(500).json({ error: "An internal server error occurred." });
  }
});

// Testing helper to allow injecting/resetting client in unit tests
router._setGoogleClient = (client) => {
  googleClient = client;
};
router._getGoogleClient = () => googleClient;

module.exports = router;
