import ClosetItem from "../models/ClosetItem.js";
import axios from "axios";
import FormData from "form-data";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PYTHON_SERVICE_URL = process.env.PYTHON_SERVICE_URL || "http://localhost:8000";

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
      category: category || "other",
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
