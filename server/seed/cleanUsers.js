import dotenv from "dotenv";
import mongoose from "mongoose";
import Booking from "../models/Booking.js";
import ClosetItem from "../models/ClosetItem.js";
import Conversation from "../models/Conversation.js";
import Dispute from "../models/Dispute.js";
import Listing from "../models/Listing.js";
import Message from "../models/Message.js";
import Notification from "../models/Notification.js";
import Review from "../models/Review.js";
import User from "../models/User.js";

dotenv.config();

const args = process.argv.slice(2);
const shouldList = args.includes("--list");
const shouldDelete = args.includes("--delete");
const confirmed = args.includes("--yes");
const rolesArg = args.find((arg) => arg.startsWith("--roles="));
const emailsArg = args.find((arg) => arg.startsWith("--emails="));
const keepArg = args.find((arg) => arg.startsWith("--keep="));
const emails = emailsArg
  ? emailsArg
      .replace("--emails=", "")
      .split(",")
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean)
  : [];
const keepEmails = keepArg
  ? keepArg
      .replace("--keep=", "")
      .split(",")
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean)
  : [];
const roles = rolesArg
  ? rolesArg
      .replace("--roles=", "")
      .split(",")
      .map((role) => role.trim())
      .filter(Boolean)
  : ["buyer", "seller", "renter"];

function printUsage() {
  console.log("Usage:");
  console.log("  npm run users:list");
  console.log("  npm run users:clean -- --yes");
  console.log("  npm run users:clean -- --roles=buyer --yes");
  console.log("  npm run users:clean -- --roles=seller --yes");
  console.log("  npm run users:clean -- --emails=demo.seller@vintora.com --yes");
  console.log("  npm run users:clean -- --keep=your@email.com --yes");
}

async function listUsers() {
  const users = await User.find({}).sort({ role: 1, email: 1 }).select("name email role createdAt");

  if (users.length === 0) {
    console.log("No users found.");
    return;
  }

  console.table(
    users.map((user) => ({
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      role: user.role,
      createdAt: user.createdAt?.toISOString()
    }))
  );
}

async function deleteUsersByRole() {
  const filter =
    emails.length > 0
      ? { email: { $in: emails } }
      : keepEmails.length > 0
        ? { role: { $in: roles }, email: { $nin: keepEmails } }
        : { role: { $in: roles } };
  const users = await User.find(filter).select("_id email role");
  const userIds = users.map((user) => user._id);

  if (userIds.length === 0) {
    console.log(emails.length > 0 ? `No users found for emails: ${emails.join(", ")}` : `No users found for roles: ${roles.join(", ")}`);
    return;
  }

  if (!confirmed) {
    const scope = emails.length > 0 ? `emails: ${emails.join(", ")}` : `roles: ${roles.join(", ")}`;
    console.log(`This will delete ${userIds.length} user(s) matching ${scope}`);
    if (keepEmails.length > 0) {
      console.log(`Keeping: ${keepEmails.join(", ")}`);
    }
    console.table(users.map((user) => ({ email: user.email, role: user.role })));
    console.log("Run again with --yes to confirm.");
    return;
  }

  const conversations = await Conversation.find({ participants: { $in: userIds } }).select("_id");
  const conversationIds = conversations.map((conversation) => conversation._id);
  const listings = await Listing.find({ owner: { $in: userIds } }).select("_id");
  const listingIds = listings.map((listing) => listing._id);
  const bookings = await Booking.find({
    $or: [{ buyer: { $in: userIds } }, { seller: { $in: userIds } }, { listing: { $in: listingIds } }]
  }).select("_id");
  const bookingIds = bookings.map((booking) => booking._id);

  const results = await Promise.all([
    Message.deleteMany({
      $or: [{ sender: { $in: userIds } }, { receiver: { $in: userIds } }, { conversation: { $in: conversationIds } }]
    }),
    Notification.deleteMany({
      $or: [
        { user: { $in: userIds } },
        { sender: { $in: userIds } },
        { conversation: { $in: conversationIds } },
        { booking: { $in: bookingIds } }
      ]
    }),
    Conversation.deleteMany({ _id: { $in: conversationIds } }),
    Booking.deleteMany({ _id: { $in: bookingIds } }),
    Dispute.deleteMany({
      $or: [
        { raisedBy: { $in: userIds } },
        { againstUser: { $in: userIds } },
        { listing: { $in: listingIds } },
        { booking: { $in: bookingIds } }
      ]
    }),
    Review.deleteMany({
      $or: [
        { reviewer: { $in: userIds } },
        { seller: { $in: userIds } },
        { listing: { $in: listingIds } },
        { booking: { $in: bookingIds } }
      ]
    }),
    ClosetItem.deleteMany({ userId: { $in: userIds } }),
    Listing.deleteMany({ _id: { $in: listingIds } }),
    User.deleteMany({ _id: { $in: userIds } })
  ]);

  console.log("Cleanup complete.");
  console.table([
    { collection: "messages", deleted: results[0].deletedCount },
    { collection: "notifications", deleted: results[1].deletedCount },
    { collection: "conversations", deleted: results[2].deletedCount },
    { collection: "bookings", deleted: results[3].deletedCount },
    { collection: "disputes", deleted: results[4].deletedCount },
    { collection: "reviews", deleted: results[5].deletedCount },
    { collection: "closetItems", deleted: results[6].deletedCount },
    { collection: "listings", deleted: results[7].deletedCount },
    { collection: "users", deleted: results[8].deletedCount }
  ]);
}

async function main() {
  if (!process.env.MONGODB_URI) {
    throw new Error("MONGODB_URI is missing from .env");
  }

  await mongoose.connect(process.env.MONGODB_URI);

  if (shouldList) {
    await listUsers();
  } else if (shouldDelete) {
    await deleteUsersByRole();
  } else {
    printUsage();
  }
}

main()
  .catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
