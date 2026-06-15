const mongoose = require("mongoose");

const productSchema = new mongoose.Schema({
  title: { type: String, required: true },
  price: { type: String, required: true },
  category: { type: String, required: true },
  type: { type: String, enum: ["Rent", "Buy"], required: true },
  image: { type: String, required: true },
  description: { type: String },
  embedding: { type: [Number], default: [] }, // CLIP embedding vector
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Product", productSchema);