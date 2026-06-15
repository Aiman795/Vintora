import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true
    },
    password: {
      type: String,
      required: true
    },
    role: {
      type: String,
      enum: ["buyer", "seller", "admin"],
      default: "buyer",
      required: true
    },
    accountStatus: {
      type: String,
      enum: ["Active", "Pending", "Blocked", "Suspended"],
      default: "Active"
    },
    verificationStatus: {
      type: String,
      enum: ["Unverified", "Pending", "Verified", "Rejected"],
      default: "Unverified"
    },
    verificationNote: {
      type: String,
      default: ""
    },
    wishlist: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Listing"
      }
    ],
    lastStatusChangeAt: {
      type: Date,
      default: null
    }
  },
  {
    timestamps: true
  }
);

const User = mongoose.model("User", userSchema);

export default User;
