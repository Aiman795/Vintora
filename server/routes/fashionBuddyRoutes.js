import express from "express";
import { suggestOutfit } from "../controllers/fashionBuddyController.js";
import { protect } from "../middleware/auth.js";

const router = express.Router();

function optionalAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    return protect(req, res, next);
  }
  next();
}

router.post("/suggest", optionalAuth, suggestOutfit);

export default router;