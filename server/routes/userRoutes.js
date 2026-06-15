import express from "express";
import bcrypt from "bcryptjs";
import { protect } from "../middleware/auth.js";
import User from "../models/User.js";

const router = express.Router();

router.get("/profile", protect, async (req, res) => {
  const populatedUser = await req.user.populate("wishlist", "title price type pricingModel city size rating reviewCount availabilityStatus imageUrls imageEmoji imageToneClass");
  res.json(populatedUser);
});

router.put("/profile", protect, async (req, res) => {
  try {
    const { name, currentPassword, newPassword } = req.body;

    const user = await User.findById(req.user._id);

    if (name && name.trim()) {
      user.name = name.trim();
    }

    if (newPassword) {
      if (!currentPassword) {
        return res.status(400).json({ message: "Current password is required to set a new password." });
      }
      const match = await bcrypt.compare(currentPassword, user.password);
      if (!match) {
        return res.status(401).json({ message: "Current password is incorrect." });
      }
      user.password = await bcrypt.hash(newPassword, 10);
    }

    await user.save();

    res.json({
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      accountStatus: user.accountStatus,
      verificationStatus: user.verificationStatus
    });
  } catch (error) {
    res.status(500).json({ message: "Unable to update profile.", error: error.message });
  }
});

export default router;