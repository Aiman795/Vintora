// backend/controllers/searchController.js

import axios from "axios";
import FormData from "form-data";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import Listing from "../models/Listing.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const visualSearch = async (req, res) => {
  let imagePath;
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No image uploaded" });
    }

    imagePath = path.join(__dirname, "../uploads", req.file.filename);

    const formData = new FormData();
    formData.append("image", fs.createReadStream(imagePath));

    const pythonServiceUrl = process.env.PYTHON_SERVICE_URL || "http://localhost:8000";
    const pythonResponse = await axios.post(
      `${pythonServiceUrl}/search`,
      formData,
      {
        headers: formData.getHeaders(),
        timeout: 20000,
      }
    );

    fs.unlinkSync(imagePath);
    imagePath = null;

    const rawResults = Array.isArray(pythonResponse.data?.results) ? pythonResponse.data.results : [];
    const pythonSucceeded = pythonResponse.data?.success !== false;
    const resultIds = rawResults.map((item) => item._id || item.id).filter(Boolean);
    const listings = resultIds.length
      ? await Listing.find({ _id: { $in: resultIds }, status: "Live" }).lean()
      : [];
    const listingsById = new Map(listings.map((listing) => [listing._id.toString(), listing]));
    const hydratedResults = rawResults
      .map((item, index) => {
        const id = String(item._id || item.id || "");
        const listing = listingsById.get(id);
        if (!listing) return null;
        return {
          ...listing,
          id: listing._id,
          _id: listing._id,
          similarity: item.similarity || null,
        };
      })
      .filter(Boolean);

    return res.status(200).json({
      success: true,
      source: "visual-search",
      results: pythonSucceeded ? hydratedResults : [],
      message: hydratedResults.length ? "Visual match found." : "No confident visual match found.",
    });
  } catch (error) {
    console.error("Visual search error:", error.message);
    if (imagePath && fs.existsSync(imagePath)) {
      fs.unlinkSync(imagePath);
    }

    return res.status(200).json({
      success: true,
      source: "visual-search-offline",
      message: "AI visual search service is offline. No fallback catalog items were shown.",
      results: [],
    });
  }
};
