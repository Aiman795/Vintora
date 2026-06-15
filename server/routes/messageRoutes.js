import express from "express";
import { protect } from "../middleware/auth.js";
import Message from "../models/Message.js";
import Conversation from "../models/Conversation.js";
import Notification from "../models/Notification.js";

const router = express.Router();
const bannedTerms = ["abuse", "scam", "fraud", "idiot", "stupid"];

// Get all messages for one conversation
router.get("/:conversationId", protect, async (req, res) => {
  try {
    const { conversationId } = req.params;

    const conversation = await Conversation.findById(conversationId);

    if (!conversation) {
      return res.status(404).json({ message: "Conversation not found." });
    }

    const isParticipant = conversation.participants.some(
      (participant) => participant.toString() === req.user._id.toString()
    );

    if (!isParticipant) {
      return res.status(403).json({ message: "You are not allowed to view these messages." });
    }

    const messages = await Message.find({ conversation: conversationId })
      .populate("sender", "name email")
      .populate("receiver", "name email")
      .sort({ createdAt: 1 });

    res.json(messages);
  } catch (error) {
    res.status(500).json({
      message: "Unable to fetch messages.",
      error: error.message
    });
  }
});

// Send/save a new message
router.post("/", protect, async (req, res) => {
  try {
    const { conversationId, receiverId, text } = req.body;

    if (!conversationId || !receiverId || !text) {
      return res.status(400).json({
        message: "conversationId, receiverId, and text are required."
      });
    }

    const conversation = await Conversation.findById(conversationId);

    if (!conversation) {
      return res.status(404).json({ message: "Conversation not found." });
    }

    const isParticipant = conversation.participants.some(
      (participant) => participant.toString() === req.user._id.toString()
    );

    if (!isParticipant) {
      return res.status(403).json({ message: "You are not allowed to send messages here." });
    }

    const normalizedText = text.toLowerCase();
    if (bannedTerms.some((term) => normalizedText.includes(term))) {
      return res.status(400).json({ message: "Content violates community guidelines." });
    }

    const receiverIsParticipant = conversation.participants.some(
      (participant) => participant.toString() === receiverId.toString()
    );

    if (!receiverIsParticipant || receiverId.toString() === req.user._id.toString()) {
      return res.status(400).json({ message: "Receiver must be the other participant in this conversation." });
    }

    const message = await Message.create({
      conversation: conversationId,
      sender: req.user._id,
      receiver: receiverId,
      text
    });

    conversation.updatedAt = new Date();
    await conversation.save();

    const populatedMessage = await Message.findById(message._id)
      .populate("sender", "name email")
      .populate("receiver", "name email");

    const notification = await Notification.create({
      user: receiverId,
      sender: req.user._id,
      conversation: conversationId,
      type: "message",
      title: `New message from ${req.user.name}`,
      message: text.length > 90 ? `${text.slice(0, 90)}...` : text
    });

    const populatedNotification = await Notification.findById(notification._id)
      .populate("sender", "name email")
      .populate("conversation", "_id");

    const io = req.app.get("io");
    io.to(`user_${receiverId}`).emit("receive_message", populatedMessage);
    io.to(`user_${receiverId}`).emit("receive_notification", populatedNotification);

    res.status(201).json(populatedMessage);
  } catch (error) {
    res.status(500).json({
      message: "Unable to send message.",
      error: error.message
    });
  }
});

export default router;
