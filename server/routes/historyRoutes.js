import express from "express";
import { protect } from "../middleware/auth.js";
import Booking from "../models/Booking.js";
import Conversation from "../models/Conversation.js";
import Dispute from "../models/Dispute.js";
import Message from "../models/Message.js";
import Review from "../models/Review.js";

const router = express.Router();

function toTimelineItem(type, date, title, detail, extra = {}) {
  return {
    type,
    date,
    title,
    detail,
    ...extra
  };
}

router.get("/", protect, async (req, res) => {
  try {
    const userId = req.user._id;

    const conversations = await Conversation.find({ participants: userId })
      .populate("participants", "name email role")
      .populate("listing", "title imageEmoji")
      .sort({ updatedAt: -1 });
    const conversationIds = conversations.map((conversation) => conversation._id);

    const [bookings, messages, disputes, reviews] = await Promise.all([
      Booking.find({ $or: [{ buyer: userId }, { seller: userId }] })
        .populate("listing", "title imageEmoji")
        .populate("buyer", "name email role")
        .populate("seller", "name email role")
        .sort({ createdAt: -1 }),
      Message.find({ conversation: { $in: conversationIds } })
        .populate("sender", "name email role")
        .populate("receiver", "name email role")
        .populate({
          path: "conversation",
          populate: { path: "listing", select: "title imageEmoji" }
        })
        .sort({ createdAt: -1 })
        .limit(100),
      Dispute.find({ $or: [{ raisedBy: userId }, { againstUser: userId }] })
        .populate("booking", "status totalAmount")
        .populate("listing", "title imageEmoji")
        .populate("raisedBy", "name email role")
        .populate("againstUser", "name email role")
        .sort({ createdAt: -1 }),
      Review.find({ $or: [{ reviewer: userId }, { seller: userId }] })
        .populate("booking", "status totalAmount")
        .populate("listing", "title imageEmoji")
        .populate("reviewer", "name email role")
        .populate("seller", "name email role")
        .sort({ createdAt: -1 })
    ]);

    const timeline = [
      ...bookings.map((booking) =>
        toTimelineItem(
          "booking",
          booking.updatedAt || booking.createdAt,
          `${booking.listing?.title || "Booking"} - ${booking.status}`,
          `${booking.buyer?.name || "Buyer"} and ${booking.seller?.name || "Seller"} - Rs. ${booking.totalAmount?.toLocaleString?.() || booking.totalAmount}`,
          { id: booking._id }
        )
      ),
      ...messages.map((message) =>
        toTimelineItem(
          "message",
          message.createdAt,
          `Message from ${message.sender?.name || "User"}`,
          message.text,
          {
            id: message._id,
            listingTitle: message.conversation?.listing?.title || "Direct conversation"
          }
        )
      ),
      ...disputes.map((dispute) =>
        toTimelineItem(
          "dispute",
          dispute.updatedAt || dispute.createdAt,
          `${dispute.listing?.title || "Dispute"} - ${dispute.status}`,
          `${dispute.reason}${dispute.resolution ? ` | Resolution: ${dispute.resolution}` : ""}`,
          { id: dispute._id }
        )
      ),
      ...reviews.map((review) =>
        toTimelineItem(
          "review",
          review.createdAt,
          `${review.listing?.title || "Review"} - ${review.rating} star(s)`,
          review.comment || "No written comment.",
          { id: review._id }
        )
      )
    ].sort((a, b) => new Date(b.date) - new Date(a.date));

    res.json({
      bookings,
      conversations,
      messages,
      disputes,
      reviews,
      timeline
    });
  } catch (error) {
    res.status(500).json({ message: "Unable to fetch history.", error: error.message });
  }
});

export default router;
