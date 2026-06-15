import mongoose from "mongoose";

const disputeSchema = new mongoose.Schema(
  {
    booking: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Booking",
      default: null
    },
    listing: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Listing",
      default: null
    },
    raisedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    againstUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null
    },
    reason: {
      type: String,
      required: true,
      trim: true
    },
    details: {
      type: String,
      default: "",
      trim: true
    },
    status: {
      type: String,
      enum: ["open", "reviewing", "resolved"],
      default: "open"
    },
    resolution: {
      type: String,
      default: "",
      trim: true
    },
    resolvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null
    },
    resolvedAt: {
      type: Date,
      default: null
    }
  },
  { timestamps: true }
);

export default mongoose.model("Dispute", disputeSchema);
