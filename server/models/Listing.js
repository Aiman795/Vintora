import mongoose from "mongoose";

const bookingSchema = new mongoose.Schema(
  {
    renterName: { type: String, required: true, trim: true },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    amount: { type: Number, required: true },
    status: {
      type: String,
      enum: ["Pending", "Confirmed", "Out on Rent", "Completed"],
      default: "Pending"
    }
  },
  { _id: true }
);

const blockedDateSchema = new mongoose.Schema(
  {
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    reason: { type: String, default: "Blocked by seller", trim: true }
  },
  { _id: true }
);

const listingSchema = new mongoose.Schema(
  {
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    title: {
      type: String,
      required: true,
      trim: true
    },
    category: {
      type: String,
      required: true,
      trim: true
    },
    occasion: {
      type: String,
      required: true,
      trim: true
    },
    type: {
      type: String,
      enum: ["Rent", "Buy"],
      required: true
    },
    price: {
      type: Number,
      required: true
    },
    pricingModel: {
      type: String,
      enum: ["per day", "fixed price"],
      required: true
    },
    deposit: {
      type: Number,
      default: 0
    },
    city: {
      type: String,
      required: true,
      trim: true
    },
    size: {
      type: String,
      required: true,
      trim: true
    },
    material: {
      type: String,
      default: ""
    },
    condition: {
      type: String,
      default: "Pre-loved"
    },
    description: {
      type: String,
      required: true,
      trim: true
    },
    imageEmoji: {
      type: String,
      default: ""
    },
    imageToneClass: {
      type: String,
      default: "c1"
    },
    imageUrls: {
      type: [String],
      default: []
    },
    tags: {
      type: [String],
      default: []
    },
    rating: {
      type: Number,
      default: 4.8
    },
    reviewCount: {
      type: Number,
      default: 0
    },
    availabilityStatus: {
      type: String,
      enum: ["Available", "Reserved", "Out of Stock", "Sold"],
      default: "Available"
    },
    status: {
      type: String,
      enum: ["Live", "Pending Approval", "Archived"],
      default: "Pending Approval"
    },
    featured: {
      type: Boolean,
      default: false
    },
    bookings: {
      type: [bookingSchema],
      default: []
    },
    blockedDates: {
      type: [blockedDateSchema],
      default: []
    }
  },
  {
    timestamps: true
  }
);

const Listing = mongoose.model("Listing", listingSchema);

export default Listing;
