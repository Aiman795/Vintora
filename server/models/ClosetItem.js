import mongoose from "mongoose";

const closetItemSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    itemName: {
      type: String,
      required: true,
      trim: true,
    },
    category: {
      type: String,
      enum: [
        // New Pakistani fashion categories
        "shalwar_kameez",
        "kurta",
        "lehenga_sharara",
        "gharara_farshi",
        "anarkali",
        "gown",
        "saree",
        "sherwani",
        "co_ord_set",
        "dupatta_shawl",
        "jewellery",
        "necklace_choker",
        "bangles_kara",
        "footwear",
        "khussa_kheri",
        "bags_clutches",
        "hair_accessories",
        "accessories",
        "other",
        // Legacy values kept for backward compatibility with existing data
        "tops",
        "bottoms",
        "dresses",
      ],
      default: "other",
    },
    detectedCategory: {
      type: String,
      default: "",
    },
    dominantColor: {
      type: String,
      default: "",
    },
    colors: {
      type: [String],
      default: [],
    },
    tags: {
      type: [String],
      default: [],
    },
    autoTagged: {
      type: Boolean,
      default: false,
    },
    imageUrl: {
      type: String,
      required: true,
    },
    embedding: {
      type: [Number],
      default: [],
    },
  },
  { timestamps: true }
);

export default mongoose.model("ClosetItem", closetItemSchema);
