import express from "express";
import { protect } from "../middleware/auth.js";
import Booking from "../models/Booking.js";
import Dispute from "../models/Dispute.js";
import Notification from "../models/Notification.js";
import User from "../models/User.js";

const router = express.Router();

router.get("/mine", protect, async (req, res) => {
  try {
    const disputes = await Dispute.find({
      $or: [{ raisedBy: req.user._id }, { againstUser: req.user._id }]
    })
      .populate("booking", "status totalAmount")
      .populate("listing", "title imageEmoji")
      .populate("raisedBy", "name email role")
      .populate("againstUser", "name email role")
      .sort({ createdAt: -1 });

    res.json(disputes);
  } catch (error) {
    res.status(500).json({ message: "Unable to fetch disputes.", error: error.message });
  }
});

router.post("/", protect, async (req, res) => {
  try {
    const { bookingId, reason, details } = req.body;

    if (!bookingId || !reason) {
      return res.status(400).json({ message: "bookingId and reason are required." });
    }

    const booking = await Booking.findById(bookingId)
      .populate("listing", "title")
      .populate("buyer", "name email role")
      .populate("seller", "name email role");

    if (!booking) {
      return res.status(404).json({ message: "Booking not found." });
    }

    const userId = req.user._id.toString();
    const isBuyer = booking.buyer._id.toString() === userId;
    const isSeller = booking.seller._id.toString() === userId;

    if (!isBuyer && !isSeller) {
      return res.status(403).json({ message: "You can only dispute bookings you are part of." });
    }

    const existingOpenDispute = await Dispute.findOne({
      booking: booking._id,
      raisedBy: req.user._id,
      status: { $ne: "resolved" }
    });

    if (existingOpenDispute) {
      return res.status(409).json({ message: "You already have an open dispute for this booking." });
    }

    const againstUser = isBuyer ? booking.seller._id : booking.buyer._id;
    const dispute = await Dispute.create({
      booking: booking._id,
      listing: booking.listing?._id || null,
      raisedBy: req.user._id,
      againstUser,
      reason,
      details: details || ""
    });

    const admins = await User.find({ role: "admin" }).select("_id");
    await Promise.all(
      admins.map((admin) =>
        Notification.create({
          user: admin._id,
          sender: req.user._id,
          booking: booking._id,
          type: "dispute",
          title: "New dispute filed",
          message: `${req.user.name} filed a dispute for ${booking.listing?.title || "a booking"}.`
        })
      )
    );

    const populatedDispute = await Dispute.findById(dispute._id)
      .populate("booking", "status totalAmount")
      .populate("listing", "title imageEmoji")
      .populate("raisedBy", "name email role")
      .populate("againstUser", "name email role");

    res.status(201).json(populatedDispute);
  } catch (error) {
    res.status(500).json({ message: "Unable to file dispute.", error: error.message });
  }
});

export default router;
