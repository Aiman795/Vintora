// seed/fixImageUrls.js
// Run with: node seed/fixImageUrls.js
//
// Replaces "http://localhost:5000" with the live backend URL
// inside every listing's imageUrls array (and closet items too),
// so images work on the deployed frontend.
//
// Uses the native MongoDB driver directly (via mongoose.connection.db)
// instead of Mongoose documents/save(), to avoid any schema-tracking
// issues that can silently prevent writes from persisting.

import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

const MONGO_URI = process.env.MONGODB_URI || process.env.MONGO_URI;
const OLD_BASE = process.env.OLD_UPLOADS_BASE || "http://localhost:5000";
const NEW_BASE = process.env.PUBLIC_BACKEND_URL;

if (!NEW_BASE) {
  console.error("Missing PUBLIC_BACKEND_URL. Example:");
  console.error("PUBLIC_BACKEND_URL=https://your-backend.up.railway.app npm run uploads:fix-urls");
  process.exit(1);
}

async function fixListings(db) {
  const collection = db.collection("listings");
  const cursor = collection.find({
    imageUrls: { $elemMatch: { $regex: OLD_BASE } },
  });

  const docs = await cursor.toArray();
  console.log(`Found ${docs.length} listings with localhost URLs...`);

  for (const doc of docs) {
    const updatedUrls = (doc.imageUrls || []).map((url) =>
      typeof url === "string" && url.startsWith(OLD_BASE) ? url.replace(OLD_BASE, NEW_BASE) : url
    );

    const result = await collection.updateOne(
      { _id: doc._id },
      { $set: { imageUrls: updatedUrls } }
    );

    console.log(
      `${result.modifiedCount === 1 ? "✅" : "⚠️ NOT MODIFIED —"} ${doc.title}`
    );
  }
}

async function fixClosetItems(db) {
  const collection = db.collection("closetitems");
  const cursor = collection.find({
    imageUrl: { $regex: OLD_BASE },
  });

  const docs = await cursor.toArray();
  console.log(`Found ${docs.length} closet items with localhost URLs...`);

  for (const doc of docs) {
    const updatedUrl = doc.imageUrl.replace(OLD_BASE, NEW_BASE);

    const result = await collection.updateOne(
      { _id: doc._id },
      { $set: { imageUrl: updatedUrl } }
    );

    console.log(
      `${result.modifiedCount === 1 ? "✅" : "⚠️ NOT MODIFIED —"} closet item: ${doc.itemName || doc._id}`
    );
  }
}

async function run() {
  try {
    console.log("Connecting to Atlas...");
    await mongoose.connect(MONGO_URI);
    const db = mongoose.connection.db;
    console.log("Connected. DB name:", db.databaseName);
    console.log("Host:", mongoose.connection.host);
    console.log("");

    await fixListings(db);
    await fixClosetItems(db);

    console.log("\n🎉 All image URLs updated!");
    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error("Failed:", err.message);
    process.exit(1);
  }
}

run();
