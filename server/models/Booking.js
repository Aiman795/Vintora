import mongoose from "mongoose";

const bookingSchema = new mongoose.Schema(
  {
    listing: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Listing",
      required: true
    },
    buyer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    seller: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    type: {
      type: String,
      enum: ["rent", "buy"],
      required: true
    },
    startDate: {
      type: Date,
      default: null
    },
    endDate: {
      type: Date,
      default: null
    },
    days: {
      type: Number,
      default: 1
    },
    amount: {
      type: Number,
      required: true
    },
    deposit: {
      type: Number,
      default: 0
    },
    totalAmount: {
      type: Number,
      required: true
    },
    paymentMethod: {
      type: String,
      enum: ["Cash on Delivery", "Bank Transfer", "JazzCash/EasyPaisa", "Manual Agreement"],
      default: "Cash on Delivery"
    },
    paymentStatus: {
      type: String,
      enum: ["pending", "instructions_sent", "confirmed", "refunded"],
      default: "instructions_sent"
    },
    deliveryMethod: {
      type: String,
      enum: ["Meetup", "Courier", "Self Pickup"],
      default: "Meetup"
    },
    contactNote: {
      type: String,
      default: ""
    },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected", "cancelled", "completed"],
      default: "pending"
    }
  },
  {
    timestamps: true
  }
);

const Booking = mongoose.model("Booking", bookingSchema);

export default Booking;
