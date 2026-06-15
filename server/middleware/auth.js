import jwt from "jsonwebtoken";
import User from "../models/User.js";

export async function protect(req, res, next) {
  const header = req.headers.authorization;

  if (!header || !header.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Not authorized. Missing token." });
  }

  try {
    const token = header.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = await User.findById(decoded.id).select("-password");

    if (!req.user) {
      return res.status(401).json({ message: "User no longer exists." });
    }

    if (["Blocked", "Suspended"].includes(req.user.accountStatus)) {
      return res.status(403).json({ message: `Your account is ${req.user.accountStatus.toLowerCase()}. Contact Vintora support.` });
    }

    next();
  } catch (error) {
    return res.status(401).json({ message: "Not authorized. Invalid token." });
  }
}

export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ message: "Access denied for this role." });
    }

    next();
  };
}
