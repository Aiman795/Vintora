import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import ItemCard from "../components/ItemCard.jsx";
import { fetchWishlist, removeWishlistItem } from "../services/api.js";

export default function WishlistPage() {
  const [items, setItems] = useState([]);
  const [message, setMessage] = useState("");

  const loadWishlist = async () => {
    try {
      const data = await fetchWishlist();
      setItems(data);
    } catch (error) {
      setMessage(error.response?.data?.message || "Unable to load wishlist.");
    }
  };

  useEffect(() => {
    loadWishlist();
  }, []);

  const handleRemove = async (listingId) => {
    const updated = await removeWishlistItem(listingId);
    setItems(updated);
    setMessage("Item removed from wishlist.");
  };

  return (
    <main className="page">
      <div className="page-header-bar">
        <div>
          <h2>Saved Items</h2>
          <p>Your shortlisted rentals and resale pieces stay here for faster booking later.</p>
        </div>
        <Link className="btn btn-outline" to="/browse">Browse More</Link>
      </div>

      {message ? <p className="muted-note">{message}</p> : null}

      {items.length ? (
        <div className="items-grid">
          {items.map((item) => (
            <div key={item._id}>
              <ItemCard item={item} actionLabel="View" actionTo={`/product/${item._id}`} />
              <button className="btn btn-outline" onClick={() => handleRemove(item._id)} style={{ marginTop: "10px", width: "100%" }} type="button">
                Remove Saved Item
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <h3>No saved items yet</h3>
          <p>Save listings from browse or product pages to compare them before renting or buying.</p>
          <Link className="btn btn-primary" to="/browse">Browse Listings</Link>
        </div>
      )}
    </main>
  );
}
