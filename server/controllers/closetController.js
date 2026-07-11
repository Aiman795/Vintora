import ClosetItem from "../models/ClosetItem.js";
import axios from "axios";
import FormData from "form-data";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PYTHON_SERVICE_URL = process.env.PYTHON_SERVICE_URL || "http://localhost:8000";

function inferCategoryFromText(text = "") {
  const value = text.toLowerCase();
  const pairs = [
    ["shalwar", "shalwar_kameez"],
    ["kameez", "shalwar_kameez"],
    ["kurta", "kurta"],
    ["lehenga", "lehenga_sharara"],
    ["sharara", "lehenga_sharara"],
    ["gharara", "gharara_farshi"],
    ["anarkali", "anarkali"],
    ["gown", "gown"],
    ["saree", "saree"],
    ["sherwani", "sherwani"],
    ["dupatta", "dupatta_shawl"],
    ["necklace", "necklace_choker"],
    ["bangle", "bangles_kara"],
    ["khussa", "khussa_kheri"],
    ["shoe", "footwear"],
    ["heel", "footwear"],
    ["bag", "bags_clutches"],
    ["clutch", "bags_clutches"],
  ];
  return pairs.find(([needle]) => value.includes(needle))?.[1] || "other";
}

async function analyzeClosetImage(filePath, itemName) {
  try {
    const formData = new FormData();
    formData.append("image", fs.createReadStream(filePath));
    const pythonRes = await axios.post(
      `${PYTHON_SERVICE_URL}/closet/analyze`,
      formData,
      { headers: formData.getHeaders(), timeout: 12000 }
    );
    return {
      detectedCategory: pythonRes.data.category || "other",
      dominantColor: pythonRes.data.dominantColor || "",
      colors: pythonRes.data.colors || [],
      tags: pythonRes.data.tags || [],
      autoTagged: true
    };
  } catch (error) {
    const detectedCategory = inferCategoryFromText(itemName || path.basename(filePath));
    return {
      detectedCategory,
      dominantColor: "",
      colors: [],
      tags: detectedCategory === "other" ? [] : [detectedCategory],
      autoTagged: detectedCategory !== "other"
    };
  }
}

export const getClosetItems = async (req, res) => {
  try {
    const items = await ClosetItem.find({ userId: req.user._id }).sort({ createdAt: -1 });
    res.json({ success: true, items });
  } catch (error) {
    console.error("[closetController] getClosetItems:", error.message);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

export const uploadClosetItem = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: "No image uploaded" });
    }

    const { itemName, category } = req.body;
    if (!itemName) {
      return res.status(400).json({ success: false, message: "itemName is required" });
    }

    let embedding = [];
    const analysis = await analyzeClosetImage(req.file.path, itemName);
    try {
      const formData = new FormData();
      formData.append("image", fs.createReadStream(req.file.path));
      const pythonRes = await axios.post(
        `${PYTHON_SERVICE_URL}/closet/embed`,
        formData,
        { headers: formData.getHeaders(), timeout: 10000 }
      );
      embedding = pythonRes.data.embedding || [];
    } catch (pyError) {
      console.error("[closetController] Python embed error:", pyError.message);
    }

    const imageUrl = `${req.protocol}://${req.get("host")}/uploads/${req.file.filename}`;

    const newItem = await ClosetItem.create({
      userId: req.user._id,
      itemName: itemName.trim(),
      category: category && category !== "auto" ? category : analysis.detectedCategory || "other",
      detectedCategory: analysis.detectedCategory || "",
      dominantColor: analysis.dominantColor || "",
      colors: analysis.colors || [],
      tags: analysis.tags || [],
      autoTagged: analysis.autoTagged || false,
      imageUrl,
      embedding,
    });

    res.status(201).json({ success: true, item: newItem });
  } catch (error) {
    console.error("[closetController] uploadClosetItem:", error.message);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

export const deleteClosetItem = async (req, res) => {
  try {
    const item = await ClosetItem.findOne({
      _id: req.params.id,
      userId: req.user._id,
    });

    if (!item) {
      return res.status(404).json({ success: false, message: "Item not found" });
    }

    const filePath = path.join(__dirname, "../uploads", path.basename(item.imageUrl));
    fs.unlink(filePath, () => {});

    await item.deleteOne();
    res.json({ success: true, message: "Item deleted" });
  } catch (error) {
    console.error("[closetController] deleteClosetItem:", error.message);
    res.status(500).json({ success: false, message: "Server error" });
  }
};
