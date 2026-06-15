import express from "express";
import fs from "fs";
import multer from "multer";
import path from "path";
import { protect } from "../middleware/auth.js";
import Booking from "../models/Booking.js";
import Listing from "../models/Listing.js";
import Review from "../models/Review.js";
import User from "../models/User.js";

const router = express.Router();
const uploadsDir = path.join(process.cwd(), "uploads");

if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsDir),
  filename: (_req, file, cb) => {
    const safeName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, "-");
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `listing-${uniqueSuffix}-${safeName}`);
  }
});

const upload = multer({
  storage,
  limits: { files: 5, fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!file.mimetype.startsWith("image/")) {
      return cb(new Error("Only image uploads are allowed."));
    }
    cb(null, true);
  }
});

router.post("/uploads", protect, upload.array("images", 5), async (req, res) => {
  try {
    if ((req.user.role || "buyer") !== "seller") {
      return res.status(403).json({ message: "Only sellers can upload listing images." });
    }

    const imageUrls = (req.files || []).map((file) => `${req.protocol}://${req.get("host")}/uploads/${file.filename}`);
    res.status(201).json({ imageUrls });
  } catch (error) {
    res.status(500).json({ message: "Unable to upload listing images.", error: error.message });
  }
});

router.get("/public", async (_req, res) => {
  try {
    const listings = await Listing.find({ status: "Live" })
      .populate("owner", "name email verificationStatus accountStatus")
      .sort({ featured: -1, createdAt: -1 });

    res.json(listings);
  } catch (error) {
    res.status(500).json({ message: "Unable to fetch public listings.", error: error.message });
  }
});

router.get("/public/:id", async (req, res) => {
  try {
    const listing = await Listing.findOne({ _id: req.params.id, status: "Live" }).populate("owner", "name email verificationStatus accountStatus");

    if (!listing) {
      return res.status(404).json({ message: "Listing not found." });
    }

    res.json(listing);
  } catch (error) {
    res.status(500).json({ message: "Unable to fetch listing.", error: error.message });
  }
});

router.get("/seller/:id", async (req, res) => {
  try {
    const seller = await User.findOne({ _id: req.params.id, role: "seller" }).select("name email role verificationStatus accountStatus createdAt");

    if (!seller) {
      return res.status(404).json({ message: "Seller not found." });
    }

    const [listings, completedBookings, reviews] = await Promise.all([
      Listing.find({ owner: seller._id, status: "Live" }).sort({ createdAt: -1 }),
      Booking.countDocuments({ seller: seller._id, status: "completed" }),
      Review.find({ seller: seller._id })
        .populate("listing", "title imageEmoji imageUrls")
        .populate("reviewer", "name")
        .sort({ createdAt: -1 })
    ]);

    const averageRating = reviews.length
      ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length
      : 0;

    res.json({
      seller,
      stats: {
        activeListings: listings.length,
        completedBookings,
        averageRating: Number(averageRating.toFixed(1)),
        reviewCount: reviews.length
      },
      listings,
      reviews
    });
  } catch (error) {
    res.status(500).json({ message: "Unable to fetch seller profile.", error: error.message });
  }
});

router.get("/", protect, async (req, res) => {
  try {
    const listings = await Listing.find({ owner: req.user._id })
      .populate("owner", "name email")
      .sort({ createdAt: -1 });

    res.json(listings);
  } catch (error) {
    res.status(500).json({ message: "Unable to fetch your listings.", error: error.message });
  }
});

router.post("/", protect, async (req, res) => {
  try {
    if ((req.user.role || "buyer") !== "seller") {
      return res.status(403).json({ message: "Only sellers can create listings." });
    }

    const listing = await Listing.create({
      ...req.body,
      owner: req.user._id,
      status: "Pending Approval"
    });

    const populated = await listing.populate("owner", "name email");
    res.status(201).json(populated);
  } catch (error) {
    const status = error.name === "ValidationError" ? 400 : 500;
    res.status(status).json({ message: error.name === "ValidationError" ? error.message : "Unable to create listing.", error: error.message });
  }
});

router.put("/:id", protect, async (req, res) => {
  try {
    if ((req.user.role || "buyer") !== "seller") {
      return res.status(403).json({ message: "Only sellers can update listings." });
    }

    const listing = await Listing.findById(req.params.id);

    if (!listing) {
      return res.status(404).json({ message: "Listing not found." });
    }

    if (listing.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "You can only update your own listings." });
    }

    Object.assign(listing, req.body, { status: "Pending Approval" });
    await listing.save();
    const populated = await listing.populate("owner", "name email");

    res.json(populated);
  } catch (error) {
    const status = error.name === "ValidationError" ? 400 : 500;
    res.status(status).json({ message: error.name === "ValidationError" ? error.message : "Unable to update listing.", error: error.message });
  }
});

router.put("/:id/availability", protect, async (req, res) => {
  try {
    if ((req.user.role || "buyer") !== "seller") {
      return res.status(403).json({ message: "Only sellers can update availability." });
    }

    const { availabilityStatus } = req.body;
    if (!["Available", "Reserved", "Out of Stock", "Sold"].includes(availabilityStatus)) {
      return res.status(400).json({ message: "Invalid availability status." });
    }

    const listing = await Listing.findById(req.params.id);
    if (!listing) {
      return res.status(404).json({ message: "Listing not found." });
    }

    if (listing.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "You can only update your own listings." });
    }

    listing.availabilityStatus = availabilityStatus;
    await listing.save();

    const populated = await listing.populate("owner", "name email role");
    res.json(populated);
  } catch (error) {
    res.status(500).json({ message: "Unable to update availability.", error: error.message });
  }
});

router.put("/:id/blocked-dates", protect, async (req, res) => {
  try {
    if ((req.user.role || "buyer") !== "seller") {
      return res.status(403).json({ message: "Only sellers can manage blocked dates." });
    }

    const { blockedDates = [] } = req.body;
    const listing = await Listing.findById(req.params.id);

    if (!listing) {
      return res.status(404).json({ message: "Listing not found." });
    }

    if (listing.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "You can only update your own listings." });
    }

    listing.blockedDates = blockedDates
      .map((item) => ({
        startDate: new Date(item.startDate),
        endDate: new Date(item.endDate),
        reason: item.reason || "Blocked by seller"
      }))
      .filter((item) => !Number.isNaN(item.startDate.getTime()) && !Number.isNaN(item.endDate.getTime()) && item.endDate >= item.startDate);

    await listing.save();
    res.json(listing);
  } catch (error) {
    res.status(500).json({ message: "Unable to update blocked dates.", error: error.message });
  }
});

router.delete("/:id", protect, async (req, res) => {
  try {
    if ((req.user.role || "buyer") !== "seller") {
      return res.status(403).json({ message: "Only sellers can delete listings." });
    }

    const listing = await Listing.findById(req.params.id);

    if (!listing) {
      return res.status(404).json({ message: "Listing not found." });
    }

    if (listing.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "You can only delete your own listings." });
    }

    await listing.deleteOne();
    res.json({ message: "Listing deleted successfully." });
  } catch (error) {
    res.status(500).json({ message: "Unable to delete listing.", error: error.message });
  }
});

export default router;
