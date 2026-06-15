import { useEffect, useMemo, useRef, useState } from "react";
import ItemCard from "../components/ItemCard.jsx";
import { fetchPublicListings, visualSearch } from "../services/api.js";

export default function BrowsePage() {
  const [listings, setListings] = useState([]);
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState("All Items");
  const [occasion, setOccasion] = useState("All");
  const [selectedTypes, setSelectedTypes] = useState(["Rent", "Buy"]);
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [vsFile, setVsFile] = useState(null);
  const [vsResults, setVsResults] = useState(null);
  const [vsLoading, setVsLoading] = useState(false);
  const [vsStatus, setVsStatus] = useState("");
  const [vsPreview, setVsPreview] = useState("");
  const vsInputRef = useRef(null);

  useEffect(() => {
    return () => {
      if (vsPreview) URL.revokeObjectURL(vsPreview);
    };
  }, [vsPreview]);

  useEffect(() => {
    fetchPublicListings()
      .then(setListings)
      .catch(() => setListings([]));
  }, []);

  const filteredListings = useMemo(() => {
    if (vsResults) return [];
    return listings.filter((item) => {
      const matchesSearch = [
        item.title,
        item.occasion,
        item.city,
        item.category,
        item.description,
        item.material,
        item.type,
        ...(item.tags || []),
      ]
        .join(" ")
        .toLowerCase()
        .includes(search.toLowerCase());

      const matchesType = selectedTypes.includes(item.type);
      const matchesCategory = selectedCategories.length === 0 || selectedCategories.includes(item.category);
      const matchesTab =
        tab === "All Items" ||
        (tab === "For Rent" && item.type === "Rent") ||
        (tab === "For Sale" && item.type === "Buy");
      const matchesOccasion = occasion === "All" || item.occasion === occasion;
      const notSold = !(item.type === "Buy" && item.availabilityStatus === "Sold");

      return matchesSearch && matchesType && matchesCategory && matchesTab && matchesOccasion && notSold;
    });
  }, [listings, occasion, search, tab, vsResults, selectedTypes, selectedCategories]);

  const handleVisualSearch = async (file) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setVsStatus("Please upload a JPG or PNG fashion photo.");
      return;
    }
    if (vsPreview) URL.revokeObjectURL(vsPreview);
    setVsFile(file);
    setVsPreview(URL.createObjectURL(file));
    setVsLoading(true);
    setVsResults(null);
    setVsStatus("Analyzing image and comparing with live listings...");
    try {
      const data = await visualSearch(file);
      const results = Array.isArray(data.results) ? data.results : [];
      setVsResults(results);
      setVsStatus(
        results.length
          ? `Found ${results.length} confident ${results.length === 1 ? "match" : "matches"}.`
          : data.message || "No confident visual match found."
      );
    } catch (error) {
      setVsResults([]);
      setVsStatus(error?.response?.data?.message || "Visual search service is unavailable right now.");
    } finally {
      setVsLoading(false);
      if (vsInputRef.current) vsInputRef.current.value = "";
    }
  };

  const clearVisualSearch = () => {
    setVsFile(null);
    if (vsPreview) URL.revokeObjectURL(vsPreview);
    setVsPreview("");
    setVsResults(null);
    setVsStatus("");
    if (vsInputRef.current) vsInputRef.current.value = "";
  };

  const toggleType = (type) => {
    setSelectedTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    );
  };

  const toggleCategory = (category) => {
    setSelectedCategories((prev) =>
      prev.includes(category) ? prev.filter((c) => c !== category) : [...prev, category]
    );
  };

  const resetFilters = () => {
    setOccasion("All");
    setSelectedTypes(["Rent", "Buy"]);
    setSelectedCategories([]);
    setTab("All Items");
    setSearch("");
  };

  return (
    <main className="page">
      <div className="page-layout">
        <aside className="sidebar">
          <div className="sidebar-heading">Filters</div>

          <div className="filter-group">
            <div className="filter-group-title">Listing Type</div>
            <div className="filter-item">
              <input
                checked={selectedTypes.includes("Rent")}
                onChange={() => toggleType("Rent")}
                type="checkbox"
              />
              <label>For Rent</label>
              <span className="fcount">{listings.filter((item) => item.type === "Rent").length}</span>
            </div>
            <div className="filter-item">
              <input
                checked={selectedTypes.includes("Buy")}
                onChange={() => toggleType("Buy")}
                type="checkbox"
              />
              <label>For Sale</label>
              <span className="fcount">{listings.filter((item) => item.type === "Buy").length}</span>
            </div>
          </div>

          <div className="filter-group">
            <div className="filter-group-title">Category</div>
            {[...new Set(listings.map((item) => item.category))].map((category) => (
              <div className="filter-item" key={category}>
                <input
                  checked={selectedCategories.includes(category)}
                  onChange={() => toggleCategory(category)}
                  type="checkbox"
                />
                <label>{category}</label>
                <span className="fcount">{listings.filter((item) => item.category === category).length}</span>
              </div>
            ))}
          </div>

          <div className="filter-group">
            <div className="filter-group-title">Occasion</div>
            {[...new Set(listings.map((item) => item.occasion))].map((value) => (
              <div className="filter-item" key={value}>
                <input
                  checked={occasion === value}
                  onChange={() => setOccasion(occasion === value ? "All" : value)}
                  type="checkbox"
                />
                <label>{value}</label>
                <span className="fcount">{listings.filter((item) => item.occasion === value).length}</span>
              </div>
            ))}
          </div>

          <button className="btn btn-gold" onClick={resetFilters} style={{ width: "100%" }} type="button">
            Reset Filters
          </button>
        </aside>

        <section className="main-content">
          <div className="browse-topbar">
            <h2>{vsResults ? "Visual Search Results" : "All Listings"}</h2>
            <div className="search-wrap">
              <span>&#128269;</span>
              <input
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search items, occasions, colours..."
                value={search}
                disabled={!!vsResults}
              />
            </div>
          </div>

          <div className="vsearch-strip">
            <div
              className="vsearch-drop"
              onClick={() => vsInputRef.current.click()}
              style={{ cursor: "pointer" }}
            >
              {vsFile && vsPreview ? (
                <img
                  src={vsPreview}
                  alt="preview"
                  style={{ width: "60px", height: "60px", objectFit: "cover", borderRadius: "6px" }}
                />
              ) : (
                <div>
                  <div style={{ fontSize: "20px" }}>&#128247;</div>
                  <p className="muted-note" style={{ margin: "4px 0 0" }}>Upload</p>
                </div>
              )}
              <input
                ref={vsInputRef}
                type="file"
                accept="image/*"
                style={{ display: "none" }}
                onChange={(e) => handleVisualSearch(e.target.files[0])}
              />
            </div>

            <div className="vsearch-text">
              <h4>Visual Search - find by photograph</h4>
              <p>
                {vsLoading
                  ? vsStatus
                  : vsResults
                  ? vsStatus
                  : "Upload an item photo to find the closest matching listing in the Vintora catalog."}
              </p>
            </div>

            {vsResults ? (
              <button className="btn btn-outline" onClick={clearVisualSearch} type="button">
                Clear Search
              </button>
            ) : (
              <button
                className="btn btn-outline"
                onClick={() => vsInputRef.current.click()}
                type="button"
              >
                {vsLoading ? "Searching..." : "Try Visual Search"}
              </button>
            )}
          </div>

          {vsResults && vsResults.length > 0 && (
            <div className="items-grid" style={{ marginTop: "24px" }}>
              {vsResults.map((item) => (
                <ItemCard
                  actionLabel={item.type === "Rent" ? "View / Book" : "View / Buy"}
                  item={item}
                  key={item._id || item.id}
                />
              ))}
            </div>
          )}

          {vsResults && vsResults.length === 0 && !vsLoading && (
            <div style={{ textAlign: "center", padding: "60px 20px", color: "#9a8a7a" }}>
              <p>No confident visual match found. Try a clearer product photo or upload the exact listing image.</p>
              <button className="btn btn-outline" onClick={clearVisualSearch} style={{ marginTop: "16px" }} type="button">
                Clear Search
              </button>
            </div>
          )}

          {!vsResults && (
            <>
              <div className="tab-bar">
                {["All Items", "For Rent", "For Sale"].map((value) => (
                  <div
                    className={`vtab ${tab === value ? "active" : ""}`}
                    key={value}
                    onClick={() => setTab(value)}
                  >
                    {value}
                  </div>
                ))}
              </div>

              <div className="chip-bar">
                {["All", "Barat", "Mehndi", "Walima", "Eid", "Party", "Formal", "Casual"].map((value) => (
                  <span
                    className={`chip ${occasion === value ? "active" : ""}`}
                    key={value}
                    onClick={() => setOccasion(value)}
                  >
                    {value}
                  </span>
                ))}
              </div>

              {filteredListings.length === 0 ? (
                <div style={{ textAlign: "center", padding: "60px 20px", color: "#9a8a7a" }}>
                  <p>No listings match your current filters.</p>
                  <button className="btn btn-outline" onClick={resetFilters} style={{ marginTop: "16px" }} type="button">
                    Reset Filters
                  </button>
                </div>
              ) : (
                <div className="items-grid">
                  {filteredListings.map((item) => (
                    <ItemCard item={item} key={item._id} />
                  ))}
                </div>
              )}
            </>
          )}
        </section>
      </div>
    </main>
  );
}