import dotenv from "dotenv";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
dotenv.config();

await mongoose.connect(process.env.MONGODB_URI);

const hash = await bcrypt.hash("admin123", 10);
const result = await mongoose.connection.db.collection("users").updateOne(
  { email: "admin@vintora.com" },
  { $set: { password: hash } }
);

console.log("Password reset:", result.modifiedCount === 1 ? "✅ Success" : "❌ Failed");
await mongoose.disconnect();