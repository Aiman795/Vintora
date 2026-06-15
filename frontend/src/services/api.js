import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:5000/api"
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("vintora_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export async function registerUser(payload) {
  const { data } = await api.post("/register", payload);
  return data;
}

export async function loginUser(payload) {
  const { data } = await api.post("/login", payload);
  return data;
}

export async function fetchProfile() {
  const { data } = await api.get("/user/profile");
  return data;
}

export async function fetchPublicListings() {
  const { data } = await api.get("/data/public");
  return data;
}

export async function fetchListingById(id) {
  const { data } = await api.get(`/data/public/${id}`);
  return data;
}

export async function fetchSellerProfile(id) {
  const { data } = await api.get(`/data/seller/${id}`);
  return data;
}

export async function fetchMyListings() {
  const { data } = await api.get("/data");
  return data;
}

export async function createListing(payload) {
  const { data } = await api.post("/data", payload);
  return data;
}

export async function uploadListingImages(files) {
  const formData = new FormData();
  Array.from(files || []).forEach((file) => formData.append("images", file));
  const { data } = await api.post("/data/uploads", formData, {
    headers: { "Content-Type": "multipart/form-data" }
  });
  return data.imageUrls || [];
}

export async function updateListing(id, payload) {
  const { data } = await api.put(`/data/${id}`, payload);
  return data;
}

export async function deleteListing(id) {
  const { data } = await api.delete(`/data/${id}`);
  return data;
}

export async function updateListingAvailability(id, availabilityStatus) {
  const { data } = await api.put(`/data/${id}/availability`, { availabilityStatus });
  return data;
}

export async function updateListingBlockedDates(id, blockedDates) {
  const { data } = await api.put(`/data/${id}/blocked-dates`, { blockedDates });
  return data;
}

export async function createBooking(payload) {
  const { data } = await api.post("/bookings", payload);
  return data;
}

export async function fetchBuyerBookings() {
  const { data } = await api.get("/bookings/buyer");
  return data;
}

export async function fetchSellerBookings() {
  const { data } = await api.get("/bookings/seller");
  return data;
}

export async function fetchUnavailableDates(listingId) {
  const { data } = await api.get(`/bookings/listing/${listingId}/unavailable-dates`);
  return data;
}

export async function approveBooking(id) {
  const { data } = await api.put(`/bookings/${id}/approve`);
  return data;
}

export async function rejectBooking(id) {
  const { data } = await api.put(`/bookings/${id}/reject`);
  return data;
}

export async function completeBooking(id) {
  const { data } = await api.put(`/bookings/${id}/complete`);
  return data;
}

export async function cancelBooking(id) {
  const { data } = await api.put(`/bookings/${id}/cancel`);
  return data;
}

export async function fetchSellerEarnings() {
  const { data } = await api.get("/bookings/seller/earnings");
  return data;
}

export async function fetchConversations() {
  const { data } = await api.get("/conversations");
  return data;
}

export async function createConversation(payload) {
  const { data } = await api.post("/conversations", payload);
  return data;
}

export async function fetchMessages(conversationId) {
  const { data } = await api.get(`/messages/${conversationId}`);
  return data;
}

export async function sendMessage(payload) {
  const { data } = await api.post("/messages", payload);
  return data;
}

export async function fetchNotifications() {
  const { data } = await api.get("/notifications");
  return data;
}

export async function markNotificationRead(id) {
  const { data } = await api.put(`/notifications/${id}/read`);
  return data;
}

export async function markAllNotificationsRead(payload = {}) {
  const { data } = await api.put("/notifications/read-all", payload);
  return data;
}

export async function fetchAdminSummary() {
  const { data } = await api.get("/admin/summary");
  return data;
}

export async function fetchAdminListings(status = "Pending Approval") {
  const { data } = await api.get(`/admin/listings?status=${encodeURIComponent(status)}`);
  return data;
}

export async function approveListing(id) {
  const { data } = await api.put(`/admin/listings/${id}/approve`);
  return data;
}

export async function rejectListing(id) {
  const { data } = await api.put(`/admin/listings/${id}/reject`);
  return data;
}

export async function fetchAdminUsers() {
  const { data } = await api.get("/admin/users");
  return data;
}

export async function updateAdminUserRole(id, role) {
  const { data } = await api.put(`/admin/users/${id}/role`, { role });
  return data;
}

export async function updateAdminUserStatus(id, accountStatus) {
  const { data } = await api.put(`/admin/users/${id}/status`, { accountStatus });
  return data;
}

export async function updateAdminUserVerification(id, payload) {
  const { data } = await api.put(`/admin/users/${id}/verification`, payload);
  return data;
}

export async function fetchAdminDisputes() {
  const { data } = await api.get("/admin/disputes");
  return data;
}

export async function resolveAdminDispute(id, resolution) {
  const { data } = await api.put(`/admin/disputes/${id}/resolve`, { resolution });
  return data;
}

export async function fetchAdminDisputeEvidence(id) {
  const { data } = await api.get(`/admin/disputes/${id}/evidence`);
  return data;
}

export async function fetchMyReviews() {
  const { data } = await api.get("/reviews/mine");
  return data;
}

export async function submitReview(payload) {
  const { data } = await api.post("/reviews", payload);
  return data;
}

export async function fetchListingReviews(listingId) {
  const { data } = await api.get(`/reviews/listing/${listingId}`);
  return data;
}

export async function fetchMyDisputes() {
  const { data } = await api.get("/disputes/mine");
  return data;
}

export async function createDispute(payload) {
  const { data } = await api.post("/disputes", payload);
  return data;
}

export async function fetchHistory() {
  const { data } = await api.get("/history");
  return data;
}

export async function fetchWishlist() {
  const { data } = await api.get("/wishlist");
  return data;
}

export async function saveWishlistItem(listingId) {
  const { data } = await api.post(`/wishlist/${listingId}`);
  return data;
}

export async function removeWishlistItem(listingId) {
  const { data } = await api.delete(`/wishlist/${listingId}`);
  return data;
}

// ── PYTHON SERVICE BASE URLs ─────────────────────────────────────────────────
const PYTHON_URL = import.meta.env.VITE_PYTHON_URL || "http://localhost:8000";
const TRYON_URL  = import.meta.env.VITE_TRYON_URL  || "http://localhost:8001";

// ── VIRTUAL SEARCH ───────────────────────────────────────────────────────────
export async function visualSearch(imageFile) {
  const formData = new FormData();
  formData.append("image", imageFile);
  const { data } = await api.post("/search/visual", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data;
}

// ── SMART CLOSET ─────────────────────────────────────────────────────────────
// Get all closet items for the logged-in user
export async function fetchClosetItems() {
  const { data } = await api.get("/closet");
  return data;
}

// Upload a new item to the smart closet
export async function addClosetItem(imageFile, metadata = {}) {
  const formData = new FormData();
  formData.append("image", imageFile);
  Object.entries(metadata).forEach(([k, v]) => formData.append(k, v));
  const token = localStorage.getItem("vintora_token");
  const res = await fetch(`${PYTHON_URL}/closet/upload`, {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: formData,
  });
  if (!res.ok) throw new Error("Failed to add closet item");
  return res.json();
}

// Get AI outfit suggestions from smart closet
export async function getOutfitSuggestions(occasion = "") {
  const token = localStorage.getItem("vintora_token");
  const res = await fetch(`${PYTHON_URL}/closet/suggest?occasion=${occasion}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) throw new Error("Failed to get outfit suggestions");
  return res.json();
}

// ── AI FASHION BUDDY ─────────────────────────────────────────────────────────
// Send a chat message to the AI Fashion Buddy
export async function chatWithBuddy(message, context = {}) {
  const res = await fetch(`${PYTHON_URL}/buddy/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message, ...context }),
  });
  if (!res.ok) throw new Error("Fashion Buddy unavailable");
  return res.json(); // returns { reply, suggestions: [...] }
}

// Get full outfit recommendation from AI Buddy
export async function getBuddyRecommendation(occasion, size, budget, colors = []) {
  const res = await fetch(`${PYTHON_URL}/buddy/recommend`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ occasion, size, budget, colors }),
  });
  if (!res.ok) throw new Error("Fashion Buddy recommendation failed");
  return res.json(); // returns { outfit: [...], note: "..." }
}

// ── VIRTUAL TRY-ON ───────────────────────────────────────────────────────────
// Send person photo + garment photo to get try-on result
export async function virtualTryOn(personFile, garmentFile, measurements = {}) {
  const formData = new FormData();
  formData.append("person", personFile);
  formData.append("garment", garmentFile);
  if (measurements.chest) formData.append("chest", measurements.chest);
  if (measurements.waist) formData.append("waist", measurements.waist);
  if (measurements.length) formData.append("length", measurements.length);
  if (measurements.brand) formData.append("brand", measurements.brand || "Khaadi");

  const res = await fetch(`${TRYON_URL}/tryon`, {
    method: "POST",
    body: formData,
  });
  if (!res.ok) throw new Error("Virtual Try-On failed");
  return res.json();
  // returns { category, tryon_image: "/result", fit_score: { recommended_size, confidence, explanation } }
}

// Get the try-on result image URL directly
export function getTryOnResultUrl() {
  return `${TRYON_URL}/result`;
}

// Classify a garment image (what category it is)
export async function classifyGarment(imageFile) {
  const formData = new FormData();
  formData.append("file", imageFile);
  const res = await fetch(`${TRYON_URL}/classify`, {
    method: "POST",
    body: formData,
  });
  if (!res.ok) throw new Error("Garment classification failed");
  return res.json(); // returns { category: "Formal" | "Semi Formal" | etc. }
}

// Get fit score / size recommendation
export async function getFitScore(chest, waist, length, brand = "Khaadi") {
  const formData = new FormData();
  formData.append("chest", chest);
  formData.append("waist", waist);
  formData.append("length", length);
  formData.append("brand", brand);
  const res = await fetch(`${TRYON_URL}/fitscore`, {
    method: "POST",
    body: formData,
  });
  if (!res.ok) throw new Error("Fit score failed");
  return res.json();
}
export default api;

export async function fetchAdminBookings(status = "all") {
  const { data } = await api.get(`/admin/bookings?status=${encodeURIComponent(status)}`);
  return data;
}
export async function updateProfile(payload) {
  const { data } = await api.put("/user/profile", payload);
  return data;
}