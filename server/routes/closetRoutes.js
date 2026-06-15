// backend/routes/closetRoutes.js

import express from "express";
import multer from "multer";
import path from "path";
import { fileURLToPath } from "url";

import {
  getClosetItems,
  uploadClosetItem,
  deleteClosetItem,
} from "../controllers/closetController.js";

import { protect } from "../middleware/auth.js";

const router = express.Router();

// ── Multer config ────────────────────────────────────────────────────────────

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, "../uploads")),
  filename: (req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `closet-${unique}${path.extname(file.originalname)}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png|webp/;
    const ok =
      allowed.test(path.extname(file.originalname).toLowerCase()) &&
      allowed.test(file.mimetype);
    ok ? cb(null, true) : cb(new Error("Images only (jpg, png, webp)"));
  },
});

// ── Routes ───────────────────────────────────────────────────────────────────
router.get("/", protect, getClosetItems);
router.post("/upload", protect, upload.single("image"), uploadClosetItem);
router.delete("/:id", protect, deleteClosetItem);

export default router;