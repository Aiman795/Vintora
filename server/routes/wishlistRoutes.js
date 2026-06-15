import express from "express";
import Listing from "../models/Listing.js";
import User from "../models/User.js";
import { protect } from "../middleware/auth.js";

const router = express.Router();

router.get("/", protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).populate(
      "wishlist",
      "title price type pricingModel city size rating reviewCount availabilityStatus imageUrls imageEmoji imageToneClass"
    );
    res.json(user?.wishlist || []);
  } catch (error) {
    res.status(500).json({ message: "Unable to load wishlist.", error: error.message });
  }
});

router.post("/:listingId", protect, async (req, res) => {
  try {
    const listing = await Listing.findOne({ _id: req.params.listingId, status: "Live" });
    if (!listing) {
      return res.status(404).json({ message: "Listing not found." });
    }

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { $addToSet: { wishlist: listing._id } },
      { new: true }
    ).populate("wishlist", "title price type pricingModel city size rating reviewCount availabilityStatus imageUrls imageEmoji imageToneClass");

    res.status(201).json(user.wishlist);
  } catch (error) {
    res.status(500).json({ message: "Unable to save item.", error: error.message });
  }
});

router.delete("/:listingId", protect, async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.user._id,
      { $pull: { wishlist: req.params.listingId } },
      { new: true }
    ).populate("wishlist", "title price type pricingModel city size rating reviewCount availabilityStatus imageUrls imageEmoji imageToneClass");

    res.json(user?.wishlist || []);
  } catch (error) {
    res.status(500).json({ message: "Unable to remove item.", error: error.message });
  }
});

export default router;
