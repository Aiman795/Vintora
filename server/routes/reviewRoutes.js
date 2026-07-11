import express from "express";
import { protect } from "../middleware/auth.js";
import Booking from "../models/Booking.js";
import Listing from "../models/Listing.js";
import Notification from "../models/Notification.js";
import Review from "../models/Review.js";

const router = express.Router();
const bannedTerms = ["abuse", "scam", "fraud", "idiot", "stupid"];

async function refreshListingRating(listingId) {
  const reviews = await Review.find({ listing: listingId }).select("rating");
  const reviewCount = reviews.length;
  const rating = reviewCount
    ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviewCount
    : 0;

  await Listing.findByIdAndUpdate(listingId, {
    rating: Number(rating.toFixed(1)),
    reviewCount
  });
}

router.get("/mine", protect, async (req, res) => {
  try {
    const filter = req.user.role === "seller" ? { seller: req.user._id } : { reviewer: req.user._id };
    const reviews = await Review.find(filter)
      .populate("listing", "title imageEmoji")
      .populate("reviewer", "name email")
      .populate("seller", "name email")
      .populate("booking", "status totalAmount")
      .sort({ createdAt: -1 });

    res.json(reviews);
  } catch (error) {
    res.status(500).json({ message: "Unable to fetch reviews.", error: error.message });
  }
});

router.get("/listing/:listingId", async (req, res) => {
  try {
    const reviews = await Review.find({ listing: req.params.listingId })
      .populate("reviewer", "name")
      .populate("seller", "name")
      .sort({ createdAt: -1 });

    res.json(reviews);
  } catch (error) {
    res.status(500).json({ message: "Unable to fetch listing reviews.", error: error.message });
  }
});

router.post("/", protect, async (req, res) => {
  try {
    if ((req.user.role || "buyer") !== "buyer") {
      return res.status(403).json({ message: "Only buyers can submit reviews." });
    }

    const { bookingId, rating, comment } = req.body;
    const numericRating = Number(rating);

    if (!bookingId || !numericRating || numericRating < 1 || numericRating > 5) {
      return res.status(400).json({ message: "bookingId and a rating from 1 to 5 are required." });
    }

    const reviewText = (comment || "").trim();
    const normalizedComment = reviewText.toLowerCase();
    if (bannedTerms.some((term) => normalizedComment.includes(term))) {
      return res.status(400).json({ message: "Review content violates community guidelines." });
    }

    const booking = await Booking.findById(bookingId).populate("listing").populate("seller", "name email");

    if (!booking) {
      return res.status(404).json({ message: "Booking not found." });
    }

    if (booking.buyer.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "You can only review your own bookings." });
    }

    if (booking.status !== "completed") {
      return res.status(400).json({ message: "Only completed bookings can be reviewed." });
    }

    const existingReview = await Review.findOne({ booking: booking._id, reviewer: req.user._id });
    if (existingReview) {
      return res.status(409).json({ message: "You already reviewed this booking." });
    }

    const review = await Review.create({
      booking: booking._id,
      listing: booking.listing._id,
      reviewer: req.user._id,
      seller: booking.seller._id,
      rating: numericRating,
      comment: reviewText,
      verifiedRental: true
    });

    await refreshListingRating(booking.listing._id);

    await Notification.create({
      user: booking.seller._id,
      sender: req.user._id,
      booking: booking._id,
      type: "review",
      title: `New review for ${booking.listing.title}`,
      message: `${req.user.name} left a ${numericRating}.0 star review.`
    });

    const populatedReview = await Review.findById(review._id)
      .populate("listing", "title imageEmoji")
      .populate("reviewer", "name email")
      .populate("seller", "name email")
      .populate("booking", "status totalAmount");

    res.status(201).json(populatedReview);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ message: "You already reviewed this booking." });
    }

    res.status(500).json({ message: "Unable to submit review.", error: error.message });
  }
});

export default router;
