import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import { sendWelcomeEmail } from "../services/emailService.js";

const router = express.Router();

function signToken(id) {
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: "7d" });
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
    const user = await User.create({
      name,
      email: email.toLowerCase(),
      password: hashedPassword,
      role
    });

    // ── Send welcome email (non-blocking) ──────────────────────────────────
    sendWelcomeEmail({ name: user.name, email: user.email });
    // ───────────────────────────────────────────────────────────────────────

    res.status(201).json({
      token: signToken(user._id),
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        accountStatus: user.accountStatus,
        verificationStatus: user.verificationStatus
      }
    });
  } catch (error) {
    res.status(500).json({ message: "Unable to register user.", error: error.message });
  }
});

router.post("/login", async (req, res) => {
  try {
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

    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      return res.status(401).json({ message: "Invalid email or password." });
    }

    res.json({
      token: signToken(user._id),
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role || "buyer",
        accountStatus: user.accountStatus,
        verificationStatus: user.verificationStatus
      }
    });
  } catch (error) {
    res.status(500).json({ message: "Unable to log in.", error: error.message });
  }
});

export default router;