import { Link } from "react-router-dom";
import { saveWishlistItem } from "../services/api.js";

const UPLOADS_BASE = (import.meta.env.VITE_API_URL || "http://localhost:5000/api").replace(/\/api\/?$/, "");
function imageUrl(url) {
  if (!url) return "";
  return url.startsWith("http") ? url : `${UPLOADS_BASE}${url}`;
}

export default function ItemCard({ item, actionLabel, actionTo }) {
  const listingId = item._id || item.id;
  const detailTo = actionTo || `/product/${listingId}`;
  const primaryImage = item.imageUrls?.find(Boolean);
  const rating = Number(item.rating || 0);
  const price = Number(item.price || 0);

  const handleSave = async () => {
    if (!listingId) return;
    try {
      await saveWishlistItem(listingId);
      window.dispatchEvent(new CustomEvent("vintora:wishlist-updated"));
    } catch (_error) {
      window.dispatchEvent(new CustomEvent("vintora:wishlist-login-required"));
    }
  };

  return (
    <article className="item-card">
      <div className="item-img">
        <Link className="item-img-link" to={detailTo}>
          {primaryImage ? (
            <img alt={item.title} src={imageUrl(primaryImage)} />
          ) : (
            <div className="image-placeholder">
              <span>No image</span>
            </div>
          )}
        </Link>
        <span className={`item-label ${item.type === "Rent" ? "rent" : "buy"}`}>{item.type}</span>
        <button className="wishlist-btn" onClick={handleSave} title="Save item" type="button">
          Save
        </button>
      </div>

      <div className="item-body">
        <h4>
          <Link to={detailTo}>{item.title}</Link>
        </h4>
        <p className="imeta">
          Size {item.size || "Free"} - {item.city || "Pakistan"} -{" "}
          {item.reviewCount > 0 ? `${rating.toFixed(1)} rating (${item.reviewCount} reviews)` : "No reviews yet"}
        </p>
        <div className="item-price-row">
          <div>
            <div className="item-price-main">Rs. {price.toLocaleString()}</div>
            <div className="item-price-sub">{item.pricingModel || (item.type === "Rent" ? "per day" : "fixed price")}</div>
          </div>
          {item.similarity ? <span className="match-pill">{item.similarity}% match</span> : null}
          {item.availabilityStatus ? (
            <span className="muted-note" style={{ color: "var(--success)" }}>
              {item.availabilityStatus}
            </span>
          ) : null}
        </div>
        <div className="item-card-actions">
          <Link className="btn btn-outline" to={detailTo}>
            Message Seller
          </Link>
          <Link className={`btn ${item.type === "Rent" ? "btn-gold" : "btn-terra"}`} to={detailTo}>
            {actionLabel || (item.type === "Rent" ? "View / Book" : "View / Buy")}
          </Link>
        </div>
      </div>
    </article>
  );
}