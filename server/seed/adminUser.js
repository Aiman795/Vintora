import dotenv from "dotenv";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import User from "../models/User.js";

dotenv.config();

async function ensureAdmin() {
  try {
    const mongoUri = process.env.MONGO_URI || "mongodb://localhost:27017/vintora";
    await mongoose.connect(mongoUri);

    const email = "admin@vintora.com";
    const password = "admin123";
    const hashedPassword = await bcrypt.hash(password, 10);

    const admin = await User.findOneAndUpdate(
      { email },
      {
        name: "Vintora Admin",
        email,
        password: hashedPassword,
        role: "admin",
        accountStatus: "Active",
        verificationStatus: "Verified"
      },
      {
        new: true,
        upsert: true,
        runValidators: true
      }
    ).select("-password");

    console.log("Admin account is ready:");
    console.log(`Email: ${admin.email}`);
    console.log(`Password: ${password}`);
    console.log(`Role: ${admin.role}`);

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error("Unable to create admin:", error.message);
    process.exit(1);
  }
}

ensureAdmin();
