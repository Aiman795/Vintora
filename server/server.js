import dotenv from "dotenv";
dotenv.config();
import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import { createServer } from "http";
import { Server } from "socket.io";
import { connectDb } from "./config/db.js";
import authRoutes from "./routes/authRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import dataRoutes from "./routes/dataRoutes.js";
import bookingRoutes from "./routes/bookingRoutes.js";
import conversationRoutes from "./routes/conversationRoutes.js";
import messageRoutes from "./routes/messageRoutes.js";
import notificationRoutes from "./routes/notificationRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import reviewRoutes from "./routes/reviewRoutes.js";
import disputeRoutes from "./routes/disputeRoutes.js";
import historyRoutes from "./routes/historyRoutes.js";
import wishlistRoutes from "./routes/wishlistRoutes.js";


// ── ADD THESE 3 LINES (your AI routes) ──────────────────
import closetRoutes from "./routes/closetRoutes.js";
import searchRoutes from "./routes/searchRoutes.js";
import fashionBuddyRoutes from "./routes/fashionBuddyRoutes.js";
// ────────────────────────────────────────────────────────

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = createServer(app);
const port = process.env.PORT || 5000;
const connectedUsers = new Map();

app.use(
  cors({
    origin: function (origin, callback) {
      const allowed = [
        "https://vintora-lovat.vercel.app",
        "http://localhost:5173"
      ];
      if (!origin || allowed.includes(origin) || origin.endsWith(".vercel.app")) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true
  })
);
app.use(express.json());

const uploadDirs = [
  path.join(__dirname, "uploads"),
  path.join(process.cwd(), "uploads"),
  path.join(process.cwd(), "server", "uploads")
];

uploadDirs.forEach((dir) => {
  app.use("/uploads", express.static(dir));
});

app.get("/", (_req, res) => {
  res.json({ message: "Vintora API is running." });
});

app.use("/api", authRoutes);
app.use("/api/user", userRoutes);
app.use("/api/data", dataRoutes);
app.use("/api/bookings", bookingRoutes);
app.use("/api/conversations", conversationRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/reviews", reviewRoutes);
app.use("/api/disputes", disputeRoutes);
app.use("/api/history", historyRoutes);
app.use("/api/wishlist", wishlistRoutes);

// ── ADD THESE 3 LINES (register your AI routes) ─────────
app.use("/api/closet", closetRoutes);
app.use("/api/search", searchRoutes);
app.use("/api/buddy", fashionBuddyRoutes);
// ────────────────────────────────────────────────────────

app.use((req, res) => {
  res.status(404).json({ message: `Route not found: ${req.originalUrl}` });
});

const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    methods: ["GET", "POST"]
  }
});

app.set("io", io);

io.on("connection", (socket) => {
  console.log(`Socket connected: ${socket.id}`);

  socket.on("join", (userId) => {
    if (!userId) return;
    connectedUsers.set(userId, socket.id);
    socket.join(`user_${userId}`);
  });

  socket.on("call_user", ({ to, from, fromName, signal }) => {
    if (!to || !signal) return;
    io.to(`user_${to}`).emit("incoming_call", { from, fromName, signal });
  });

  socket.on("answer_call", ({ to, from, signal }) => {
    if (!to || !signal) return;
    io.to(`user_${to}`).emit("call_answered", { from, signal });
  });

  socket.on("ice_candidate", ({ to, from, candidate }) => {
    if (!to || !candidate) return;
    io.to(`user_${to}`).emit("ice_candidate", { from, candidate });
  });

  socket.on("end_call", ({ to, from }) => {
    if (!to) return;
    io.to(`user_${to}`).emit("call_ended", { from });
  });

  socket.on("disconnect", () => {
    for (const [userId, socketId] of connectedUsers.entries()) {
      if (socketId === socket.id) {
        connectedUsers.delete(userId);
        break;
      }
    }
    console.log(`Socket disconnected: ${socket.id}`);
  });
});

connectDb()
  .then(() => {
    server.listen(port, "0.0.0.0", () => {
      console.log(`Server running on port ${port}`);
    });
  })
  .catch((error) => {
    console.error("Failed to start server:", error.message);
    process.exit(1);
  });
