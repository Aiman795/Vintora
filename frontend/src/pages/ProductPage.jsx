import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { createBooking, fetchListingById, fetchListingReviews, fetchUnavailableDates, saveWishlistItem } from "../services/api.js";

const galleryLabels = ["Front view", "Back view", "Close-up embroidery", "Size / measurement photo", "Condition photo"];

function listingImageUrl(url) {
  if (!url) return "";
  return url.startsWith("http") ? url : `http://localhost:5000${url}`;
}

export default function ProductPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const [listing, setListing] = useState(null);
  const [startDate, setStartDate] = useState("2026-04-15");
  const [endDate, setEndDate] = useState("2026-04-17");
  const [unavailableDates, setUnavailableDates] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [bookingMessage, setBookingMessage] = useState("");
  const [bookingLoading, setBookingLoading] = useState(false);
  const [checkout, setCheckout] = useState({
    paymentMethod: "Cash on Delivery",
    deliveryMethod: "Meetup",
    contactNote: ""
  });

  useEffect(() => {
    fetchListingById(id)
      .then((data) => {
        setListing(data);
        setActiveImageIndex(0);
      })
      .catch(() => setListing(null));
  }, [id]);

  useEffect(() => {
    fetchListingReviews(id)
      .then(setReviews)
      .catch(() => setReviews([]));
  }, [id]);

  useEffect(() => {
    fetchUnavailableDates(id)
      .then(setUnavailableDates)
      .catch(() => setUnavailableDates([]));
  }, [id]);

  const rentalSummary = useMemo(() => {
    if (!listing || listing.type !== "Rent") {
      return null;
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) {
      return "Choose valid dates to calculate your rental total.";
    }

    const days = Math.floor((end - start) / (1000 * 60 * 60 * 24)) + 1;
    const total = days * listing.price;
    return `${days} days · Rental total: Rs. ${total.toLocaleString()} + deposit`;
  }, [endDate, listing, startDate]);

  const blockedDateRanges = useMemo(() => {
    return unavailableDates.map((booking) => {
      const start = new Date(booking.startDate).toLocaleDateString();
      const end = new Date(booking.endDate).toLocaleDateString();
      return `${start} – ${end}`;
    });
  }, [unavailableDates]);

  const isOwnListing = listing && user && listing.owner?._id === (user._id || user.id);
  const canBook = listing && isAuthenticated && !authLoading && user?.role === "buyer" && !isOwnListing;
  const galleryImages = listing ? (listing.imageUrls || []).filter(Boolean).slice(0, 5) : [];
  const activeImage = galleryImages[activeImageIndex];
  const isSold = listing?.availabilityStatus === "Sold" || listing?.availabilityStatus === "Out of Stock";

  const handleBooking = async () => {
    if (!listing) {
      return;
    }

    if (!isAuthenticated) {
      navigate("/login");
      return;
    }

    if (authLoading) {
      setBookingMessage("Please wait while your account is loaded.");
      return;
    }

    if (user?.role !== "buyer") {
      setBookingMessage(`Only buyers can create booking requests. You are currently signed in as ${user?.role || "unknown"}.`);
      return;
    }

    if (isOwnListing) {
      setBookingMessage("You cannot book your own listing.");
      return;
    }

    setBookingLoading(true);
    setBookingMessage("");

    try {
      await createBooking({
        listingId: listing._id,
        startDate: listing.type === "Rent" ? startDate : null,
        endDate: listing.type === "Rent" ? endDate : null,
        ...checkout
      });

      setBookingMessage(listing.type === "Rent" ? "Booking request sent to the seller." : "Purchase request sent to the seller.");
      const latestUnavailableDates = await fetchUnavailableDates(listing._id);
      setUnavailableDates(latestUnavailableDates);
    } catch (error) {
      setBookingMessage(error.response?.data?.message || "Unable to create booking request.");
    } finally {
      setBookingLoading(false);
    }
  };

  const handleSaveItem = async () => {
    if (!isAuthenticated) {
      navigate("/login");
      return;
    }

    try {
      await saveWishlistItem(listing._id);
      setBookingMessage("Item saved to your wishlist.");
    } catch (error) {
      setBookingMessage(error.response?.data?.message || "Unable to save item.");
    }
  };

  if (!listing) {
    return (
      <main className="page">
        <div className="page-header-bar">
          <div>
            <h2>Listing Not Found</h2>
            <p>The product you selected could not be loaded.</p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="page">
      <section className="product-layout">
        <div>
          <div className="product-main-img">
            {activeImage ? (
              <img alt={`${listing.title} ${galleryLabels[activeImageIndex] || "photo"}`} src={listingImageUrl(activeImage)} />
            ) : (
              <div className="image-placeholder">Photo coming soon</div>
            )}
            {isSold ? <div className="sold-ribbon">{listing.availabilityStatus}</div> : null}
          </div>
          <div className="product-thumbs">
            {(galleryImages.length ? galleryImages : [null, null, null, null]).map((imageUrl, index) => (
              <button
                className={`pthumb ${index === activeImageIndex ? "active" : ""}`}
                key={`${imageUrl || "fallback"}-${index}`}
                onClick={() => setActiveImageIndex(index)}
                type="button"
              >
                {imageUrl ? <img alt={galleryLabels[index]} src={listingImageUrl(imageUrl)} /> : <span>{galleryLabels[index]?.slice(0, 1)}</span>}
                <small>{galleryLabels[index]}</small>
              </button>
            ))}
          </div>
        </div>

        <div className="product-info">
          <div className="product-breadcrumb">
            {listing.category} <span className="pb-sep">/</span> {listing.occasion}
          </div>
          <h1>{listing.title}</h1>

          <div className="ptags ptags-top">
            <span className="ptag ptag-accent">{listing.type === "Rent" ? "For Rent" : "For Sale"}</span>
            <span className="ptag">Size {listing.size}</span>
            <span className="ptag">{listing.city}</span>
            {listing.material ? <span className="ptag">{listing.material}</span> : null}
            <span className="ptag">{listing.condition}</span>
          </div>

          <div className="product-lender-row">
            <div className="lavatar">{listing.owner?.name?.slice(0, 2).toUpperCase() || "VT"}</div>
            <div>
              <div className="lname">
                <Link to={`/seller/${listing.owner?._id || ""}`}>{listing.owner?.name || "Vintora Seller"}</Link>{" "}
                <span className={listing.owner?.verificationStatus === "Verified" ? "verified-badge" : "unverified-badge"}>
                  {listing.owner?.verificationStatus === "Verified" ? "✓ Verified Lender" : "Verification Pending"}
                </span>
              </div>
              <div style={{ marginTop: "2px" }}>
              {listing.reviewCount > 0 ? (
                <>
                  <span className="lstars">
                    {"★".repeat(Math.round(listing.rating))}
                    {"☆".repeat(5 - Math.round(listing.rating))}
                  </span>{" "}
                  <span className="muted-note">
                    {listing.rating?.toFixed(1)} · {listing.reviewCount} reviews
                  </span>
                </>
              ) : (
                <span className="muted-note">No reviews yet</span>
              )}
            </div>
            </div>
            <Link
              className="btn btn-outline"
              style={{ marginLeft: "auto" }}
              to={`/messages?participant=${listing.owner?._id || ""}&listing=${listing._id}`}
            >
              Chat
            </Link>
          </div>

          <div className="pricing-box pricing-box-main">
            <div className="pricing-box-row">
              <div>
                <div className="muted-note pricing-label">
                  {listing.type === "Rent" ? "Rental Price" : "Sale Price"}
                </div>
                <div className="rent-amt">Rs. {listing.price.toLocaleString()}</div>
                <div className="rent-per">{listing.pricingModel}</div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div className="muted-note pricing-label">
                  Security Deposit
                </div>
                <div className="dep-amt">Rs. {listing.deposit.toLocaleString()}</div>
              </div>
            </div>
            <p className="dep-note">Deposit refunded within 48 hours of return in good condition.</p>

            {listing.type === "Rent" ? (
              <div className="date-row">
                <label className="date-field">
                  <span>Start Date</span>
                  <input className="vdate-input" onChange={(e) => setStartDate(e.target.value)} type="date" value={startDate} />
                </label>
                <label className="date-field">
                  <span>End Date</span>
                  <input className="vdate-input" onChange={(e) => setEndDate(e.target.value)} type="date" value={endDate} />
                </label>
              </div>
            ) : null}

            <p className="total-line">{listing.type === "Rent" ? rentalSummary : "This listing is available for direct purchase."}</p>

            {listing.type === "Rent" && blockedDateRanges.length > 0 ? (
              <p className="muted-note availability-note">
                <strong>Unavailable:</strong> {blockedDateRanges.join(" | ")}
              </p>
            ) : null}

            {listing.availabilityStatus !== "Available" ? (
              <p className="availability-flag">
                Current availability: {listing.availabilityStatus}
              </p>
            ) : (
              <p className="availability-flag available">
                ✓ Available now
              </p>
            )}
          </div>

          <div className="pricing-box checkout-box">
            <div className="muted-note checkout-label">
              Manual Checkout Details
            </div>
            <div className="date-row">
              <label className="date-field">
                <span>Payment Method</span>
                <select
                  className="vdate-input"
                  onChange={(event) => setCheckout((current) => ({ ...current, paymentMethod: event.target.value }))}
                  value={checkout.paymentMethod}
                >
                  <option value="Cash on Delivery">Cash on Delivery</option>
                  <option value="Bank Transfer">Bank Transfer</option>
                  <option value="JazzCash/EasyPaisa">JazzCash/EasyPaisa</option>
                  <option value="Manual Agreement">Manual Agreement</option>
                </select>
              </label>
              <label className="date-field">
                <span>Delivery Method</span>
                <select
                  className="vdate-input"
                  onChange={(event) => setCheckout((current) => ({ ...current, deliveryMethod: event.target.value }))}
                  value={checkout.deliveryMethod}
                >
                  <option value="Meetup">Meetup</option>
                  <option value="Courier">Courier</option>
                  <option value="Self Pickup">Self Pickup</option>
                </select>
              </label>
            </div>
            <label className="date-field" style={{ marginTop: "12px" }}>
              <span>Note for Seller</span>
              <textarea
                className="vdate-input"
                onChange={(event) => setCheckout((current) => ({ ...current, contactNote: event.target.value }))}
                placeholder="Add preferred pickup time, city area, or payment reference note."
                rows="3"
                style={{ minHeight: "86px", resize: "vertical", width: "100%" }}
                value={checkout.contactNote}
              />
            </label>
            <p className="dep-note">Vintora records payment and delivery preferences for the seller.</p>
          </div>

          

          {listing.tags?.length ? (
            <div className="ptags">
              {listing.tags.map((tag) => (
                <span className="ptag ptag-soft" key={tag}>
                  {tag}
                </span>
              ))}
            </div>
          ) : null}

          <p className="product-desc">{listing.description}</p>

          <div className="product-ctas">
            <button
              className="btn btn-primary"
              disabled={authLoading || bookingLoading || isSold}
              onClick={handleBooking}
              style={{ padding: "14px 18px" }}
              type="button"
            >
              {authLoading
                ? "Loading Account..."
                : bookingLoading
                ? "Sending..."
                : isSold
                ? "No Longer Available"
                : listing.type === "Rent"
                ? "Request Booking"
                : "Request Purchase"}
            </button>
            <button className="btn btn-outline" onClick={handleSaveItem} style={{ padding: "14px 18px" }} type="button">
              Save Item
            </button>
            <Link className="btn btn-outline" style={{ padding: "14px 18px" }} to="/buddy">
              Get AI Outfit Suggestions
            </Link>
          </div>
          {bookingMessage ? <p className="muted-note" style={{ marginTop: "14px" }}>{bookingMessage}</p> : null}
          {!canBook && isAuthenticated && !authLoading ? (
            <p className="muted-note" style={{ marginTop: "10px" }}>
              {isOwnListing
                ? "You cannot book your own listing."
                : user?.role !== "buyer"
                  ? `Current account type: ${user?.role || "unknown"}. Login with a buyer account to request booking.`
                  : ""}
            </p>
          ) : null}
        </div>
      </section>

      <section className="data-card product-reviews">
        <div className="data-card-head">
          <h3>Product Reviews</h3>
          <span className="spill confirmed">{reviews.length} Reviews</span>
        </div>
        {reviews.length ? (
          <div className="review-list">
            {reviews.map((review) => (
              <article className="review-card" key={review._id}>
                <strong>{review.rating}.0 ★ · {review.reviewer?.name || "Buyer"}</strong>
                <p>{review.comment || "No written comment."}</p>
                <span className="muted-note">{new Date(review.createdAt).toLocaleDateString()}</span>
              </article>
            ))}
          </div>
        ) : (
          <div className="empty-state compact">
            <h3>No reviews yet</h3>
            <p>Reviews from completed bookings will appear here.</p>
            <Link className="btn btn-outline" to="/browse">Browse Listings</Link>
          </div>
        )}
      </section>
    </main>
  );
}