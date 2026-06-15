import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import {
  approveBooking,
  completeBooking,
  createDispute,
  createListing,
  deleteListing,
  fetchBuyerBookings,
  fetchConversations,
  fetchHistory,
  fetchMessages,
  fetchMyDisputes,
  fetchMyListings,
  fetchMyReviews,
  fetchSellerBookings,
  fetchSellerEarnings,
  rejectBooking,
  submitReview,
  updateListing,
  updateListingAvailability,
  updateListingBlockedDates,
  uploadListingImages
} from "../services/api.js";

const initialForm = {
  title: "",
  category: "Lehenga / Sharara",
  occasion: "Barat",
  type: "Rent",
  price: 0,
  pricingModel: "per day",
  deposit: 0,
  city: "Islamabad",
  size: "M",
  material: "",
  condition: "Pre-loved",
  description: "",
  imageEmoji: "",
  imageToneClass: "c1",
  imageUrls: [],
  tags: ""
};

const categoryOptions = [
  "Lehenga / Sharara",
  "Gharara / Farshi",
  "Anarkali",
  "Shalwar Kameez",
  "Kurta (Casual)",
  "Co-ord Set",
  "Bridal Wear",
  "Gown",
  "Saree",
  "Sherwani / Kurta",
  "Jewellery",
  "Necklace / Choker",
  "Bangles / Kara",
  "Footwear",
  "Khussa / Kheri",
  "Bags & Clutches",
  "Dupatta / Shawl",
  "Hair Accessories",
  "Accessories"
];

const occasionOptions = ["Barat", "Mehndi", "Walima", "Eid", "Party", "Formal", "Casual"];
const cityOptions = ["Islamabad", "Rawalpindi", "Lahore", "Karachi", "Faisalabad", "Multan", "Peshawar"];
const sizeOptions = ["XS", "S", "M", "L", "XL", "One Size", "37", "38", "39", "40"];
const conditionOptions = ["New", "Excellent", "Good", "Pre-loved"];

const sellerSections = ["overview", "listings", "bookings", "messages", "earnings", "reviews", "disputes", "history", "settings"];
const buyerSections = ["overview", "bookings", "messages", "reviews", "disputes", "history", "settings"];

function formatBookingStatus(status) {
  const map = {
    pending: "Pending Seller Approval",
    approved: "Approved",
    rejected: "Rejected",
    cancelled: "Cancelled",
    completed: "Completed"
  };

  return map[status] || status;
}

function formatDisputeStatus(status) {
  const map = {
    open: "Disputed",
    reviewing: "Disputed",
    resolved: "Resolved",
    cancelled: "Cancelled"
  };

  return map[status] || status;
}

function formatListingStatus(status) {
  const map = {
    "Pending Approval": "Pending Seller Approval",
    Live: "Approved",
    Archived: "Cancelled"
  };

  return map[status] || status;
}

function BookingTimeline({ status, reviewed = false }) {
  const steps = ["Requested", "Approved", "Completed", "Reviewed"];
  const activeIndex = status === "completed" ? (reviewed ? 3 : 2) : status === "approved" ? 1 : 0;

  return (
    <div className="booking-timeline">
      {steps.map((step, index) => (
        <span className={index <= activeIndex ? "done" : ""} key={step}>{step}</span>
      ))}
    </div>
  );
}

function bookingClass(status) {
  if (status === "pending") {
    return "pending";
  }

  if (status === "approved" || status === "completed") {
    return "confirmed";
  }

  return "rented";
}

function statusPillClass(status) {
  if (status === "open" || status === "reviewing") {
    return "pending";
  }

  if (status === "resolved") {
    return "confirmed";
  }

  return bookingClass(status);
}

function formatHistoryDate(date) {
  if (!date) {
    return "N/A";
  }

  return new Date(date).toLocaleString();
}

export default function DashboardPage() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const role = user?.role || "buyer";
  const isSeller = role === "seller";
  const isAdmin = role === "admin";
  const availableSections = isSeller ? sellerSections : buyerSections;

  const requestedSection = searchParams.get("section");
  const [activeSection, setActiveSection] = useState(availableSections.includes(requestedSection) ? requestedSection : "overview");
  const [listings, setListings] = useState([]);
  const [sellerBookings, setSellerBookings] = useState([]);
  const [buyerBookings, setBuyerBookings] = useState([]);
  const [earnings, setEarnings] = useState({
    totalEarnings: 0,
    monthlyEarnings: 0,
    approvedCount: 0,
    pendingRequests: 0,
    topListings: []
  });
  const [form, setForm] = useState(initialForm);
  const [listingImageFiles, setListingImageFiles] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [dashboardMessages, setDashboardMessages] = useState([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [reviews, setReviews] = useState([]);
  const [disputes, setDisputes] = useState([]);
  const [history, setHistory] = useState({ bookings: [], messages: [], disputes: [], reviews: [], timeline: [] });
  const [reviewForm, setReviewForm] = useState({ bookingId: "", rating: 5, comment: "" });
  const [disputeForm, setDisputeForm] = useState({ bookingId: "", reason: "", details: "" });
  const [blockedForms, setBlockedForms] = useState({});

  const loadSellerData = async () => {
    const [listingData, bookingData, earningsData] = await Promise.all([
      fetchMyListings(),
      fetchSellerBookings(),
      fetchSellerEarnings()
    ]);
    setListings(listingData);
    setSellerBookings(bookingData);
    setEarnings(earningsData);
  };

  const loadBuyerData = async () => {
    const bookingData = await fetchBuyerBookings();
    setBuyerBookings(bookingData);
  };

  const reloadDashboard = async () => {
    if (isSeller) {
      await loadSellerData();
    } else {
      await loadBuyerData();
    }
  };

  const loadDashboardMessages = async () => {
    setMessagesLoading(true);

    try {
      const conversationData = await fetchConversations();
      const conversationsWithPreview = await Promise.all(
        conversationData.map(async (conversation) => {
          try {
            const conversationMessages = await fetchMessages(conversation._id);
            return {
              ...conversation,
              latestMessage: conversationMessages[conversationMessages.length - 1] || null
            };
          } catch (_error) {
            return {
              ...conversation,
              latestMessage: null
            };
          }
        })
      );

      setDashboardMessages(conversationsWithPreview);
    } catch (_error) {
      setDashboardMessages([]);
    } finally {
      setMessagesLoading(false);
    }
  };

  const loadReviews = async () => {
    try {
      const reviewData = await fetchMyReviews();
      setReviews(reviewData);
    } catch (_error) {
      setReviews([]);
    }
  };

  const loadDisputes = async () => {
    try {
      const disputeData = await fetchMyDisputes();
      setDisputes(disputeData);
    } catch (_error) {
      setDisputes([]);
    }
  };

  const loadHistory = async () => {
    try {
      const historyData = await fetchHistory();
      setHistory(historyData);
    } catch (_error) {
      setHistory({ bookings: [], messages: [], disputes: [], reviews: [], timeline: [] });
    }
  };

  useEffect(() => {
    reloadDashboard().catch(() => {
      setListings([]);
      setSellerBookings([]);
      setBuyerBookings([]);
    });
  }, [isSeller]);

  useEffect(() => {
    if (availableSections.includes(requestedSection)) {
      setActiveSection(requestedSection);
    }
  }, [requestedSection, availableSections]);

  useEffect(() => {
    if (activeSection === "messages") {
      loadDashboardMessages();
    }
  }, [activeSection, user?._id, user?.id]);

  useEffect(() => {
    if (activeSection === "reviews") {
      loadReviews();
    }

    if (activeSection === "disputes") {
      loadDisputes();
    }

    if (activeSection === "history") {
      loadHistory();
    }
  }, [activeSection, user?._id, user?.id]);

  useEffect(() => {
    setBlockedForms((current) => {
      const next = { ...current };
      listings.forEach((listing) => {
        if (!next[listing._id]) {
          next[listing._id] = { startDate: "", endDate: "", reason: "" };
        }
      });
      return next;
    });
  }, [listings]);

  const sellerKpis = useMemo(() => {
    const averageRating = listings.length
      ? (listings.reduce((sum, item) => sum + (item.rating || 0), 0) / listings.length).toFixed(1)
      : "0.0";

    return {
      totalEarnings: earnings.totalEarnings || 0,
      activeListings: listings.length,
      activeBookings: sellerBookings.filter((booking) => booking.status === "approved").length,
      averageRating
    };
  }, [earnings.totalEarnings, listings, sellerBookings]);

  const buyerKpis = useMemo(() => {
    return {
      totalRequests: buyerBookings.length,
      pendingBookings: buyerBookings.filter((booking) => booking.status === "pending").length,
      approvedBookings: buyerBookings.filter((booking) => booking.status === "approved").length,
      spent: buyerBookings
        .filter((booking) => ["approved", "completed"].includes(booking.status))
        .reduce((sum, booking) => sum + booking.amount, 0)
    };
  }, [buyerBookings]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => {
      if (name === "type") {
        return {
          ...current,
          type: value,
          pricingModel: value === "Sell" ? "fixed price" : "per day",
          deposit: value === "Sell" ? 0 : current.deposit
        };
      }
      return { ...current, [name]: value };
    });
  };

  const handleListingImagesChange = (event) => {
    const selected = Array.from(event.target.files || []);
    setListingImageFiles((current) => {
      const combined = [...current, ...selected];
      const uniqueFiles = combined.filter((file, index, allFiles) => {
        return allFiles.findIndex((candidate) => (
          candidate.name === file.name &&
          candidate.size === file.size &&
          candidate.lastModified === file.lastModified
        )) === index;
      });
      return uniqueFiles.slice(0, 5);
    });
    event.target.value = "";
  };

  const handleRemoveListingImage = (indexToRemove) => {
    setListingImageFiles((current) => current.filter((_file, index) => index !== indexToRemove));
  };

  const handleEdit = (listing) => {
    setEditingId(listing._id);
    setActiveSection("listings");
    setForm({
      title: listing.title || "",
      category: listing.category || "Lehenga / Sharara",
      occasion: listing.occasion || "Barat",
      type: listing.type || "Rent",
      price: listing.price || 0,
      pricingModel: listing.pricingModel || "per day",
      deposit: listing.deposit || 0,
      city: listing.city || "Islamabad",
      size: listing.size || "M",
      material: listing.material || "",
      condition: listing.condition || "Pre-loved",
      description: listing.description || "",
      imageEmoji: listing.imageEmoji || "",
      imageToneClass: listing.imageToneClass || "c1",
      imageUrls: listing.imageUrls || [],
      tags: (listing.tags || []).join(", ")
    });
    setListingImageFiles([]);
  };

  const handleDelete = async (id) => {
    setLoading(true);
    setMessage("");

    try {
      await deleteListing(id);
      await reloadDashboard();
      setMessage("Listing deleted successfully.");
    } catch (error) {
      setMessage(error.response?.data?.message || "Unable to delete listing.");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      if (!form.title.trim()) {
        throw new Error("Please enter a listing title.");
      }

      if (!form.description.trim()) {
        throw new Error("Please add a description for the listing.");
      }

      if (Number(form.price) <= 0) {
        throw new Error("Please enter a price greater than 0.");
      }

      let imageUrls = form.imageUrls || [];

      if (listingImageFiles.length) {
        imageUrls = await uploadListingImages(listingImageFiles);
      }

      const payload = {
        title: form.title,
        category: form.category,
        occasion: form.occasion,
        type: form.type,
        price: Number(form.price),
        pricingModel: form.pricingModel,
        deposit: Number(form.deposit),
        city: form.city,
        size: form.size,
        material: form.material,
        condition: form.condition,
        description: form.description,
        imageEmoji: form.imageEmoji,
        imageToneClass: form.imageToneClass,
        imageUrls,
        tags: form.tags
          .split(",")
          .map((tag) => tag.trim())
          .filter(Boolean)
      };

      if (editingId) {
        await updateListing(editingId, payload);
        setMessage("Listing updated and sent for admin approval.");
      } else {
        await createListing(payload);
        setMessage("Listing submitted for admin approval.");
      }

      setForm(initialForm);
      setListingImageFiles([]);
      setEditingId(null);
      await reloadDashboard();
    } catch (error) {
      setMessage(error.response?.data?.error || error.response?.data?.message || error.message || "Unable to save listing.");
    } finally {
      setLoading(false);
    }
  };

  const handleAvailabilityChange = async (listingId, availabilityStatus) => {
    setMessage("");
    try {
      await updateListingAvailability(listingId, availabilityStatus);
      await reloadDashboard();
      setMessage("Listing availability updated.");
    } catch (error) {
      setMessage(error.response?.data?.message || "Unable to update availability.");
    }
  };

  const handleBlockedFormChange = (listingId, field, value) => {
    setBlockedForms((current) => ({
      ...current,
      [listingId]: {
        ...(current[listingId] || { startDate: "", endDate: "", reason: "" }),
        [field]: value
      }
    }));
  };

  const handleAddBlockedDate = async (listing) => {
    const formValue = blockedForms[listing._id] || {};
    if (!formValue.startDate || !formValue.endDate) {
      setMessage("Choose start and end dates before blocking availability.");
      return;
    }

    try {
      const blockedDates = [
        ...(listing.blockedDates || []),
        {
          startDate: formValue.startDate,
          endDate: formValue.endDate,
          reason: formValue.reason || "Seller unavailable"
        }
      ];
      await updateListingBlockedDates(listing._id, blockedDates);
      await reloadDashboard();
      setBlockedForms((current) => ({ ...current, [listing._id]: { startDate: "", endDate: "", reason: "" } }));
      setMessage("Seller calendar blocked dates updated.");
    } catch (error) {
      setMessage(error.response?.data?.message || "Unable to block dates.");
    }
  };

  const handleRemoveBlockedDate = async (listing, blockedId) => {
    try {
      const blockedDates = (listing.blockedDates || []).filter((item) => item._id !== blockedId);
      await updateListingBlockedDates(listing._id, blockedDates);
      await reloadDashboard();
      setMessage("Blocked date removed.");
    } catch (error) {
      setMessage(error.response?.data?.message || "Unable to remove blocked date.");
    }
  };

  const handleApproveBooking = async (bookingId) => {
    setMessage("");
    try {
      await approveBooking(bookingId);
      await reloadDashboard();
      setMessage("Booking approved successfully.");
    } catch (error) {
      setMessage(error.response?.data?.message || "Unable to approve booking.");
    }
  };

  const handleRejectBooking = async (bookingId) => {
    setMessage("");
    try {
      await rejectBooking(bookingId);
      await reloadDashboard();
      setMessage("Booking rejected successfully.");
    } catch (error) {
      setMessage(error.response?.data?.message || "Unable to reject booking.");
    }
  };

  const handleCompleteBooking = async (bookingId) => {
    setMessage("");
    try {
      await completeBooking(bookingId);
      await reloadDashboard();
      setMessage("Booking marked as completed.");
    } catch (error) {
      setMessage(error.response?.data?.message || "Unable to complete booking.");
    }
  };

  const handleReviewSubmit = async (event) => {
    event.preventDefault();
    setMessage("");

    try {
      await submitReview({
        bookingId: reviewForm.bookingId,
        rating: Number(reviewForm.rating),
        comment: reviewForm.comment
      });
      setReviewForm({ bookingId: "", rating: 5, comment: "" });
      await Promise.all([loadReviews(), reloadDashboard()]);
      setMessage("Review submitted successfully.");
    } catch (error) {
      setMessage(error.response?.data?.message || "Unable to submit review.");
    }
  };

  const handleDisputeSubmit = async (event) => {
    event.preventDefault();
    setMessage("");

    try {
      await createDispute(disputeForm);
      setDisputeForm({ bookingId: "", reason: "", details: "" });
      await loadDisputes();
      setMessage("Dispute filed for admin review.");
    } catch (error) {
      setMessage(error.response?.data?.message || "Unable to file dispute.");
    }
  };

  const sellerRecentBookings = sellerBookings.slice(0, 5);
  const buyerRecentBookings = buyerBookings.slice(0, 5);
  const activeBookings = isSeller ? sellerBookings : buyerBookings;
  const completedReviewBookings = buyerBookings.filter((booking) => booking.status === "completed");
  const reviewedBookingIds = new Set(reviews.map((review) => review.booking?._id || review.booking));
  const reviewableBookings = completedReviewBookings.filter((booking) => !reviewedBookingIds.has(booking._id));
  const disputableBookings = activeBookings.filter((booking) => ["pending", "approved", "completed"].includes(booking.status));

  return (
    <main className="page">
      <div className="dash-layout">
        <aside className="dash-sidebar">
          <div className="dash-sidebar-logo">Vintora</div>
          <div className="dash-nav">
            <button className={`dash-nav-item ${activeSection === "overview" ? "active" : ""}`} onClick={() => setActiveSection("overview")} type="button">
              <span className="dicon">&#9632;</span> Overview
            </button>
            {isSeller ? (
              <button className={`dash-nav-item ${activeSection === "listings" ? "active" : ""}`} onClick={() => setActiveSection("listings")} type="button">
                <span className="dicon">&#9670;</span> My Listings
              </button>
            ) : null}
            <button className={`dash-nav-item ${activeSection === "bookings" ? "active" : ""}`} onClick={() => setActiveSection("bookings")} type="button">
              <span className="dicon">&#9671;</span> Bookings
            </button>
            <button className={`dash-nav-item ${activeSection === "messages" ? "active" : ""}`} onClick={() => setActiveSection("messages")} type="button">
              <span className="dicon">&#9633;</span> Messages
            </button>
            {isSeller ? (
              <button className={`dash-nav-item ${activeSection === "earnings" ? "active" : ""}`} onClick={() => setActiveSection("earnings")} type="button">
                <span className="dicon">&#9651;</span> Earnings
              </button>
            ) : null}
            <button className={`dash-nav-item ${activeSection === "reviews" ? "active" : ""}`} onClick={() => setActiveSection("reviews")} type="button">
              <span className="dicon">&#9734;</span> Reviews
            </button>
            <button className={`dash-nav-item ${activeSection === "disputes" ? "active" : ""}`} onClick={() => setActiveSection("disputes")} type="button">
              <span className="dicon">&#9655;</span> Disputes
            </button>
            <button className={`dash-nav-item ${activeSection === "history" ? "active" : ""}`} onClick={() => setActiveSection("history")} type="button">
              <span className="dicon">&#9673;</span> History
            </button>
            <button className={`dash-nav-item ${activeSection === "settings" ? "active" : ""}`} onClick={() => setActiveSection("settings")} type="button">
              <span className="dicon">&#9679;</span> Settings
            </button>
          </div>
        </aside>

        <section className="dash-main">
          <div className="dash-top-bar">
            <div>
              <h2>Good morning, {user?.name?.split(" ")[0] || "User"}</h2>
              <p>
                {isSeller
                  ? "Manage listings, approve bookings, and track earnings."
                  : "Track your booking requests, messages, and shopping activity."}
              </p>
            </div>
            {isSeller ? (
              <button className="btn btn-primary" onClick={() => setActiveSection("listings")} type="button">
                {editingId ? "Editing Listing" : "+ New Listing"}
              </button>
            ) : (
              <Link className="btn btn-primary" to="/browse">
                Browse Listings
              </Link>
            )}
          </div>

          {message ? (
            <div className="data-card" style={{ marginBottom: "20px" }}>
              <p className="muted-note" style={{ margin: 0 }}>
                {message}
              </p>
            </div>
          ) : null}

          {activeSection === "overview" ? (
            <>
              <div className="kpi-row" style={{ margin: "24px 0" }}>
                {isSeller ? (
                  <>
                    <div className="kpi-block">
                      <div className="klabel">Total Earnings</div>
                      <div className="kval">Rs. {sellerKpis.totalEarnings.toLocaleString()}</div>
                      <div className="kchange">Approved booking income</div>
                    </div>
                    <div className="kpi-block">
                      <div className="klabel">Active Listings</div>
                      <div className="kval">{sellerKpis.activeListings}</div>
                      <div className="kchange">Products managed by seller</div>
                    </div>
                    <div className="kpi-block">
                      <div className="klabel">Approved Bookings</div>
                      <div className="kval">{sellerKpis.activeBookings}</div>
                      <div className="kchange">Current approved bookings</div>
                    </div>
                    <div className="kpi-block">
                      <div className="klabel">Average Rating</div>
                      <div className="kval">{sellerKpis.averageRating} ★</div>
                      <div className="kchange">Calculated from your listings</div>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="kpi-block">
                      <div className="klabel">My Booking Requests</div>
                      <div className="kval">{buyerKpis.totalRequests}</div>
                      <div className="kchange">All requests you submitted</div>
                    </div>
                    <div className="kpi-block">
                      <div className="klabel">Pending Bookings</div>
                      <div className="kval">{buyerKpis.pendingBookings}</div>
                      <div className="kchange">Waiting for seller response</div>
                    </div>
                    <div className="kpi-block">
                      <div className="klabel">Approved Bookings</div>
                      <div className="kval">{buyerKpis.approvedBookings}</div>
                      <div className="kchange">Confirmed by sellers</div>
                    </div>
                    <div className="kpi-block">
                      <div className="klabel">Spent on Rentals</div>
                      <div className="kval">Rs. {buyerKpis.spent.toLocaleString()}</div>
                      <div className="kchange">Approved rental/purchase requests</div>
                    </div>
                  </>
                )}
              </div>

              <div className="data-card" style={{ marginBottom: "24px" }}>
                <div className="data-card-head">
                  <h3>{isSeller ? "Recent Seller Bookings" : "Recent Buyer Bookings"}</h3>
                </div>
                <table>
                  <thead>
                    <tr>
                      <th>Item</th>
                      <th>{isSeller ? "Buyer" : "Seller"}</th>
                      <th>Type</th>
                      <th>Total</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(isSeller ? sellerRecentBookings : buyerRecentBookings).map((booking) => (
                      <tr key={booking._id}>
                        <td>
                          <strong>{booking.listing?.title}</strong>
                        </td>
                        <td>{isSeller ? booking.buyer?.name : booking.seller?.name}</td>
                        <td>{booking.type === "rent" ? "Rent" : "Buy"}</td>
                        <td>Rs. {booking.totalAmount.toLocaleString()}</td>
                        <td>
                          <span className={`spill ${bookingClass(booking.status)}`}>{formatBookingStatus(booking.status)}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          ) : null}

          {isSeller && activeSection === "listings" ? (
            <>
              <div className="data-card" style={{ marginBottom: "24px" }}>
                <div className="data-card-head">
                  <h3>{editingId ? "Edit Listing" : "Create Listing"}</h3>
                </div>
                <form onSubmit={handleSubmit}>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: "16px" }}>
                    {[
                      ["title", "Title"],
                      ["category", "Category"],
                      ["occasion", "Occasion"],
                      ["type", "Type"],
                      ["price", "Price"],
                      ["pricingModel", "Pricing Model"],
                      ["deposit", "Deposit"],
                      ["city", "City"],
                      ["size", "Size"],
                      ["material", "Material"],
                      ["condition", "Condition"],
                      ["tags", "Tags (comma separated)"]
                    ].map(([name, label]) => (
                      <div className="filter-group" key={name}>
                        <div className="filter-group-title">{label}</div>
                        {name === "category" ? (
                          <select className="price-input" name={name} onChange={handleChange} value={form[name]}>
                            {categoryOptions.map((option) => (
                              <option key={option} value={option}>{option}</option>
                            ))}
                          </select>
                        ) : name === "occasion" ? (
                          <select className="price-input" name={name} onChange={handleChange} value={form[name]}>
                            {occasionOptions.map((option) => (
                              <option key={option} value={option}>{option}</option>
                            ))}
                          </select>
                        ) : name === "city" ? (
                          <select className="price-input" name={name} onChange={handleChange} value={form[name]}>
                            {cityOptions.map((option) => (
                              <option key={option} value={option}>{option}</option>
                            ))}
                          </select>
                        ) : name === "size" ? (
                          <select className="price-input" name={name} onChange={handleChange} value={form[name]}>
                            {sizeOptions.map((option) => (
                              <option key={option} value={option}>{option}</option>
                            ))}
                          </select>
                        ) : name === "condition" ? (
                          <select className="price-input" name={name} onChange={handleChange} value={form[name]}>
                            {conditionOptions.map((option) => (
                              <option key={option} value={option}>{option}</option>
                            ))}
                          </select>
                        ) : name === "type" ? (
                          <select className="price-input" name={name} onChange={handleChange} value={form[name]}>
                            <option value="Rent">Rent</option>
                            <option value="Buy">Buy</option>
                          </select>
                        ) : name === "pricingModel" ? (
                          <select className="price-input" name={name} onChange={handleChange} value={form[name]}>
                            <option value="per day">per day</option>
                            <option value="fixed price">fixed price</option>
                          </select>
                        ) : (
                          <input
                            className="price-input"
                            min={name === "price" || name === "deposit" ? "0" : undefined}
                            name={name}
                            onChange={handleChange}
                            required={["title", "price", "city", "size"].includes(name)}
                            type={name === "price" || name === "deposit" ? "number" : "text"}
                            value={form[name]}
                          />
                        )}
                      </div>
                    ))}
                  </div>
                  <div className="filter-group">
                    <div className="filter-group-title">Listing Gallery</div>
                    <input
                      accept="image/*"
                      className="price-input"
                      multiple
                      onChange={handleListingImagesChange}
                      type="file"
                    />
                    <p className="muted-note">
                      Add up to 5 real photos. You can select multiple at once, or choose more photos again to add them.
                      {listingImageFiles.length ? ` Selected ${listingImageFiles.length}/5.` : ""}
                    </p>
                    {(listingImageFiles.length || form.imageUrls?.length) ? (
                      <div className="gallery-preview-row">
                        {(listingImageFiles.length ? listingImageFiles.map((file) => URL.createObjectURL(file)) : form.imageUrls).map((url, index) => (
                          <div className="gallery-preview" key={`${url}-${index}`}>
                            <img alt={`Listing preview ${index + 1}`} src={url} />
                            <span>{["Front", "Back", "Embroidery", "Size", "Condition"][index] || `Photo ${index + 1}`}</span>
                            {listingImageFiles.length ? (
                              <button className="btn btn-outline" onClick={() => handleRemoveListingImage(index)} type="button">
                                Remove
                              </button>
                            ) : null}
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </div>
                  <div className="filter-group">
                    <div className="filter-group-title">Description</div>
                    <textarea
                      className="price-input"
                      name="description"
                      onChange={handleChange}
                      rows="5"
                      style={{ width: "100%", resize: "vertical" }}
                      value={form.description}
                    />
                  </div>
                  <div style={{ display: "flex", gap: "10px" }}>
                    <button className="btn btn-primary" disabled={loading} type="submit">
                      {loading ? "Saving..." : editingId ? "Update Listing" : "Create Listing"}
                    </button>
                    {editingId ? (
                      <button
                        className="btn btn-outline"
                        onClick={() => {
                          setEditingId(null);
                          setForm(initialForm);
                        }}
                        type="button"
                      >
                        Cancel Edit
                      </button>
                    ) : null}
                  </div>
                </form>
              </div>

              <div className="data-card">
                <div className="data-card-head">
                  <h3>My Listings</h3>
                </div>
                <table>
                  <thead>
                    <tr>
                      <th>Item</th>
                      <th>Type</th>
                      <th>Approval</th>
                      <th>Availability</th>
                      <th>Blocked Dates</th>
                      <th>Price</th>
                      <th>Bookings</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {listings.map((listing) => (
                      <tr key={listing._id}>
                        <td>
                          <strong>{listing.title}</strong>
                        </td>
                        <td>{listing.type}</td>
                        <td>
                          <span className={`spill ${listing.status === "Live" ? "confirmed" : listing.status === "Pending Approval" ? "pending" : "rented"}`}>
                            {formatListingStatus(listing.status)}
                          </span>
                        </td>
                        <td>
                          <select
                            className="price-input"
                            onChange={(event) => handleAvailabilityChange(listing._id, event.target.value)}
                            style={{ width: "180px" }}
                            value={listing.availabilityStatus}
                          >
                            <option value="Available">Available</option>
                            <option value="Reserved">Reserved</option>
                            <option value="Out of Stock">Out of Stock</option>
                            <option value="Sold">Sold</option>
                          </select>
                        </td>
                        <td style={{ minWidth: "260px" }}>
                          <div style={{ display: "grid", gap: "8px" }}>
                            {(listing.blockedDates || []).map((blocked) => (
                              <div className="muted-note" key={blocked._id} style={{ display: "flex", justifyContent: "space-between", gap: "8px" }}>
                                <span>
                                  {new Date(blocked.startDate).toLocaleDateString()} - {new Date(blocked.endDate).toLocaleDateString()}
                                </span>
                                <button className="btn btn-outline" onClick={() => handleRemoveBlockedDate(listing, blocked._id)} type="button">
                                  Remove
                                </button>
                              </div>
                            ))}
                            <input
                              className="price-input"
                              onChange={(event) => handleBlockedFormChange(listing._id, "startDate", event.target.value)}
                              type="date"
                              value={blockedForms[listing._id]?.startDate || ""}
                            />
                            <input
                              className="price-input"
                              onChange={(event) => handleBlockedFormChange(listing._id, "endDate", event.target.value)}
                              type="date"
                              value={blockedForms[listing._id]?.endDate || ""}
                            />
                            <input
                              className="price-input"
                              onChange={(event) => handleBlockedFormChange(listing._id, "reason", event.target.value)}
                              placeholder="Reason"
                              type="text"
                              value={blockedForms[listing._id]?.reason || ""}
                            />
                            <button className="btn btn-outline" onClick={() => handleAddBlockedDate(listing)} type="button">
                              Block Dates
                            </button>
                          </div>
                        </td>
                        <td>Rs. {listing.price.toLocaleString()}</td>
                        <td>{sellerBookings.filter((booking) => booking.listing?._id === listing._id).length}</td>
                        <td style={{ display: "flex", gap: "8px" }}>
                          <button className="btn btn-outline" onClick={() => handleEdit(listing)} type="button">
                            Edit
                          </button>
                          <button className="btn btn-gold" onClick={() => handleDelete(listing._id)} type="button">
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          ) : null}

          {activeSection === "bookings" ? (
            <div className="data-card">
              <div className="data-card-head">
                <h3>{isSeller ? "Booking Requests" : "My Booking Requests"}</h3>
              </div>
              <table>
                <thead>
                  <tr>
                    <th>Item</th>
                    <th>{isSeller ? "Buyer" : "Seller"}</th>
                    <th>Dates</th>
                    <th>Total</th>
                    <th>Status</th>
                    <th>{isSeller ? "Actions" : "Type"}</th>
                  </tr>
                </thead>
                <tbody>
                  {(isSeller ? sellerBookings : buyerBookings).map((booking) => (
                    <tr key={booking._id}>
                      <td>
                        <strong>{booking.listing?.title}</strong>
                        <BookingTimeline status={booking.status} reviewed={reviewedBookingIds.has(booking._id)} />
                      </td>
                      <td>{isSeller ? booking.buyer?.name : booking.seller?.name}</td>
                      <td>
                        {booking.startDate
                          ? `${new Date(booking.startDate).toLocaleDateString()} – ${new Date(booking.endDate).toLocaleDateString()}`
                          : "Direct purchase"}
                      </td>
                      <td>Rs. {booking.totalAmount.toLocaleString()}</td>
                      <td>
                        <span className={`spill ${bookingClass(booking.status)}`}>{formatBookingStatus(booking.status)}</span>
                      </td>
                      <td>
                        {isSeller ? (
                          booking.status === "pending" ? (
                            <div style={{ display: "flex", gap: "8px" }}>
                              <button className="btn btn-outline" onClick={() => handleApproveBooking(booking._id)} type="button">
                                Approve
                              </button>
                              <button className="btn btn-gold" onClick={() => handleRejectBooking(booking._id)} type="button">
                                Reject
                              </button>
                            </div>
                          ) : booking.status === "approved" ? (
                            <button className="btn btn-outline" onClick={() => handleCompleteBooking(booking._id)} type="button">
                              Mark Complete
                            </button>
                          ) : (
                            booking.type === "rent" ? "Rental Request" : "Purchase Request"
                          )
                        ) : booking.type === "rent" ? (
                          "Rental Request"
                        ) : (
                          "Purchase Request"
                        )}
                      </td>
                    </tr>
                  ))}
                  {(isSeller ? sellerBookings : buyerBookings).length === 0 ? (
                    <tr>
                      <td colSpan="6">
                        <div className="empty-state compact">
                          <h3>No bookings yet</h3>
                          <p>{isSeller ? "Booking requests from buyers will appear here." : "Your booking requests will appear here after you choose a listing."}</p>
                          <Link className="btn btn-outline" to="/browse">Browse Listings</Link>
                        </div>
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          ) : null}

          {activeSection === "messages" ? (
            <div className="data-card">
              <div className="data-card-head">
                <h3>Messages</h3>
                <button className="btn btn-outline" onClick={loadDashboardMessages} type="button">
                  Refresh
                </button>
              </div>
              {messagesLoading ? (
                <p className="muted-note" style={{ lineHeight: 1.8 }}>
                  Loading conversations...
                </p>
              ) : dashboardMessages.length === 0 ? (
                <div className="empty-state compact">
                  <h3>No messages yet</h3>
                  <p>Conversations with buyers and sellers will appear here.</p>
                  <Link className="btn btn-outline" to="/browse">Browse Listings</Link>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                  {dashboardMessages.map((conversation) => {
                    const currentUserId = user?._id || user?.id;
                    const otherParticipant = conversation.participants.find((participant) => participant._id !== currentUserId);
                    const latestMessage = conversation.latestMessage;

                    return (
                      <div
                        key={conversation._id}
                        style={{
                          border: "1px solid var(--border-light)",
                          padding: "16px 18px",
                          display: "grid",
                          gridTemplateColumns: "1fr auto",
                          gap: "16px",
                          alignItems: "center"
                        }}
                      >
                        <div>
                          <strong style={{ color: "var(--ink)" }}>{otherParticipant?.name || "User"}</strong>
                          <p className="muted-note" style={{ margin: "4px 0" }}>
                            {conversation.listing?.title || "Direct conversation"}
                          </p>
                          <p className="muted-note" style={{ margin: 0, lineHeight: 1.6 }}>
                            {latestMessage
                              ? `${latestMessage.sender?._id === currentUserId ? "You" : latestMessage.sender?.name || "They"}: ${latestMessage.text}`
                              : "No messages yet."}
                          </p>
                        </div>
                        <Link className="btn btn-primary" to={`/messages?conversation=${conversation._id}`}>
                          Open Chat
                        </Link>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ) : null}

          {isSeller && activeSection === "earnings" ? (
            <div className="data-card">
              <div className="data-card-head">
                <h3>Earnings</h3>
              </div>
              <div className="kpi-row" style={{ marginBottom: "24px" }}>
                <div className="kpi-block">
                  <div className="klabel">All-Time Earnings</div>
                  <div className="kval">Rs. {earnings.totalEarnings.toLocaleString()}</div>
                </div>
                <div className="kpi-block">
                  <div className="klabel">This Month</div>
                  <div className="kval">Rs. {earnings.monthlyEarnings.toLocaleString()}</div>
                </div>
                <div className="kpi-block">
                  <div className="klabel">Approved Bookings</div>
                  <div className="kval">{earnings.approvedCount}</div>
                </div>
                <div className="kpi-block">
                  <div className="klabel">Pending Requests</div>
                  <div className="kval">{earnings.pendingRequests}</div>
                </div>
              </div>
              <table>
                <thead>
                  <tr>
                    <th>Top Listing</th>
                    <th>Income</th>
                  </tr>
                </thead>
                <tbody>
                  {earnings.topListings.map((item) => (
                    <tr key={item.title}>
                      <td>{item.title}</td>
                      <td>Rs. {item.amount.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}

          {activeSection === "reviews" ? (
            <div className="data-card">
              <div className="data-card-head">
                <h3>{isSeller ? "Listing Reviews" : "My Reviews"}</h3>
              </div>
              {!isSeller ? (
                <form onSubmit={handleReviewSubmit} style={{ marginBottom: "24px" }}>
                  <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "16px" }}>
                    <div className="filter-group">
                      <div className="filter-group-title">Completed Booking</div>
                      <select
                        className="price-input"
                        name="bookingId"
                        onChange={(event) => setReviewForm((current) => ({ ...current, bookingId: event.target.value }))}
                        required
                        value={reviewForm.bookingId}
                      >
                        <option value="">Choose a completed booking</option>
                        {reviewableBookings.map((booking) => (
                          <option key={booking._id} value={booking._id}>
                            {booking.listing?.title} with {booking.seller?.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="filter-group">
                      <div className="filter-group-title">Rating</div>
                      <select
                        className="price-input"
                        name="rating"
                        onChange={(event) => setReviewForm((current) => ({ ...current, rating: event.target.value }))}
                        value={reviewForm.rating}
                      >
                        <option value="5">5 stars</option>
                        <option value="4">4 stars</option>
                        <option value="3">3 stars</option>
                        <option value="2">2 stars</option>
                        <option value="1">1 star</option>
                      </select>
                    </div>
                  </div>
                  <div className="filter-group">
                    <div className="filter-group-title">Review</div>
                    <textarea
                      className="price-input"
                      name="comment"
                      onChange={(event) => setReviewForm((current) => ({ ...current, comment: event.target.value }))}
                      rows="4"
                      style={{ width: "100%", resize: "vertical" }}
                      value={reviewForm.comment}
                    />
                  </div>
                  <button className="btn btn-primary" disabled={!reviewForm.bookingId} type="submit">
                    Submit Review
                  </button>
                  {reviewableBookings.length === 0 ? (
                    <p className="muted-note" style={{ lineHeight: 1.8 }}>
                      Reviews unlock after the seller marks an approved booking as completed.
                    </p>
                  ) : null}
                </form>
              ) : null}

              <table>
                <thead>
                  <tr>
                    <th>Listing</th>
                    <th>{isSeller ? "Buyer" : "Seller"}</th>
                    <th>Rating</th>
                    <th>Review</th>
                  </tr>
                </thead>
                <tbody>
                  {reviews.map((review) => (
                    <tr key={review._id}>
                      <td>
                        <strong>{review.listing?.title}</strong>
                      </td>
                      <td>{isSeller ? review.reviewer?.name : review.seller?.name}</td>
                      <td>{review.rating}.0 ★</td>
                      <td>{review.comment || "No written comment."}</td>
                    </tr>
                  ))}
                  {reviews.length === 0 ? (
                    <tr>
                      <td colSpan="4">
                        <div className="empty-state compact">
                          <h3>No reviews yet</h3>
                          <p>Reviews unlock after completed bookings.</p>
                          <Link className="btn btn-outline" to="/browse">Browse Listings</Link>
                        </div>
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          ) : null}

          {activeSection === "disputes" ? (
            <div className="data-card">
              <div className="data-card-head">
                <h3>Disputes</h3>
              </div>
              <form onSubmit={handleDisputeSubmit} style={{ marginBottom: "24px" }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                  <div className="filter-group">
                    <div className="filter-group-title">Booking</div>
                    <select
                      className="price-input"
                      name="bookingId"
                      onChange={(event) => setDisputeForm((current) => ({ ...current, bookingId: event.target.value }))}
                      required
                      value={disputeForm.bookingId}
                    >
                      <option value="">Choose a booking</option>
                      {disputableBookings.map((booking) => (
                        <option key={booking._id} value={booking._id}>
                          {booking.listing?.title} - {formatBookingStatus(booking.status)}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="filter-group">
                    <div className="filter-group-title">Reason</div>
                    <input
                      className="price-input"
                      name="reason"
                      onChange={(event) => setDisputeForm((current) => ({ ...current, reason: event.target.value }))}
                      required
                      type="text"
                      value={disputeForm.reason}
                    />
                  </div>
                </div>
                <div className="filter-group">
                  <div className="filter-group-title">Details</div>
                  <textarea
                    className="price-input"
                    name="details"
                    onChange={(event) => setDisputeForm((current) => ({ ...current, details: event.target.value }))}
                    rows="4"
                    style={{ width: "100%", resize: "vertical" }}
                    value={disputeForm.details}
                  />
                </div>
                <button className="btn btn-primary" disabled={!disputeForm.bookingId || !disputeForm.reason.trim()} type="submit">
                  File Dispute
                </button>
              </form>

              <table>
                <thead>
                  <tr>
                    <th>Listing</th>
                    <th>Reason</th>
                    <th>Against</th>
                    <th>Status</th>
                    <th>Resolution</th>
                  </tr>
                </thead>
                <tbody>
                  {disputes.map((dispute) => (
                    <tr key={dispute._id}>
                      <td>
                        <strong>{dispute.listing?.title || "Booking"}</strong>
                      </td>
                      <td>
                        {dispute.reason}
                        <div className="muted-note">{dispute.details}</div>
                      </td>
                      <td>{dispute.againstUser?.name || "N/A"}</td>
                      <td>
                        <span className={`spill ${statusPillClass(dispute.status)}`}>{formatDisputeStatus(dispute.status)}</span>
                      </td>
                      <td>{dispute.resolution || "Waiting for admin."}</td>
                    </tr>
                  ))}
                  {disputes.length === 0 ? (
                    <tr>
                      <td colSpan="5">
                        <div className="empty-state compact">
                          <h3>No disputes filed</h3>
                          <p>Disputes will appear here if a booking needs admin help.</p>
                          <Link className="btn btn-outline" to="/browse">Browse Listings</Link>
                        </div>
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          ) : null}

          {activeSection === "history" ? (
            <div className="data-card">
              <div className="data-card-head">
                <h3>History</h3>
                <button className="btn btn-outline" onClick={loadHistory} type="button">
                  Refresh
                </button>
              </div>

              <div className="kpi-row" style={{ marginBottom: "24px" }}>
                <div className="kpi-block">
                  <div className="klabel">Bookings</div>
                  <div className="kval">{history.bookings?.length || 0}</div>
                  <div className="kchange">Requests and status changes</div>
                </div>
                <div className="kpi-block">
                  <div className="klabel">Messages</div>
                  <div className="kval">{history.messages?.length || 0}</div>
                  <div className="kchange">Recent chat evidence</div>
                </div>
                <div className="kpi-block">
                  <div className="klabel">Disputes</div>
                  <div className="kval">{history.disputes?.length || 0}</div>
                  <div className="kchange">Filed and resolved cases</div>
                </div>
                <div className="kpi-block">
                  <div className="klabel">Reviews</div>
                  <div className="kval">{history.reviews?.length || 0}</div>
                  <div className="kchange">Completed-order feedback</div>
                </div>
              </div>

              <table>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Type</th>
                    <th>Record</th>
                    <th>Details</th>
                  </tr>
                </thead>
                <tbody>
                  {(history.timeline || []).map((item, index) => (
                    <tr key={`${item.type}-${item.id || index}`}>
                      <td>{formatHistoryDate(item.date)}</td>
                      <td>
                        <span className="spill pending">{item.type}</span>
                      </td>
                      <td>
                        <strong>{item.title}</strong>
                        {item.listingTitle ? <div className="muted-note">{item.listingTitle}</div> : null}
                      </td>
                      <td>{item.detail}</td>
                    </tr>
                  ))}
                  {(!history.timeline || history.timeline.length === 0) ? (
                    <tr>
                      <td colSpan="4">No history records yet.</td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          ) : null}

          {activeSection === "settings" ? (
            <div className="data-card">
              <div className="data-card-head">
                <h3>Settings</h3>
              </div>
              <p className="muted-note" style={{ lineHeight: 1.8 }}>
                Name: <strong>{user?.name}</strong>
                <br />
                Email: <strong>{user?.email}</strong>
                <br />
                Account Type: <strong>{isAdmin ? "Admin" : isSeller ? "Seller" : "Buyer"}</strong>
              </p>
            </div>
          ) : null}
        </section>
      </div>
    </main>
  );
}
