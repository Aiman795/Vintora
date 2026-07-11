import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import { sendVerificationEmail, sendWelcomeEmail } from "../services/emailService.js";

const router = express.Router();

function signToken(id) {
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: "7d" });
}

function createVerificationCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
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
    const verificationCode = createVerificationCode();
    const user = await User.create({
      name,
      email: email.toLowerCase(),
      password: hashedPassword,
      role,
      emailVerified: false,
      emailVerificationCode: await bcrypt.hash(verificationCode, 10),
      emailVerificationExpires: new Date(Date.now() + 15 * 60 * 1000)
    });

    sendVerificationEmail({ name: user.name, email: user.email, code: verificationCode });

    res.status(201).json({
      requiresVerification: true,
      email: user.email,
      message: "Account created. Please verify your email with the code we sent."
    });
  } catch (error) {
    res.status(500).json({ message: "Unable to register user.", error: error.message });
  }
});

router.post("/verify-email", async (req, res) => {
  try {
    const { email, code } = req.body;

    if (!email || !code) {
      return res.status(400).json({ message: "Email and verification code are required." });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(404).json({ message: "Account not found." });
    }

    if (user.emailVerified) {
      return res.json({ token: signToken(user._id), user: publicUser(user) });
    }

    if (!user.emailVerificationCode || !user.emailVerificationExpires || user.emailVerificationExpires < new Date()) {
      return res.status(400).json({ message: "Verification code expired. Please request a new code." });
    }

    const codeMatches = await bcrypt.compare(String(code).trim(), user.emailVerificationCode);
    if (!codeMatches) {
      return res.status(400).json({ message: "Invalid verification code." });
    }

    user.emailVerified = true;
    user.emailVerificationCode = "";
    user.emailVerificationExpires = null;
    await user.save();

    sendWelcomeEmail({ name: user.name, email: user.email });

    res.json({ token: signToken(user._id), user: publicUser(user) });
  } catch (error) {
    res.status(500).json({ message: "Unable to verify email.", error: error.message });
  }
});

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
    if (user.emailVerified) {
      return res.json({ message: "Email is already verified." });
    }

    const verificationCode = createVerificationCode();
    user.emailVerificationCode = await bcrypt.hash(verificationCode, 10);
    user.emailVerificationExpires = new Date(Date.now() + 15 * 60 * 1000);
    await user.save();

    sendVerificationEmail({ name: user.name, email: user.email, code: verificationCode });
    res.json({ message: "A new verification code has been sent." });
  } catch (error) {
    res.status(500).json({ message: "Unable to resend verification code.", error: error.message });
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

    if (!user.emailVerified) {
      return res.status(403).json({
        message: "Please verify your email before logging in.",
        requiresVerification: true,
        email: user.email
      });
    }

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
