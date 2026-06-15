import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Footer from "../components/Footer.jsx";
import { fetchPublicListings } from "../services/api.js";

function listingImageUrl(url) {
  if (!url) return "";
  return url.startsWith("http") ? url : `http://localhost:5000${url}`;
}

export default function HomePage() {
  const [listings, setListings] = useState([]);

  useEffect(() => {
    fetchPublicListings()
      .then((data) => setListings(data))
      .catch(() => setListings([]));
  }, []);

  const featured = listings.slice(0, 4);
  const counts = listings.reduce((acc, item) => {
    acc[item.occasion] = (acc[item.occasion] || 0) + 1;
    return acc;
  }, {});

  return (
    <>
      <main className="page">
        <section className="hero">
          <div className="hero-left">
            <div className="hero-ornament">Est. 2026</div>
            <h1>
              Rent &amp; Resell
              <br />
              <em>Pakistani</em>
              <br />
              <strong>Fashion</strong>
            </h1>
            <p className="hero-sub">
              A curated marketplace for pre-loved cultural wear — with AI styling, virtual try-on, and a
              smart digital wardrobe built for every Pakistani occasion.
            </p>
            <div className="hero-btns">
              <Link className="btn btn-primary" style={{ padding: "12px 32px" }} to="/browse">
                Browse Collection
              </Link>
              <Link className="btn btn-gold" style={{ padding: "12px 32px" }} to="/buddy">
                AI Stylist
              </Link>
            </div>
            <div className="hero-badges">
              <span className="vbadge">Sustainable</span>
              <span className="vbadge">Personal Styling</span>
              <span className="vbadge">Pakistan Only</span>
              <span className="vbadge">Verified Lenders</span>
            </div>
          </div>
          <div className="hero-right">
            {featured.map((item) => {
              const primaryImage = item.imageUrls?.find(Boolean);
              return (
              <Link className="vintage-card" key={item._id} to={`/product/${item._id}`}>
                <div className={`vintage-card-img ${item.imageToneClass || ""}`}>
                  {primaryImage ? (
                    <img alt={item.title} src={listingImageUrl(primaryImage)} />
                  ) : (
                    <span>No image</span>
                  )}
                </div>
                <div className="vintage-card-body">
                  <div className={`vcard-label ${item.type === "Rent" ? "rent" : "buy"}`}>
                    {item.type === "Rent" ? "For Rent" : "For Sale"}
                  </div>
                  <h4>{item.title}</h4>
                  <p className="vmeta">
                    {item.material} · Size {item.size} · {item.city}
                  </p>
                  <div className="vprice">
                    Rs. {item.price.toLocaleString()} <small>{item.pricingModel}</small>
                  </div>
                </div>
              </Link>
              );
            })}
          </div>
        </section>

        <section className="features-strip">
          <div className="strip-head">
            <div className="strip-eyebrow">Platform Features</div>
            <div className="strip-title">
              Fashion, reimagined with <em>intelligence</em>
            </div>
          </div>
          <div className="features-row">
            <Link className="feature-block" to="/buddy">
              <div className="feature-num">01</div>
              <h3>Personal Styling</h3>
              <p>
                Tell us your occasion and preferences. Vintora recommends complete, colour-coordinated
                outfits from the Vintora catalogue.
              </p>
            </Link>
            <Link className="feature-block" to="/browse">
              <div className="feature-num">02</div>
              <h3>Curated Browse</h3>
              <p>Search the live catalog by occasion, city, size, and listing type with real stored data.</p>
            </Link>
            <Link className="feature-block" to="/tryon">
              <div className="feature-num">03</div>
              <h3>Virtual Try-On</h3>
              <p>Choose a rental item and preview how it looks on you before booking.</p>
            </Link>
            <Link className="feature-block" to="/closet">
              <div className="feature-num">04</div>
              <h3>Smart Closet</h3>
              <p>Logged-in users can manage their own fashion inventory and get outfit suggestions from it.</p>
            </Link>
            <div className="feature-block">
              <div className="feature-num">05</div>
              <h3>Structured Booking</h3>
              <p>Clear pricing, deposits, availability, and booking history keep every rental easy to manage.</p>
            </div>
            <div className="feature-block">
              <div className="feature-num">06</div>
              <h3>Verified Community</h3>
              <p>Verified accounts, seller dashboards, and admin approvals help keep the marketplace reliable.</p>
            </div>
          </div>
        </section>

        <section className="occasions">
          <div className="section-head">
            <div className="section-eyebrow">Browse by Occasion</div>
            <div className="section-title">
              Dressed for every <em>moment</em>
            </div>
          </div>
          <div className="occ-grid">
            <Link className="occ-card" to="/browse">
              <span className="occ-icon">&#10022;</span>
              <h4>Barat &amp; Mehndi</h4>
              <p>{(counts.Barat || 0) + (counts.Mehndi || 0)} listings available</p>
            </Link>
            <Link className="occ-card" to="/browse">
              <span className="occ-icon">&#10025;</span>
              <h4>Walima</h4>
              <p>{counts.Walima || 0} listings available</p>
            </Link>
            <Link className="occ-card" to="/browse">
              <span className="occ-icon">&#9790;</span>
              <h4>Eid &amp; Festive</h4>
              <p>{counts.Eid || 0} listings available</p>
            </Link>
            <Link className="occ-card" to="/browse">
              <span className="occ-icon">&#9670;</span>
              <h4>Formal &amp; Office</h4>
              <p>{counts.Formal || 0} listings available</p>
            </Link>
            <Link className="occ-card" to="/browse">
              <span className="occ-icon">&#10023;</span>
              <h4>Parties &amp; Events</h4>
              <p>{counts.Party || 0} listings available</p>
            </Link>
          </div>
        </section>

        <section className="how-it-works">
          <div className="section-head">
            <div className="section-eyebrow">How It Works</div>
            <div className="section-title">
              Three steps to your perfect <em>look</em>
            </div>
          </div>
          <div className="hiw-grid">
            <div className="hiw-card">
              <div className="hiw-circle">1</div>
              <h4>Discover</h4>
              <p>Browse the live catalogue or describe your occasion to the AI Stylist for instant suggestions.</p>
            </div>
            <div className="hiw-arrow">&#8594;</div>
            <div className="hiw-card">
              <div className="hiw-circle">2</div>
              <h4>Try &amp; Reserve</h4>
              <p>Preview your look with Virtual Try-On, then message the seller and confirm your booking.</p>
            </div>
            <div className="hiw-arrow">&#8594;</div>
            <div className="hiw-card">
              <div className="hiw-circle">3</div>
              <h4>Wear &amp; Return</h4>
              <p>Enjoy your event, then return or resell — sustainable fashion made effortless.</p>
            </div>
          </div>
        </section>

        <section className="cta-banner">
          <div className="cta-content">
            <h2>Ready to find your next look?</h2>
            <p>Join thousands curating sustainable Pakistani fashion — rent, resell, and restyle with Vintora.</p>
            <div className="hero-btns" style={{ justifyContent: "center" }}>
              <Link className="btn btn-primary" style={{ padding: "12px 32px" }} to="/browse">
                Start Browsing
              </Link>
              <Link className="btn btn-outline" style={{ padding: "12px 32px" }} to="/register">
                Create Account
              </Link>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}