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

function emitUserNotification(req, userId, notification) {
  const io = req.app.get("io");
  io.to(`user_${userId.toString()}`).emit("receive_notification", notification);
}

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
      .populate("lastModeratedBy", "name email role")
      .sort({ createdAt: -1 });

    res.json(listings);
  } catch (error) {
    res.status(500).json({ message: "Unable to load listings.", error: error.message });
  }
});

router.put("/listings/:id/approve", async (req, res) => {
  try {
    const listing = await Listing.findById(req.params.id).populate("owner", "name email role");

    if (!listing) {
      return res.status(404).json({ message: "Listing not found." });
    }

    listing.status = "Live";
    listing.rejectionReason = "";
    listing.lastModeratedBy = req.user._id;
    listing.lastModeratedAt = new Date();
    listing.moderationHistory.push({
      action: "approved",
      actor: req.user._id,
      actorRole: req.user.role,
      reason: req.body.note || ""
    });
    await listing.save();

    sendListingApprovedEmail({
      sellerEmail: listing.owner.email,
      sellerName: listing.owner.name,
      itemTitle: listing.title
    });

    const notification = await Notification.create({
      user: listing.owner._id,
      sender: req.user._id,
      type: "system",
      title: "Listing approved",
      message: `${listing.title} is now live on Vintora.`
    });

    const populatedNotification = await Notification.findById(notification._id)
      .populate("sender", "name email");

    emitUserNotification(req, listing.owner._id, populatedNotification);
    res.json(listing);
  } catch (error) {
    res.status(500).json({ message: "Unable to approve listing.", error: error.message });
  }
});

router.put("/listings/:id/reject", async (req, res) => {
  try {
    const cleanReason = (req.body.reason || "").trim();

    if (cleanReason.length < 8) {
      return res.status(400).json({ message: "Please provide a clear rejection reason for the seller." });
    }

    const listing = await Listing.findById(req.params.id).populate("owner", "name email role");

    if (!listing) {
      return res.status(404).json({ message: "Listing not found." });
    }

    listing.status = "Archived";
    listing.rejectionReason = cleanReason;
    listing.lastModeratedBy = req.user._id;
    listing.lastModeratedAt = new Date();
    listing.moderationHistory.push({
      action: "rejected",
      actor: req.user._id,
      actorRole: req.user.role,
      reason: cleanReason
    });
    await listing.save();

    const notification = await Notification.create({
      user: listing.owner._id,
      sender: req.user._id,
      type: "system",
      title: "Listing needs changes",
      message: `${listing.title} was not approved: ${cleanReason}`
    });

    const populatedNotification = await Notification.findById(notification._id)
      .populate("sender", "name email");

    emitUserNotification(req, listing.owner._id, populatedNotification);
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

    await Notification.create({
      user: user._id,
      sender: req.user._id,
      type: "system",
      title: "Role updated",
      message: `Your Vintora role is now ${role}.`
    });

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

    await Notification.create({
      user: user._id,
      sender: req.user._id,
      type: "system",
      title: "Account status updated",
      message: `Your account status is now ${accountStatus}.`
    });

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

    await Notification.create({
      user: user._id,
      sender: req.user._id,
      type: "system",
      title: "Verification updated",
      message: verificationNote || `Your verification status is now ${verificationStatus}.`
    });

    res.json(user);
  } catch (error) {
    res.status(500).json({ message: "Unable to update verification.", error: error.message });
  }
});

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

    const recipients = [dispute.raisedBy?._id, dispute.againstUser?._id].filter(Boolean);
    const notifications = await Promise.all(recipients.map((userId) => Notification.create({
      user: userId,
      sender: req.user._id,
      booking: dispute.booking?._id || null,
      type: "system",
      title: "Dispute resolved",
      message: dispute.resolution || "Your dispute has been resolved by admin."
    })));

    const populatedNotifications = await Notification.find({ _id: { $in: notifications.map((item) => item._id) } })
      .populate("sender", "name email")
      .populate("booking", "_id status");

    populatedNotifications.forEach((notification) => {
      emitUserNotification(req, notification.user, notification);
    });

    res.json(dispute);
  } catch (error) {
    res.status(500).json({ message: "Unable to resolve dispute.", error: error.message });
  }
});

export default router;
