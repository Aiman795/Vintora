import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

function closetImageUrl(url) {
  if (!url) return "";
  return url.startsWith("http") ? url : `http://localhost:5000${url}`;
}

const categoryOptions = [
  { value: "shalwar_kameez", label: "Shalwar Kameez" },
  { value: "kurta", label: "Kurta / Kurti" },
  { value: "lehenga_sharara", label: "Lehenga / Sharara" },
  { value: "gharara_farshi", label: "Gharara / Farshi" },
  { value: "anarkali", label: "Anarkali" },
  { value: "gown", label: "Gown" },
  { value: "saree", label: "Saree" },
  { value: "sherwani", label: "Sherwani" },
  { value: "co_ord_set", label: "Co-ord Set" },
  { value: "dupatta_shawl", label: "Dupatta / Shawl" },
  { value: "jewellery", label: "Jewellery" },
  { value: "necklace_choker", label: "Necklace / Choker" },
  { value: "bangles_kara", label: "Bangles / Kara" },
  { value: "footwear", label: "Footwear" },
  { value: "khussa_kheri", label: "Khussa / Kheri" },
  { value: "bags_clutches", label: "Bags & Clutches" },
  { value: "hair_accessories", label: "Hair Accessories" },
  { value: "accessories", label: "Other Accessories" },
  { value: "other", label: "Other" },
];

const categoryLabelMap = categoryOptions.reduce((acc, opt) => {
  acc[opt.value] = opt.label;
  return acc;
}, {});

// Legacy values from before this update, mapped to new labels for display
const legacyLabelMap = {
  tops: "Kameez / Top",
  bottoms: "Shalwar / Bottom",
  dresses: "Dress / Lehenga",
  accessories: "Accessory",
  footwear: "Footwear",
  other: "Wardrobe Item",
};

function prettyCategory(category) {
  return categoryLabelMap[category] || legacyLabelMap[category] || "Wardrobe Item";
}

// Groups that count toward "Accessories" and "Footwear" stat cards
const accessoryCategories = ["jewellery", "necklace_choker", "bangles_kara", "bags_clutches", "hair_accessories", "accessories", "dupatta_shawl"];
const footwearCategories = ["footwear", "khussa_kheri"];

export default function ClosetPage() {
  const [items, setItems] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ itemName: "", category: "shalwar_kameez" });
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [suggestions, setSuggestions] = useState(null);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [occasion, setOccasion] = useState("Eid");
  const [error, setError] = useState("");

  const token = localStorage.getItem("vintora_token");

  const stats = useMemo(() => ({
    total: items.length,
    suggested: items.length > 0 ? items.length + 2 : 0,
    accessories: items.filter((item) => accessoryCategories.includes(item.category)).length,
    footwear: items.filter((item) => footwearCategories.includes(item.category)).length,
  }), [items]);

  const fetchItems = async () => {
    try {
      const res = await fetch(`${API_URL}/closet`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) setItems(data.items || []);
    } catch {
      setItems([]);
    }
  };

  useEffect(() => {
    fetchItems();
  }, []);

  const handleImageChange = (event) => {
    const file = event.target.files[0];
    if (!file) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const handleUpload = async () => {
    if (!imageFile || !form.itemName.trim()) {
      setError("Please provide an item photo and name.");
      return;
    }

    setError("");
    setUploading(true);

    try {
      const formData = new FormData();
      formData.append("image", imageFile);
      formData.append("itemName", form.itemName.trim());
      formData.append("category", form.category);

      const res = await fetch(`${API_URL}/closet/upload`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      const data = await res.json();
      if (data.success) {
        setItems((prev) => [data.item, ...prev]);
        setShowForm(false);
        setForm({ itemName: "", category: "shalwar_kameez" });
        setImageFile(null);
        setImagePreview(null);
      } else {
        setError(data.message || "Upload failed.");
      }
    } catch {
      setError("Upload failed. Please make sure the server is running.");
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await fetch(`${API_URL}/closet/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      setItems((prev) => prev.filter((item) => item._id !== id));
    } catch {
      setError("Could not delete item.");
    }
  };

  const handleGetSuggestions = async () => {
    setLoadingSuggestions(true);
    setSuggestions(null);
    setError("");

    try {
      const res = await fetch(`${API_URL}/buddy/suggest`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ event: occasion }),
      });

      const data = await res.json();
      if (data.success) {
        setSuggestions(data.outfit);
      } else {
        setError(data.message || "Could not get suggestions.");
      }
    } catch {
      setError("Could not get suggestions. Make sure the server is running.");
    } finally {
      setLoadingSuggestions(false);
    }
  };

  return (
    <main className="page">
      <div className="closet-header">
        <div>
          <h2>Smart Closet</h2>
          <p>Build a private wardrobe and style it with available rentals.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowForm(!showForm)} type="button">
          {showForm ? "Cancel" : "+ Add Item"}
        </button>
      </div>

      <section className="closet-body">
        {showForm && (
          <div className="data-card closet-form-card">
            <h3>Upload Clothing Item</h3>

            <button
              className="closet-dropzone"
              onClick={() => document.getElementById("closet-file-input").click()}
              type="button"
            >
              {imagePreview ? (
                <img src={imagePreview} alt="Selected closet item preview" />
              ) : (
                <span>
                  <strong>Add product photo</strong>
                  <small>JPG or PNG, clear front view preferred</small>
                </span>
              )}
            </button>
            <input
              accept="image/*"
              id="closet-file-input"
              onChange={handleImageChange}
              style={{ display: "none" }}
              type="file"
            />

            <div className="filter-group">
              <div className="filter-group-title">Item Name</div>
              <input
                className="price-input"
                onChange={(event) => setForm((current) => ({ ...current, itemName: event.target.value }))}
                placeholder="e.g. White Shalwar Kameez, gold earrings"
                value={form.itemName}
              />
            </div>

            <div className="filter-group">
              <div className="filter-group-title">Category</div>
              <select
                className="price-input"
                onChange={(event) => setForm((current) => ({ ...current, category: event.target.value }))}
                value={form.category}
              >
                {categoryOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            {error && <p className="form-error">{error}</p>}

            <button className="btn btn-gold" disabled={uploading} onClick={handleUpload} type="button">
              {uploading ? "Uploading..." : "Save to Closet"}
            </button>
          </div>
        )}

        <div className="stat-row">
          <div className="stat-block">
            <div className="snum">{stats.total}</div>
            <div className="slabel">Items in Wardrobe</div>
          </div>
          <div className="stat-block">
            <div className="snum">{stats.suggested}</div>
            <div className="slabel">Outfits Suggested</div>
          </div>
          <div className="stat-block">
            <div className="snum">{stats.accessories}</div>
            <div className="slabel">Accessories</div>
          </div>
          <div className="stat-block">
            <div className="snum">{stats.footwear}</div>
            <div className="slabel">Footwear</div>
          </div>
        </div>

        <div className="closet-section-head">
          <h3>My Wardrobe</h3>
        </div>

        <div className="closet-grid">
          {items.map((item) => (
            <div className="closet-item" key={item._id}>
              <div className="closet-item-img ci1">
                {item.imageUrl ? (
                  <img alt={item.itemName} src={closetImageUrl(item.imageUrl)} />
                ) : (
                  <div className="image-placeholder compact">{prettyCategory(item.category)}</div>
                )}
              </div>
              <div className="closet-item-body">
                <h5>{item.itemName}</h5>
                <p>{prettyCategory(item.category)}</p>
              </div>
              <button className="closet-delete" onClick={() => handleDelete(item._id)} type="button">
                Remove
              </button>
            </div>
          ))}

          <button className="closet-upload" onClick={() => setShowForm(true)} type="button">
            <span className="up-plus">+</span>
            <span>Upload Item</span>
          </button>
        </div>

        <div className="closet-section-head outfit-head">
          <h3>Outfit Suggestions</h3>
          <div className="closet-actions">
            <select className="price-input" onChange={(event) => setOccasion(event.target.value)} value={occasion}>
              <option>Eid</option>
              <option>Barat</option>
              <option>Mehndi</option>
              <option>Walima</option>
              <option>Party</option>
              <option>Formal</option>
              <option>Casual</option>
            </select>
            <button className="btn btn-gold" disabled={loadingSuggestions} onClick={handleGetSuggestions} type="button">
              {loadingSuggestions ? "Styling..." : "Get Outfit"}
            </button>
          </div>
        </div>

        {error && !showForm && <p className="form-error">{error}</p>}

        {suggestions && (
          <div className="data-card suggestion-card">
            <p className="suggestion-intro">{suggestions.intro || "Here is a complete outfit direction for your occasion."}</p>
            <div className="suggestion-list">
              {suggestions.pieces?.map((piece, index) => (
                <div className="suggestion-row" key={`${piece.name}-${index}`}>
                  {piece.imageUrl ? (
                    <img
                      alt={piece.name}
                      className="suggestion-thumb"
                      src={piece.imageUrl}
                    />
                  ) : (
                    <div className="text-thumb">{piece.type === "own" ? "Own" : "Rent"}</div>
                  )}
                  <div>
                    <p>{piece.name}</p>
                    <small>
                      {piece.note}
                      {piece.city ? ` · ${piece.city}` : ""}
                      {piece.price ? ` · Rs. ${Number(piece.price).toLocaleString()}` : ""}
                    </small>
                  </div>
                  <span>{piece.type === "own" ? "Your item" : "Rental"}</span>
                </div>
              ))}
            </div>
            {suggestions.tip && <p className="muted-note suggestion-tip">{suggestions.tip}</p>}
          </div>
        )}

        {!suggestions && !loadingSuggestions && (
          <div className="ai-outfit-grid">
            <div className="ai-outfit-card">
              <div className="aoc-label gold">Wardrobe Foundation</div>
              <div className="text-combo">Kameez + Footwear + Jewellery</div>
              <p>Add your real wardrobe pieces, then request an outfit plan for your event.</p>
              <Link className="btn btn-outline" to="/buddy">
                Ask Stylist
              </Link>
            </div>
            <div className="ai-outfit-card">
              <div className="aoc-label terra">Complete the Look</div>
              <div className="text-combo">Dress + Jewellery + Bag</div>
              <p>Browse rental items that match the pieces you already own.</p>
              <Link className="btn btn-gold" to="/browse">
                Browse Rentals
              </Link>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}