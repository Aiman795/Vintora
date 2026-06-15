import express from "express";
import { protect } from "../middleware/auth.js";
import Booking from "../models/Booking.js";
import Listing from "../models/Listing.js";
import Notification from "../models/Notification.js";
import {
  sendBookingRequestEmail,
  sendBookingApprovedEmail,
  sendBookingRejectedEmail
} from "../services/emailService.js";

const router = express.Router();

function isOverlapping(startA, endA, startB, endB) {
  return startA <= endB && endA >= startB;
}

function addListingBookingSnapshot(listing, booking, buyerName) {
  if (booking.type !== "rent") return;
  listing.bookings.push({
    renterName: buyerName,
    startDate: booking.startDate,
    endDate: booking.endDate,
    amount: booking.amount,
    status: booking.status === "approved" ? "Confirmed" : "Pending"
  });
}

function formatDate(date) {
  if (!date) return "N/A";
  return new Date(date).toLocaleDateString("en-PK", { day: "numeric", month: "long", year: "numeric" });
}

router.get("/listing/:listingId/unavailable-dates", async (req, res) => {
  try {
    const [bookings, listing] = await Promise.all([
      Booking.find({ listing: req.params.listingId, status: "approved", type: "rent" })
        .select("startDate endDate").sort({ startDate: 1 }),
      Listing.findById(req.params.listingId).select("blockedDates")
    ]);

    const blockedDates = (listing?.blockedDates || []).map((item) => ({
      _id: item._id, startDate: item.startDate, endDate: item.endDate,
      reason: item.reason, source: "seller-block"
    }));

    res.json([
      ...bookings.map((booking) => ({ ...booking.toObject(), source: "booking" })),
      ...blockedDates
    ]);
  } catch (error) {
    res.status(500).json({ message: "Unable to fetch unavailable dates.", error: error.message });
  }
});

router.post("/", protect, async (req, res) => {
  try {
    if ((req.user.role || "buyer") !== "buyer") {
      return res.status(403).json({ message: "Only buyers can request bookings." });
    }

    const { listingId, startDate, endDate, paymentMethod, deliveryMethod, contactNote } = req.body;
    const listing = await Listing.findById(listingId).populate("owner", "name email role");

    if (!listing) return res.status(404).json({ message: "Listing not found." });
    if (!listing.owner || listing.owner._id.toString() === req.user._id.toString()) {
      return res.status(400).json({ message: "You cannot book your own listing." });
    }
    if (listing.status !== "Live") {
      return res.status(400).json({ message: "This listing is waiting for admin approval." });
    }
    if (listing.availabilityStatus === "Sold" || listing.availabilityStatus === "Out of Stock") {
      return res.status(400).json({ message: "This listing is currently not available." });
    }

    let bookingDays = 1;
    let bookingAmount = listing.price;
    let bookingStartDate = null;
    let bookingEndDate = null;
    const bookingType = listing.type === "Rent" ? "rent" : "buy";

    if (bookingType === "rent") {
      if (!startDate || !endDate) {
        return res.status(400).json({ message: "Start and end dates are required for rental bookings." });
      }
      bookingStartDate = new Date(startDate);
      bookingEndDate = new Date(endDate);

      if (Number.isNaN(bookingStartDate.getTime()) || Number.isNaN(bookingEndDate.getTime()) || bookingEndDate < bookingStartDate) {
        return res.status(400).json({ message: "Please choose valid rental dates." });
      }

      const oneDay = 1000 * 60 * 60 * 24;
      bookingDays = Math.floor((bookingEndDate - bookingStartDate) / oneDay) + 1;
      bookingAmount = bookingDays * listing.price;

      const overlappingBookings = await Booking.find({
        listing: listing._id, type: "rent", status: "approved"
      }).select("startDate endDate");

      if (overlappingBookings.some((b) => isOverlapping(bookingStartDate, bookingEndDate, b.startDate, b.endDate))) {
        return res.status(400).json({ message: "These dates are already booked for this listing." });
      }
      if ((listing.blockedDates || []).some((b) => isOverlapping(bookingStartDate, bookingEndDate, b.startDate, b.endDate))) {
        return res.status(400).json({ message: "The seller has blocked one or more selected dates." });
      }
    }

    const booking = await Booking.create({
      listing: listing._id,
      buyer: req.user._id,
      seller: listing.owner._id,
      type: bookingType,
      startDate: bookingStartDate,
      endDate: bookingEndDate,
      days: bookingDays,
      amount: bookingAmount,
      deposit: listing.deposit || 0,
      totalAmount: bookingAmount + (listing.deposit || 0),
      paymentMethod: paymentMethod || "Cash on Delivery",
      deliveryMethod: deliveryMethod || "Meetup",
      contactNote: contactNote || ""
    });

    if (bookingType === "buy") listing.availabilityStatus = "Reserved";
    addListingBookingSnapshot(listing, booking, req.user.name);
    await listing.save();

    // ── Email seller about new booking request ─────────────────────────────
    sendBookingRequestEmail({
      sellerEmail: listing.owner.email,
      sellerName: listing.owner.name,
      buyerName: req.user.name,
      itemTitle: listing.title,
      startDate: formatDate(bookingStartDate),
      endDate: formatDate(bookingEndDate),
      totalPrice: bookingAmount + (listing.deposit || 0),
    });
    // ───────────────────────────────────────────────────────────────────────

    const notification = await Notification.create({
      user: listing.owner._id,
      sender: req.user._id,
      booking: booking._id,
      type: "booking",
      title: `New booking request from ${req.user.name}`,
      message: bookingType === "rent"
        ? `${listing.title} requested for ${bookingDays} day(s).`
        : `${listing.title} has a new purchase request.`
    });

    const populatedBooking = await Booking.findById(booking._id)
      .populate("listing", "title price deposit type city availabilityStatus")
      .populate("buyer", "name email role")
      .populate("seller", "name email role");

    const populatedNotification = await Notification.findById(notification._id)
      .populate("sender", "name email")
      .populate("booking", "_id status");

    const io = req.app.get("io");
    io.to(`user_${listing.owner._id.toString()}`).emit("receive_notification", populatedNotification);

    res.status(201).json(populatedBooking);
  } catch (error) {
    res.status(500).json({ message: "Unable to create booking request.", error: error.message });
  }
});

router.get("/buyer", protect, async (req, res) => {
  try {
    const bookings = await Booking.find({ buyer: req.user._id })
      .populate("listing", "title price deposit type city imageEmoji availabilityStatus")
      .populate("seller", "name email")
      .sort({ createdAt: -1 });
    res.json(bookings);
  } catch (error) {
    res.status(500).json({ message: "Unable to fetch buyer bookings.", error: error.message });
  }
});

router.get("/seller", protect, async (req, res) => {
  try {
    const bookings = await Booking.find({ seller: req.user._id })
      .populate("listing", "title price deposit type city imageEmoji availabilityStatus")
      .populate("buyer", "name email")
      .sort({ createdAt: -1 });
    res.json(bookings);
  } catch (error) {
    res.status(500).json({ message: "Unable to fetch seller bookings.", error: error.message });
  }
});

router.get("/seller/earnings", protect, async (req, res) => {
  try {
    const approvedBookings = await Booking.find({
      seller: req.user._id, status: { $in: ["approved", "completed"] }
    }).populate("listing", "title");

    const totalEarnings = approvedBookings.reduce((sum, b) => sum + b.amount, 0);
    const currentMonth = new Date();
    const monthlyEarnings = approvedBookings
      .filter((b) => b.createdAt.getMonth() === currentMonth.getMonth() && b.createdAt.getFullYear() === currentMonth.getFullYear())
      .reduce((sum, b) => sum + b.amount, 0);

    const pendingRequests = await Booking.countDocuments({ seller: req.user._id, status: "pending" });

    const byListing = new Map();
    approvedBookings.forEach((b) => {
      const title = b.listing?.title || "Listing";
      byListing.set(title, (byListing.get(title) || 0) + b.amount);
    });

    const topListings = Array.from(byListing.entries())
      .map(([title, amount]) => ({ title, amount }))
      .sort((a, b) => b.amount - a.amount).slice(0, 5);

    res.json({ totalEarnings, monthlyEarnings, approvedCount: approvedBookings.length, pendingRequests, topListings });
  } catch (error) {
    res.status(500).json({ message: "Unable to fetch earnings.", error: error.message });
  }
});

router.put("/:id/approve", protect, async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id)
      .populate("listing")
      .populate("buyer", "name email role")
      .populate("seller", "name email role");

    if (!booking) return res.status(404).json({ message: "Booking not found." });
    if (booking.seller._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Only the seller can approve this booking." });
    }
    if (booking.status !== "pending") {
      return res.status(400).json({ message: "Only pending bookings can be approved." });
    }

    if (booking.type === "rent") {
      const overlapping = await Booking.find({
        _id: { $ne: booking._id }, listing: booking.listing._id, type: "rent", status: "approved"
      }).select("startDate endDate");

      if (overlapping.some((b) => isOverlapping(booking.startDate, booking.endDate, b.startDate, b.endDate))) {
        return res.status(400).json({ message: "These dates were already approved for another booking." });
      }
      if ((booking.listing.blockedDates || []).some((b) => isOverlapping(booking.startDate, booking.endDate, b.startDate, b.endDate))) {
        return res.status(400).json({ message: "These dates are blocked by the seller calendar." });
      }
    }

    booking.status = "approved";
    await booking.save();

    if (booking.type === "buy") {
      booking.listing.availabilityStatus = "Sold";
    } else {
      booking.listing.availabilityStatus = "Reserved";
      const snapshot = booking.listing.bookings.find((item) =>
        item.startDate?.getTime() === booking.startDate?.getTime() && item.amount === booking.amount
      );
      if (snapshot) snapshot.status = "Confirmed";
    }
    await booking.listing.save();

    // ── Email buyer that booking is approved ───────────────────────────────
    sendBookingApprovedEmail({
      buyerEmail: booking.buyer.email,
      buyerName: booking.buyer.name,
      itemTitle: booking.listing.title,
      startDate: formatDate(booking.startDate),
      endDate: formatDate(booking.endDate),
      totalPrice: booking.totalAmount,
      sellerName: booking.seller.name,
    });
    // ───────────────────────────────────────────────────────────────────────

    const notification = await Notification.create({
      user: booking.buyer._id,
      sender: req.user._id,
      booking: booking._id,
      type: "booking",
      title: `${booking.listing.title} approved`,
      message: booking.type === "rent"
        ? `Your rental request has been approved for ${booking.days} day(s).`
        : "Your purchase request has been approved."
    });

    const populatedBooking = await Booking.findById(booking._id)
      .populate("listing", "title price deposit type city imageEmoji availabilityStatus")
      .populate("buyer", "name email role")
      .populate("seller", "name email role");

    const populatedNotification = await Notification.findById(notification._id)
      .populate("sender", "name email")
      .populate("booking", "_id status");

    const io = req.app.get("io");
    io.to(`user_${booking.buyer._id.toString()}`).emit("receive_notification", populatedNotification);

    res.json(populatedBooking);
  } catch (error) {
    res.status(500).json({ message: "Unable to approve booking.", error: error.message });
  }
});

router.put("/:id/reject", protect, async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id)
      .populate("listing")
      .populate("buyer", "name email role")
      .populate("seller", "name email role");

    if (!booking) return res.status(404).json({ message: "Booking not found." });
    if (booking.seller._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Only the seller can reject this booking." });
    }
    if (booking.status !== "pending") {
      return res.status(400).json({ message: "Only pending bookings can be rejected." });
    }

    booking.status = "rejected";
    await booking.save();

    if (booking.type === "buy" && booking.listing.availabilityStatus === "Reserved") {
      booking.listing.availabilityStatus = "Available";
    }
    if (booking.type === "rent") {
      const snapshot = booking.listing.bookings.find((item) =>
        item.startDate?.getTime() === booking.startDate?.getTime() && item.amount === booking.amount
      );
      if (snapshot) snapshot.status = "Pending";
    }
    await booking.listing.save();

    // ── Email buyer that booking is rejected ───────────────────────────────
    sendBookingRejectedEmail({
      buyerEmail: booking.buyer.email,
      buyerName: booking.buyer.name,
      itemTitle: booking.listing.title,
      startDate: formatDate(booking.startDate),
      endDate: formatDate(booking.endDate),
    });
    // ───────────────────────────────────────────────────────────────────────

    const notification = await Notification.create({
      user: booking.buyer._id,
      sender: req.user._id,
      booking: booking._id,
      type: "booking",
      title: `${booking.listing.title} rejected`,
      message: "Your booking request was rejected by the seller."
    });

    const populatedBooking = await Booking.findById(booking._id)
      .populate("listing", "title price deposit type city imageEmoji availabilityStatus")
      .populate("buyer", "name email role")
      .populate("seller", "name email role");

    const populatedNotification = await Notification.findById(notification._id)
      .populate("sender", "name email")
      .populate("booking", "_id status");

    const io = req.app.get("io");
    io.to(`user_${booking.buyer._id.toString()}`).emit("receive_notification", populatedNotification);

    res.json(populatedBooking);
  } catch (error) {
    res.status(500).json({ message: "Unable to reject booking.", error: error.message });
  }
});

router.put("/:id/complete", protect, async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id)
      .populate("listing")
      .populate("buyer", "name email role")
      .populate("seller", "name email role");

    if (!booking) return res.status(404).json({ message: "Booking not found." });
    if (booking.seller._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Only the seller can complete this booking." });
    }
    if (booking.status !== "approved") {
      return res.status(400).json({ message: "Only approved bookings can be completed." });
    }

    booking.status = "completed";
    await booking.save();

    if (booking.type === "rent") {
      const snapshot = booking.listing.bookings.find((item) =>
        item.startDate?.getTime() === booking.startDate?.getTime() && item.amount === booking.amount
      );
      if (snapshot) snapshot.status = "Completed";
      booking.listing.availabilityStatus = "Available";
    }
    await booking.listing.save();

    const notification = await Notification.create({
      user: booking.buyer._id,
      sender: req.user._id,
      booking: booking._id,
      type: "booking",
      title: `${booking.listing.title} completed`,
      message: "Your booking has been marked complete. You can now leave a review."
    });

    const populatedBooking = await Booking.findById(booking._id)
      .populate("listing", "title price deposit type city imageEmoji availabilityStatus")
      .populate("buyer", "name email role")
      .populate("seller", "name email role");

    const populatedNotification = await Notification.findById(notification._id)
      .populate("sender", "name email")
      .populate("booking", "_id status");

    const io = req.app.get("io");
    io.to(`user_${booking.buyer._id.toString()}`).emit("receive_notification", populatedNotification);

    res.json(populatedBooking);
  } catch (error) {
    res.status(500).json({ message: "Unable to complete booking.", error: error.message });
  }
});

router.put("/:id/cancel", protect, async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id).populate("listing");

    if (!booking) return res.status(404).json({ message: "Booking not found." });
    if (booking.buyer.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Only the buyer can cancel this booking." });
    }
    if (!["pending", "approved"].includes(booking.status)) {
      return res.status(400).json({ message: "This booking can no longer be cancelled." });
    }

    booking.status = "cancelled";
    await booking.save();

    if (booking.type === "buy" && booking.listing.availabilityStatus === "Reserved") {
      booking.listing.availabilityStatus = "Available";
      await booking.listing.save();
    }

    res.json({ message: "Booking cancelled successfully." });
  } catch (error) {
    res.status(500).json({ message: "Unable to cancel booking.", error: error.message });
  }
});

export default router;