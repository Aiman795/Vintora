// seed/seedListings.js
// Run with: node seed/seedListings.js

import mongoose from "mongoose";
import dotenv from "dotenv";
import bcrypt from "bcryptjs";

dotenv.config();

// ── Schemas ──────────────────────────────────────────────────────────────────
const userSchema = new mongoose.Schema({
  name: String,
  email: String,
  password: String,
  role: String,
}, { timestamps: true });

const listingSchema = new mongoose.Schema({
  title: String,
  category: String,
  occasion: String,
  type: String,
  price: Number,
  pricingModel: String,
  deposit: Number,
  city: String,
  size: String,
  material: String,
  condition: String,
  description: String,
  imageEmoji: String,
  imageToneClass: String,
  imageUrls: [String],
  tags: [String],
  rating: Number,
  reviewCount: Number,
  availabilityStatus: String,
  status: String,
  owner: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  embedding: { type: [Number], default: [] },
}, { timestamps: true });

const User = mongoose.models.User || mongoose.model("User", userSchema);
const Listing = mongoose.models.Listing || mongoose.model("Listing", listingSchema);

// ── Seed Data ─────────────────────────────────────────────────────────────────
const listings = [
  {
    title: "Bridal Lehenga — Blush Rose",
    category: "Lehenga / Sharara",
    occasion: "Barat",
    type: "Rent",
    price: 4500,
    pricingModel: "per day",
    deposit: 15000,
    city: "Islamabad",
    size: "M",
    material: "Silk Blend",
    condition: "Excellent",
    description: "A stunning blush rose lehenga with intricate gold zardozi embroidery. Includes skirt, choli blouse, and dupatta. Professionally dry-cleaned after every rental.",
    imageEmoji: "",
    imageToneClass: "c1",
    imageUrls: [
      "http://localhost:5000/uploads/sample-dress-1.jpg",
      "http://localhost:5000/uploads/sample-dress-2.jpg",
      "http://localhost:5000/uploads/sample-dress-3.jpg",
      "http://localhost:5000/uploads/sample-dress-4.jpg",
      "http://localhost:5000/uploads/sample-dress-5.jpg"
    ],
    tags: ["bridal", "lehenga", "blush", "zardozi", "barat"],
    rating: 4.9,
    reviewCount: 24,
    availabilityStatus: "Available",
    status: "active",
  },
  {
    title: "Formal Sherwani — Navy Blue",
    category: "Sherwani / Kurta",
    occasion: "Barat",
    type: "Buy",
    price: 18000,
    pricingModel: "fixed",
    deposit: 0,
    city: "Rawalpindi",
    size: "L",
    material: "Silk Blend",
    condition: "Good",
    description: "Elegant navy blue sherwani with gold embroidery. Perfect for barat or formal events. Includes matching trouser and dupatta.",
    imageEmoji: "",
    imageToneClass: "c2",
    imageUrls: ["http://localhost:5000/uploads/sample-dress-2.jpg", "http://localhost:5000/uploads/sample-dress-3.jpg", "http://localhost:5000/uploads/sample-dress-4.jpg"],
    tags: ["sherwani", "navy", "formal", "groom", "barat"],
    rating: 5.0,
    reviewCount: 12,
    availabilityStatus: "Available",
    status: "active",
  },
  {
    title: "Kundan Bridal Jewellery Set",
    category: "Jewellery",
    occasion: "Barat",
    type: "Rent",
    price: 2200,
    pricingModel: "per day",
    deposit: 8000,
    city: "Islamabad",
    size: "One Size",
    material: "Gold Plated",
    condition: "Excellent",
    description: "Complete kundan bridal jewellery set including necklace, earrings, maang tikka, and bangles. Gold plated with kundan stones.",
    imageEmoji: "",
    imageToneClass: "c3",
    imageUrls: ["http://localhost:5000/uploads/sample-dress-3.jpg", "http://localhost:5000/uploads/sample-dress-4.jpg", "http://localhost:5000/uploads/sample-dress-5.jpg"],
    tags: ["jewellery", "kundan", "bridal", "gold", "set"],
    rating: 4.8,
    reviewCount: 31,
    availabilityStatus: "Available",
    status: "active",
  },
  {
    title: "Embellished Gold Heels",
    category: "Footwear",
    occasion: "Party",
    type: "Buy",
    price: 5500,
    pricingModel: "fixed",
    deposit: 0,
    city: "Lahore",
    size: "37",
    material: "Synthetic",
    condition: "Good",
    description: "Beautiful embellished gold heels perfect for weddings and formal events. Worn only once.",
    imageEmoji: "",
    imageToneClass: "c1",
    imageUrls: ["http://localhost:5000/uploads/sample-dress-4.jpg", "http://localhost:5000/uploads/sample-dress-5.jpg", "http://localhost:5000/uploads/sample-dress-6.jpg"],
    tags: ["heels", "gold", "embellished", "wedding", "formal"],
    rating: 4.7,
    reviewCount: 8,
    availabilityStatus: "Available",
    status: "active",
  },
  {
    title: "Hand-Woven Pashmina Shawl",
    category: "Accessories",
    occasion: "Formal",
    type: "Rent",
    price: 1200,
    pricingModel: "per day",
    deposit: 4000,
    city: "Islamabad",
    size: "One Size",
    material: "Pashmina",
    condition: "Excellent",
    description: "Authentic hand-woven pashmina shawl in soft gold. Perfect for formal events and winter weddings.",
    imageEmoji: "",
    imageToneClass: "c2",
    imageUrls: ["http://localhost:5000/uploads/sample-dress-5.jpg", "http://localhost:5000/uploads/sample-dress-6.jpg", "http://localhost:5000/uploads/sample-dress-7.jpg"],
    tags: ["pashmina", "shawl", "gold", "winter", "formal"],
    rating: 4.6,
    reviewCount: 19,
    availabilityStatus: "Available",
    status: "active",
  },
  {
    title: "Zardozi Bridal Clutch",
    category: "Bags & Clutches",
    occasion: "Barat",
    type: "Rent",
    price: 800,
    pricingModel: "per day",
    deposit: 3000,
    city: "Karachi",
    size: "One Size",
    material: "Velvet",
    condition: "Excellent",
    description: "Elegant zardozi embroidered bridal clutch in gold and maroon. Perfect for barat and mehndi events.",
    imageEmoji: "",
    imageToneClass: "c3",
    imageUrls: ["http://localhost:5000/uploads/sample-dress-6.jpg", "http://localhost:5000/uploads/sample-dress-7.jpg", "http://localhost:5000/uploads/sample-dress-8.jpg"],
    tags: ["clutch", "zardozi", "bridal", "velvet", "gold"],
    rating: 4.9,
    reviewCount: 7,
    availabilityStatus: "Available",
    status: "active",
  },
  {
    title: "Mehndi Sharara Set — Yellow",
    category: "Lehenga / Sharara",
    occasion: "Mehndi",
    type: "Rent",
    price: 3500,
    pricingModel: "per day",
    deposit: 12000,
    city: "Lahore",
    size: "S",
    material: "Georgette",
    condition: "Excellent",
    description: "Vibrant yellow sharara set with gota patti embroidery. Perfect for mehndi functions. Includes kameez, sharara, and dupatta.",
    imageEmoji: "",
    imageToneClass: "c1",
    imageUrls: ["http://localhost:5000/uploads/sample-dress-7.jpg", "http://localhost:5000/uploads/sample-dress-8.jpg", "http://localhost:5000/uploads/sample-dress-1.jpg"],
    tags: ["sharara", "yellow", "mehndi", "gota", "bridal"],
    rating: 4.8,
    reviewCount: 15,
    availabilityStatus: "Available",
    status: "active",
  },
  {
    title: "Eid Lawn Suit — Mint Green",
    category: "Shalwar Kameez",
    occasion: "Eid",
    type: "Buy",
    price: 3200,
    pricingModel: "fixed",
    deposit: 0,
    city: "Islamabad",
    size: "M",
    material: "Lawn",
    condition: "New",
    description: "Beautiful mint green lawn suit perfect for Eid gatherings. Unstitched premium lawn with embroidered dupatta.",
    imageEmoji: "",
    imageToneClass: "c2",
    imageUrls: ["http://localhost:5000/uploads/sample-dress-8.jpg", "http://localhost:5000/uploads/sample-dress-1.jpg", "http://localhost:5000/uploads/sample-dress-2.jpg"],
    tags: ["lawn", "eid", "mint", "casual", "summer"],
    rating: 4.5,
    reviewCount: 22,
    availabilityStatus: "Available",
    status: "active",
  },
  {
    title: "Bridal Maang Tikka — Gold",
    category: "Jewellery",
    occasion: "Barat",
    type: "Rent",
    price: 600,
    pricingModel: "per day",
    deposit: 2000,
    city: "Rawalpindi",
    size: "One Size",
    material: "Gold Plated",
    condition: "Excellent",
    description: "Stunning gold plated maang tikka with pearl drops. Can be paired with any bridal outfit.",
    imageEmoji: "",
    imageToneClass: "c3",
    imageUrls: ["http://localhost:5000/uploads/sample-dress-1.jpg", "http://localhost:5000/uploads/sample-dress-3.jpg", "http://localhost:5000/uploads/sample-dress-5.jpg"],
    tags: ["tikka", "maang tikka", "gold", "bridal", "pearl"],
    rating: 4.7,
    reviewCount: 18,
    availabilityStatus: "Available",
    status: "active",
  },
  {
    title: "Party Wear Saree — Red Silk",
    category: "Saree",
    occasion: "Party",
    type: "Rent",
    price: 2800,
    pricingModel: "per day",
    deposit: 10000,
    city: "Karachi",
    size: "One Size",
    material: "Pure Silk",
    condition: "Excellent",
    description: "Stunning red silk saree with golden border. Includes matching blouse. Perfect for formal parties and events.",
    imageEmoji: "",
    imageToneClass: "c1",
    imageUrls: ["http://localhost:5000/uploads/sample-dress-2.jpg", "http://localhost:5000/uploads/sample-dress-4.jpg", "http://localhost:5000/uploads/sample-dress-6.jpg"],
    tags: ["saree", "red", "silk", "party", "formal"],
    rating: 4.6,
    reviewCount: 9,
    availabilityStatus: "Available",
    status: "active",
  },
  {
    title: "Walima Gown — Ivory White",
    category: "Gown",
    occasion: "Walima",
    type: "Rent",
    price: 5000,
    pricingModel: "per day",
    deposit: 18000,
    city: "Islamabad",
    size: "M",
    material: "Net",
    condition: "Excellent",
    description: "Elegant ivory white walima gown with silver embroidery. Floor length with trail. Includes dupatta.",
    imageEmoji: "",
    imageToneClass: "c2",
    imageUrls: ["http://localhost:5000/uploads/sample-dress-3.jpg", "http://localhost:5000/uploads/sample-dress-5.jpg", "http://localhost:5000/uploads/sample-dress-7.jpg"],
    tags: ["gown", "walima", "ivory", "bridal", "elegant"],
    rating: 5.0,
    reviewCount: 6,
    availabilityStatus: "Available",
    status: "active",
  },
  {
    title: "Casual Khussa — Embroidered",
    category: "Footwear",
    occasion: "Eid",
    type: "Buy",
    price: 2500,
    pricingModel: "fixed",
    deposit: 0,
    city: "Lahore",
    size: "38",
    material: "Leather",
    condition: "New",
    description: "Hand-crafted embroidered khussa in multicolor thread work. Perfect for Eid and casual events.",
    imageEmoji: "",
    imageToneClass: "c3",
    imageUrls: ["http://localhost:5000/uploads/sample-dress-4.jpg", "http://localhost:5000/uploads/sample-dress-6.jpg", "http://localhost:5000/uploads/sample-dress-8.jpg"],
    tags: ["khussa", "embroidered", "eid", "casual", "leather"],
    rating: 4.4,
    reviewCount: 33,
    availabilityStatus: "Available",
    status: "active",
  },
];

// ── Main ──────────────────────────────────────────────────────────────────────
async function seed() {
  try {
    const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/vintora";
    await mongoose.connect(MONGO_URI);
    console.log("MongoDB connected ✅");

    // Create or find demo admin and seller accounts
    let admin = await User.findOne({ email: "admin@vintora.com" });
    if (!admin) {
      const hashedAdmin = await bcrypt.hash("admin123", 10);
      admin = await User.create({
        name: "Vintora Admin",
        email: "admin@vintora.com",
        password: hashedAdmin,
        role: "admin",
      });
      console.log("Demo admin created ✅");
      console.log("  Email:    admin@vintora.com");
      console.log("  Password: admin123");
    } else {
      console.log("Demo admin already exists ✅");
    }

    let seller = await User.findOne({ email: "demo.seller@vintora.com" });
    if (!seller) {
      const hashed = await bcrypt.hash("password123", 10);
      seller = await User.create({
        name: "Fatima Ahmed",
        email: "demo.seller@vintora.com",
        password: hashed,
        role: "seller",
      });
      console.log("Demo seller created ✅");
      console.log("  Email:    demo.seller@vintora.com");
      console.log("  Password: password123");
    } else {
      console.log("Demo seller already exists ✅");
    }

    // Clear existing listings
    await Listing.deleteMany({});
    console.log("Old listings cleared ✅");

    // Insert new listings with owner
    const toInsert = listings.map((l) => ({ ...l, status: "Live", owner: seller._id }));
    await Listing.insertMany(toInsert);
    console.log(`${listings.length} listings inserted ✅`);

    console.log("\n🎉 Seed complete! Your Browse page now has listings.");
    console.log("Demo admin login: admin@vintora.com / admin123");
    console.log("Demo seller login: demo.seller@vintora.com / password123");

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error("Seed error:", error.message);
    process.exit(1);
  }
}

seed();
