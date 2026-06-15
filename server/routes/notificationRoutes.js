import express from "express";
import { protect } from "../middleware/auth.js";
import Notification from "../models/Notification.js";

const router = express.Router();

router.get("/", protect, async (req, res) => {
  try {
    const notifications = await Notification.find({ user: req.user._id, isRead: false })
      .populate("sender", "name email")
      .populate("conversation", "_id")
      .populate("booking", "_id status")
      .sort({ createdAt: -1 })
      .limit(20);

    res.json(notifications);
  } catch (error) {
    res.status(500).json({
      message: "Unable to fetch notifications.",
      error: error.message
    });
  }
});

router.put("/read-all", protect, async (req, res) => {
  try {
    const { conversationId } = req.body || {};
    const filter = { user: req.user._id, isRead: false };

    if (conversationId) {
      filter.conversation = conversationId;
    }

    await Notification.updateMany(filter, { isRead: true });
    res.json({ message: "Notifications updated successfully." });
  } catch (error) {
    res.status(500).json({
      message: "Unable to update notifications.",
      error: error.message
    });
  }
});

router.put("/:id/read", protect, async (req, res) => {
  try {
    const notification = await Notification.findOne({
      _id: req.params.id,
      user: req.user._id
    });

    if (!notification) {
      return res.status(404).json({ message: "Notification not found." });
    }

    notification.isRead = true;
    await notification.save();

    const populatedNotification = await Notification.findById(notification._id)
      .populate("sender", "name email")
      .populate("conversation", "_id")
      .populate("booking", "_id status");

    res.json(populatedNotification);
  } catch (error) {
    res.status(500).json({
      message: "Unable to mark notification as read.",
      error: error.message
    });
  }
});

export default router;
