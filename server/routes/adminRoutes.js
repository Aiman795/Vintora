import express from "express";
import Listing from "../models/Listing.js";
import User from "../models/User.js";
import Dispute from "../models/Dispute.js";
import Notification from "../models/Notification.js";
import Booking from "../models/Booking.js";
import Message from "../models/Message.js";
import Review from "../models/Review.js";
import { protect, requireRole } from "../middleware/auth.js";
import { sendListingApprovedEmail } from "../services/emailService.js";

const router = express.Router();

router.use(protect, requireRole("admin"));

router.get("/summary", async (_req, res) => {
  try {
    const [pendingListings, liveListings, archivedListings, users, openDisputes, bookings, reviews] = await Promise.all([
      Listing.countDocuments({ status: "Pending Approval" }),
      Listing.countDocuments({ status: "Live" }),
      Listing.countDocuments({ status: "Archived" }),
      User.countDocuments(),
      Dispute.countDocuments({ status: { $ne: "resolved" } }),
      Booking.countDocuments(),
      Review.countDocuments()
    ]);

    res.json({ pendingListings, liveListings, archivedListings, users, openDisputes, bookings, reviews });
  } catch (error) {
    res.status(500).json({ message: "Unable to load admin summary.", error: error.message });
  }
});

router.get("/listings", async (req, res) => {
  try {
    const status = req.query.status || "Pending Approval";
    const query = status === "all" ? {} : { status };
    const listings = await Listing.find(query)
      .populate("owner", "name email role")
      .sort({ createdAt: -1 });

    res.json(listings);
  } catch (error) {
    res.status(500).json({ message: "Unable to load listings.", error: error.message });
  }
});

router.put("/listings/:id/approve", async (req, res) => {
  try {
    const listing = await Listing.findByIdAndUpdate(
      req.params.id,
      { status: "Live" },
      { new: true, runValidators: true }
    ).populate("owner", "name email role");

    if (!listing) {
      router.put("/listings/:id/approve", async (req, res) => {
  try {
    const listing = await Listing.findByIdAndUpdate(
      req.params.id,
      { status: "Live" },
      { new: true, runValidators: true }
    ).populate("owner", "name email role");

    if (!listing) {
      return res.status(404).json({ message: "Listing not found." });
    }

    // ── Notify seller their listing is live ──────────────────────────────
    sendListingApprovedEmail({
      sellerEmail: listing.owner.email,
      sellerName: listing.owner.name,
      itemTitle: listing.title
    });
    // ─────────────────────────────────────────────────────────────────────

    res.json(listing);
  } catch (error) {
    res.status(500).json({ message: "Unable to approve listing.", error: error.message });
  }
});
      return res.status(404).json({ message: "Listing not found." });
    }

    res.json(listing);
  } catch (error) {
    res.status(500).json({ message: "Unable to approve listing.", error: error.message });
  }
});

router.put("/listings/:id/reject", async (req, res) => {
  try {
    const listing = await Listing.findByIdAndUpdate(
      req.params.id,
      { status: "Archived" },
      { new: true, runValidators: true }
    ).populate("owner", "name email role");

    if (!listing) {
      return res.status(404).json({ message: "Listing not found." });
    }

    res.json(listing);
  } catch (error) {
    res.status(500).json({ message: "Unable to reject listing.", error: error.message });
  }
});

router.get("/users", async (_req, res) => {
  try {
    const users = await User.find().select("-password").sort({ createdAt: -1 });
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: "Unable to load users.", error: error.message });
  }
});

router.put("/users/:id/role", async (req, res) => {
  try {
    const { role } = req.body;
    if (!["buyer", "seller", "admin"].includes(role)) {
      return res.status(400).json({ message: "Invalid role." });
    }

    const user = await User.findByIdAndUpdate(req.params.id, { role }, { new: true, runValidators: true }).select("-password");
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    res.json(user);
  } catch (error) {
    res.status(500).json({ message: "Unable to update user role.", error: error.message });
  }
});

router.put("/users/:id/status", async (req, res) => {
  try {
    const { accountStatus } = req.body;
    if (!["Active", "Pending", "Blocked", "Suspended"].includes(accountStatus)) {
      return res.status(400).json({ message: "Invalid account status." });
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { accountStatus, lastStatusChangeAt: new Date() },
      { new: true, runValidators: true }
    ).select("-password");

    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    res.json(user);
  } catch (error) {
    res.status(500).json({ message: "Unable to update user status.", error: error.message });
  }
});

router.put("/users/:id/verification", async (req, res) => {
  try {
    const { verificationStatus, verificationNote } = req.body;
    if (!["Unverified", "Pending", "Verified", "Rejected"].includes(verificationStatus)) {
      return res.status(400).json({ message: "Invalid verification status." });
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { verificationStatus, verificationNote: verificationNote || "" },
      { new: true, runValidators: true }
    ).select("-password");

    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    res.json(user);
  } catch (error) {
    res.status(500).json({ message: "Unable to update verification.", error: error.message });
  }
});

// ── Bookings (admin oversight) ────────────────────────────────────────────
router.get("/bookings", async (req, res) => {
  try {
    const status = req.query.status;
    const query = status && status !== "all" ? { status } : {};

    const bookings = await Booking.find(query)
      .populate("listing", "title category occasion price imageUrls")
      .populate("buyer", "name email")
      .populate("seller", "name email")
      .sort({ createdAt: -1 });

    res.json(bookings);
  } catch (error) {
    res.status(500).json({ message: "Unable to load bookings.", error: error.message });
  }
});

router.get("/disputes", async (_req, res) => {
  try {
    const disputes = await Dispute.find()
      .populate("raisedBy", "name email role")
      .populate("againstUser", "name email role")
      .populate("listing", "title")
      .populate("booking", "status totalAmount")
      .sort({ createdAt: -1 });

    res.json(disputes);
  } catch (error) {
    res.status(500).json({ message: "Unable to load disputes.", error: error.message });
  }
});

router.get("/disputes/:id/evidence", async (req, res) => {
  try {
    const dispute = await Dispute.findById(req.params.id)
      .populate("raisedBy", "name email role")
      .populate("againstUser", "name email role")
      .populate("listing", "title imageEmoji")
      .populate({
        path: "booking",
        populate: [
          { path: "buyer", select: "name email role" },
          { path: "seller", select: "name email role" },
          { path: "listing", select: "title imageEmoji" }
        ]
      });

    if (!dispute) {
      return res.status(404).json({ message: "Dispute not found." });
    }

    const userIds = [dispute.raisedBy?._id, dispute.againstUser?._id].filter(Boolean);
    const [messages, reviews] = await Promise.all([
      Message.find({ sender: { $in: userIds }, receiver: { $in: userIds } })
        .populate("sender", "name email")
        .populate("receiver", "name email")
        .sort({ createdAt: -1 })
        .limit(50),
      Review.find({
        $or: [
          { booking: dispute.booking?._id },
          { listing: dispute.listing?._id }
        ]
      })
        .populate("reviewer", "name email")
        .populate("seller", "name email")
        .sort({ createdAt: -1 })
    ]);

    res.json({ dispute, booking: dispute.booking, messages, reviews });
  } catch (error) {
    res.status(500).json({ message: "Unable to load dispute evidence.", error: error.message });
  }
});

router.put("/disputes/:id/resolve", async (req, res) => {
  try {
    const dispute = await Dispute.findByIdAndUpdate(
      req.params.id,
      {
        status: "resolved",
        resolution: req.body.resolution || "Resolved by admin.",
        resolvedBy: req.user._id,
        resolvedAt: new Date()
      },
      { new: true, runValidators: true }
    )
      .populate("raisedBy", "name email role")
      .populate("againstUser", "name email role")
      .populate("listing", "title")
      .populate("booking", "status totalAmount");

    if (!dispute) {
      return res.status(404).json({ message: "Dispute not found." });
    }

    const notification = await Notification.create({
      user: dispute.raisedBy._id,
      sender: req.user._id,
      booking: dispute.booking?._id || null,
      type: "system",
      title: "Dispute resolved",
      message: dispute.resolution || "Your dispute has been resolved by admin."
    });

    const populatedNotification = await Notification.findById(notification._id)
      .populate("sender", "name email")
      .populate("booking", "_id status");

    const io = req.app.get("io");
    io.to(`user_${dispute.raisedBy._id.toString()}`).emit("receive_notification", populatedNotification);

    res.json(dispute);
  } catch (error) {
    res.status(500).json({ message: "Unable to resolve dispute.", error: error.message });
  }
});

export default router;