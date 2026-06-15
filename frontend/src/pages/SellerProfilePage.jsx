import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import ItemCard from "../components/ItemCard.jsx";
import { fetchSellerProfile } from "../services/api.js";

export default function SellerProfilePage() {
  const { id } = useParams();
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    fetchSellerProfile(id)
      .then(setProfile)
      .catch(() => setProfile(null));
  }, [id]);

  if (!profile) {
    return (
      <main className="page">
        <div className="empty-state">
          <h3>Seller profile unavailable</h3>
          <p>This seller could not be loaded right now.</p>
          <Link className="btn btn-primary" to="/browse">Browse Listings</Link>
        </div>
      </main>
    );
  }

  const { seller, stats, listings, reviews } = profile;

  return (
    <main className="page">
      <section className="seller-profile-head">
        <div className="seller-profile-avatar">{seller.name?.slice(0, 2).toUpperCase() || "VT"}</div>
        <div>
          <div className="product-breadcrumb">Seller Profile</div>
          <h1>{seller.name}</h1>
          <p className="muted-note">{stats.averageRating || "0.0"} stars from {stats.reviewCount} reviews</p>
        </div>
      </section>

      <div className="kpi-row" style={{ margin: "24px 0" }}>
        <div className="kpi-block">
          <div className="klabel">Rating</div>
          <div className="kval">{stats.averageRating || "0.0"} ★</div>
        </div>
        <div className="kpi-block">
          <div className="klabel">Reviews</div>
          <div className="kval">{stats.reviewCount}</div>
        </div>
        <div className="kpi-block">
          <div className="klabel">Active Listings</div>
          <div className="kval">{stats.activeListings}</div>
        </div>
        <div className="kpi-block">
          <div className="klabel">Completed Bookings</div>
          <div className="kval">{stats.completedBookings}</div>
        </div>
      </div>

      <section className="data-card" style={{ marginBottom: "24px" }}>
        <div className="data-card-head">
          <h3>Active Listings</h3>
        </div>
        {listings.length ? (
          <div className="items-grid">
            {listings.map((item) => <ItemCard item={item} key={item._id} />)}
          </div>
        ) : (
          <div className="empty-state compact">
            <h3>No active listings</h3>
            <p>This seller has no approved listings right now.</p>
            <Link className="btn btn-outline" to="/browse">Browse Listings</Link>
          </div>
        )}
      </section>

      <section className="data-card">
        <div className="data-card-head">
          <h3>Reviews</h3>
        </div>
        {reviews.length ? (
          <div className="review-list">
            {reviews.map((review) => (
              <article className="review-card" key={review._id}>
                <strong>{review.rating}.0 ★ by {review.reviewer?.name || "Buyer"}</strong>
                <p>{review.comment || "No written comment."}</p>
                <span className="muted-note">{review.listing?.title} · {new Date(review.createdAt).toLocaleDateString()}</span>
              </article>
            ))}
          </div>
        ) : (
          <div className="empty-state compact">
            <h3>No reviews yet</h3>
            <p>Reviews will appear after completed bookings.</p>
            <Link className="btn btn-outline" to="/browse">Browse Listings</Link>
          </div>
        )}
      </section>
    </main>
  );
}
