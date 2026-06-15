import express from "express";
import { protect } from "../middleware/auth.js";
import Conversation from "../models/Conversation.js";

const router = express.Router();

// Get all conversations for logged-in user
router.get("/", protect, async (req, res) => {
  try {
    const conversations = await Conversation.find({
      participants: req.user._id
    })
      .populate("participants", "name email")
      .populate("listing", "title imageEmoji price")
      .sort({ updatedAt: -1 });

    res.json(conversations);
  } catch (error) {
    res.status(500).json({
      message: "Unable to fetch conversations.",
      error: error.message
    });
  }
});

// Create a new conversation
router.post("/", protect, async (req, res) => {
  try {
    const { participantId, listingId } = req.body;

    if (!participantId) {
      return res.status(400).json({ message: "participantId is required." });
    }

    if (participantId === req.user._id.toString()) {
      return res.status(400).json({ message: "You cannot create a conversation with yourself." });
    }

    const normalizedListingId = listingId || null;

    let conversation = await Conversation.findOne({
      participants: { $all: [req.user._id, participantId] },
      listing: normalizedListingId
    });

    if (!conversation) {
      conversation = await Conversation.create({
        participants: [req.user._id, participantId],
        listing: normalizedListingId
      });
    }

    const populatedConversation = await Conversation.findById(conversation._id)
      .populate("participants", "name email")
      .populate("listing", "title imageEmoji price");

    res.status(201).json(populatedConversation);
  } catch (error) {
    res.status(500).json({
      message: "Unable to create conversation.",
      error: error.message
    });
  }
});

export default router;