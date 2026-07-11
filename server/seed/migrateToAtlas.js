import dotenv from "dotenv";
import mongoose from "mongoose";

dotenv.config();

const LOCAL_URI = "mongodb://127.0.0.1:27017/vintora";
const ATLAS_URI = process.env.MONGODB_URI;

async function migrate() {
  console.log("Connecting to local MongoDB...");
  const localConn = await mongoose.createConnection(LOCAL_URI).asPromise();

  console.log("Connecting to Atlas...");
  const atlasConn = await mongoose.createConnection(ATLAS_URI).asPromise();

  const collections = await localConn.db.listCollections().toArray();
  console.log(`Found ${collections.length} collections to migrate...`);

  for (const col of collections) {
    const name = col.name;
    const docs = await localConn.db.collection(name).find({}).toArray();

    if (docs.length === 0) {
      console.log(`Skipping ${name} (empty)`);
      continue;
    }

    await atlasConn.db.collection(name).deleteMany({});
    await atlasConn.db.collection(name).insertMany(docs);
    console.log(`✅ Migrated ${name}: ${docs.length} documents`);
  }

  console.log("\n🎉 Migration complete! All local data is now in Atlas.");
  await localConn.close();
  await atlasConn.close();
  process.exit(0);
}

migrate().catch((err) => {
  console.error("Migration failed:", err.message);
  process.exit(1);
});