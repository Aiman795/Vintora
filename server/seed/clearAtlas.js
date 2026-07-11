import dotenv from "dotenv";
import mongoose from "mongoose";
dotenv.config();

await mongoose.connect(process.env.MONGODB_URI);

const db = mongoose.connection.db;
const collections = await db.listCollections().toArray();

for (const col of collections) {
  await db.collection(col.name).deleteMany({});
  console.log(`✅ Cleared ${col.name}`);
}

console.log("\n🎉 Atlas is now empty. Run seedData.js to repopulate.");
await mongoose.disconnect();