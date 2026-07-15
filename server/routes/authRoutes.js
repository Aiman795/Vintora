import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import { sendWelcomeEmail } from "../services/emailService.js";

const router = express.Router();

function signToken(id) {
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: "7d" });
}

function publicUser(user) {
  return {
    id: user._id,
    name: user.name,
    email: user.email,
    role: user.role || "buyer",
    accountStatus: user.accountStatus,
    verificationStatus: user.verificationStatus,
    emailVerified: user.emailVerified
  };
}

router.post("/register", async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    if (!name || !email || !password || !role) {
      return res.status(400).json({ message: "Name, email, password, and role are required." });
    }

    if (!["buyer", "seller", "admin"].includes(role)) {
      return res.status(400).json({ message: "Role must be buyer, seller, or admin." });
    }

    if (role === "admin" && (!process.env.ADMIN_INVITE_CODE || req.body.adminInviteCode !== process.env.ADMIN_INVITE_CODE)) {
      return res.status(403).json({ message: "Admin registration requires a valid invite code." });
    }

    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(409).json({ message: "An account with this email already exists." });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    // Email verification disabled for demo purposes — account is verified immediately on creation.
    const user = await User.create({
      name,
      email: email.toLowerCase(),
      password: hashedPassword,
      role,
      emailVerified: true,
      emailVerificationCode: "",
      emailVerificationExpires: null
    });

    // Try to send a welcome email, but never let this block registration/login.
    try {
      sendWelcomeEmail({ name: user.name, email: user.email });
    } catch (emailError) {
      console.error("Welcome email failed (non-blocking):", emailError.message);
    }

    // Log the user in immediately since no verification step is required.
    res.status(201).json({
      requiresVerification: false,
      token: signToken(user._id),
      user: publicUser(user)
    });
  } catch (error) {
    res.status(500).json({ message: "Unable to register user.", error: error.message });
  }
});

// Kept as a no-op endpoint in case the frontend still calls it anywhere —
// it just confirms the account is verified (which it always is now).
router.post("/verify-email", async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: "Email is required." });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(404).json({ message: "Account not found." });
    }

    if (!user.emailVerified) {
      user.emailVerified = true;
      await user.save();
    }

    res.json({ token: signToken(user._id), user: publicUser(user) });
  } catch (error) {
    res.status(500).json({ message: "Unable to verify email.", error: error.message });
  }
});

// Kept as a no-op endpoint for compatibility — verification is no longer required.
router.post("/resend-verification", async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ message: "Email is required." });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(404).json({ message: "Account not found." });
    }

    res.json({ message: "Email verification is not required." });
  } catch (error) {
    res.status(500).json({ message: "Unable to process request.", error: error.message });
  }
});

router.post("/login", async (req, res) => {
  try {
    console.log("Login attempt:", req.body.email);
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required." });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(401).json({ message: "Invalid email or password." });
    }

    if (["Blocked", "Suspended"].includes(user.accountStatus)) {
      return res.status(403).json({ message: `Your account is ${user.accountStatus.toLowerCase()}. Contact Vintora support.` });
    }

    // Email verification check removed — no longer blocks login.

    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      return res.status(401).json({ message: "Invalid email or password." });
    }

    res.json({
      token: signToken(user._id),
      user: publicUser(user)
    });
  } catch (error) {
    console.error("Login error:", error.message);
    res.status(500).json({ message: "Unable to log in.", error: error.message });
  }
});

export default router;