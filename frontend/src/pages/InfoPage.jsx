import { Link, useLocation } from "react-router-dom";

const pages = {
  help: {
    title: "Help Center",
    eyebrow: "Support",
    intro: "Quick answers for renting, buying, lending, returns, safety, and AI tools.",
    icon: "❓",
    sections: [
      ["How booking works", "Choose an item, select dates, review the manual checkout details, and send a request to the seller for approval."],
      ["How resale works", "Buy Now creates a purchase request. The seller confirms availability and delivery details inside Vintora messages."],
      ["How disputes work", "Open a dispute from your dashboard. Admin can review booking details, messages, and reviews before resolving the case."],
      ["How AI tools work", "Virtual Search, AI Buddy, Smart Closet, and Try-On help with discovery and styling, but final rental decisions remain with users."]
    ]
  },
  policies: {
    title: "Rental Policies",
    eyebrow: "Platform Rules",
    intro: "Clear rules make the marketplace safer for renters, lenders, and admins.",
    icon: "📋",
    sections: [
      ["Condition and photos", "Listings should include real front, back, detail, measurement, and condition photos before approval."],
      ["Deposits and returns", "Deposits are recorded with the booking and should be returned after the item comes back in agreed condition."],
      ["Cancellations", "Pending bookings can be cancelled by the buyer. Approved bookings should be handled through chat or dispute support."],
      ["Privacy", "Users should keep conversations inside Vintora so admins can review evidence when a dispute is filed."]
    ]
  },
  blog: {
    title: "Vintora Blog",
    eyebrow: "Editorial",
    intro: "Short editorial posts for styling, sustainability, and Pakistani event fashion.",
    icon: "✍️",
    sections: [
      ["Mehndi styling checklist", "Pair bright outfits with lightweight jewelry, comfortable shoes, and a dupatta shade that photographs well."],
      ["Renting instead of buying", "Renting heavy formal wear reduces closet waste and makes premium occasion outfits accessible."],
      ["How to photograph a listing", "Use daylight, a plain background, and close-ups of embroidery, labels, stains, and measurements."],
      ["Smart Closet ideas", "Upload your own accessories first so AI Buddy can recommend rental pieces that reuse what you already own."]
    ]
  },
  "success-stories": {
    title: "Success Stories",
    eyebrow: "Community",
    intro: "Community proof from renters and lenders using the marketplace.",
    icon: "⭐",
    sections: [
      ["Wedding week solved", "A renter found a Barat outfit, matching heels, and jewelry without buying everything new."],
      ["Closet turned into income", "A seller listed formal dresses that were only worn once and started earning through approved rentals."],
      ["Safer than social groups", "Admin approval, booking history, and disputes gave users more confidence than informal WhatsApp deals."]
    ]
  },
  contact: {
    title: "Contact Vintora",
    eyebrow: "Get in Touch",
    intro: "Support channels for account, booking, dispute, and listing questions.",
    icon: "✉️",
    sections: [
      ["Support email", "support@vintora.local"],
      ["Phone", "+92 300 0000000"],
      ["Response time", "Most account and booking questions are handled within 24 to 48 hours."],
      ["Before contacting support", "Include your booking ID, listing title, screenshots, and a short summary of the issue."]
    ]
  }
};

const contactIcons = {
  "Support email": "📧",
  "Phone": "📞",
  "Response time": "🕐",
  "Before contacting support": "📝"
};

export default function InfoPage() {
  const location = useLocation();
  const slug = location.pathname.replace("/", "") || "help";
  const page = pages[slug] || pages.help;
  const isContact = slug === "contact";
  const isBlog = slug === "blog";
  const isSuccess = slug === "success-stories";

  return (
    <main className="page">

      {/* ── Hero header ── */}
      <div style={{
        background: "var(--ivory)",
        borderBottom: "1px solid var(--border)",
        padding: "48px clamp(18px, 4vw, 64px) 40px"
      }}>
        <div style={{ maxWidth: 860, margin: "0 auto" }}>
          <div className="product-breadcrumb" style={{ marginBottom: 10 }}>
            {page.eyebrow}
          </div>
          <h1 style={{
            fontFamily: "var(--font-display)",
            fontSize: "clamp(40px, 5vw, 64px)",
            fontWeight: 400,
            margin: "0 0 14px",
            color: "var(--ink)"
          }}>
            {page.title}
          </h1>
          <p style={{
            margin: "0 0 28px",
            fontSize: 15,
            lineHeight: 1.8,
            color: "var(--sepia-light)",
            maxWidth: 560
          }}>
            {page.intro}
          </p>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            {slug !== "contact" && (
              <Link className="btn btn-outline" to="/contact">
                Contact Support
              </Link>
            )}
            <Link className="btn btn-outline" to="/browse">
              Browse Listings
            </Link>
          </div>
        </div>
      </div>

      {/* ── Content ── */}
      <div style={{
        padding: "48px clamp(18px, 4vw, 64px) 72px",
        maxWidth: 960,
        margin: "0 auto"
      }}>

        {/* Contact page — special card grid layout */}
        {isContact && (
          <>
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
              gap: 20,
              marginBottom: 40
            }}>
              {page.sections.map(([title, body]) => (
                <div key={title} className="data-card" style={{ padding: "28px 26px" }}>
                  <div style={{
                    fontSize: 28,
                    marginBottom: 14
                  }}>
                    {contactIcons[title] || "💬"}
                  </div>
                  <h3 style={{
                    fontFamily: "var(--font-display)",
                    fontSize: 20,
                    fontWeight: 500,
                    margin: "0 0 10px",
                    color: "var(--ink)"
                  }}>
                    {title}
                  </h3>
                  <p style={{
                    margin: 0,
                    fontSize: 14,
                    lineHeight: 1.8,
                    color: title === "Support email" || title === "Phone"
                      ? "var(--antique-gold)"
                      : "var(--sepia-light)",
                    fontWeight: title === "Support email" || title === "Phone" ? 600 : 400
                  }}>
                    {body}
                  </p>
                </div>
              ))}
            </div>

            {/* CTA banner */}
            <div style={{
              background: "var(--ivory)",
              border: "1px solid var(--border)",
              borderRadius: 8,
              padding: "32px 36px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 24,
              flexWrap: "wrap"
            }}>
              <div>
                <h3 style={{
                  fontFamily: "var(--font-display)",
                  fontSize: 24,
                  fontWeight: 400,
                  margin: "0 0 6px",
                  color: "var(--ink)"
                }}>
                  Have a dispute or urgent issue?
                </h3>
                <p className="muted-note" style={{ margin: 0 }}>
                  Log in and file a dispute from your dashboard for the fastest resolution.
                </p>
              </div>
              <Link className="btn btn-primary" to="/dashboard">
                Go to Dashboard
              </Link>
            </div>
          </>
        )}

        {/* Blog — card grid */}
        {isBlog && (
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: 20
          }}>
            {page.sections.map(([title, body], i) => (
              <div key={title} className="data-card" style={{ padding: "28px 26px" }}>
                <div style={{
                  display: "inline-block",
                  padding: "4px 12px",
                  borderRadius: 999,
                  background: "var(--gold-pale)",
                  color: "var(--sepia)",
                  fontSize: 10,
                  fontWeight: 700,
                  letterSpacing: "0.15em",
                  textTransform: "uppercase",
                  marginBottom: 16
                }}>
                  Post {String(i + 1).padStart(2, "0")}
                </div>
                <h3 style={{
                  fontFamily: "var(--font-display)",
                  fontSize: 22,
                  fontWeight: 500,
                  margin: "0 0 12px",
                  color: "var(--ink)",
                  lineHeight: 1.2
                }}>
                  {title}
                </h3>
                <p style={{
                  margin: 0,
                  fontSize: 14,
                  lineHeight: 1.8,
                  color: "var(--sepia-light)"
                }}>
                  {body}
                </p>
              </div>
            ))}
          </div>
        )}

        {/* Success stories — quote style */}
        {isSuccess && (
          <div style={{ display: "grid", gap: 20 }}>
            {page.sections.map(([title, body], i) => (
              <div key={title} className="data-card" style={{
                padding: "32px 36px",
                borderLeft: "4px solid var(--antique-gold)",
                display: "flex",
                gap: 28,
                alignItems: "flex-start"
              }}>
                <div style={{
                  fontFamily: "var(--font-display)",
                  fontSize: 48,
                  color: "var(--gold-pale)",
                  lineHeight: 1,
                  flexShrink: 0,
                  marginTop: -8
                }}>
                  "
                </div>
                <div>
                  <h3 style={{
                    fontFamily: "var(--font-display)",
                    fontSize: 24,
                    fontWeight: 500,
                    margin: "0 0 10px",
                    color: "var(--ink)"
                  }}>
                    {title}
                  </h3>
                  <p style={{
                    margin: 0,
                    fontSize: 15,
                    lineHeight: 1.8,
                    color: "var(--sepia-light)"
                  }}>
                    {body}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Help & Policies — accordion style */}
        {!isContact && !isBlog && !isSuccess && (
          <div style={{ display: "grid", gap: 16 }}>
            {page.sections.map(([title, body], i) => (
              <div key={title} className="data-card" style={{
                padding: "28px 32px",
                display: "flex",
                gap: 24,
                alignItems: "flex-start"
              }}>
                <div style={{
                  width: 36,
                  height: 36,
                  borderRadius: "50%",
                  background: "var(--sepia)",
                  color: "var(--ivory)",
                  display: "grid",
                  placeItems: "center",
                  fontFamily: "var(--font-display)",
                  fontSize: 16,
                  fontWeight: 600,
                  flexShrink: 0
                }}>
                  {i + 1}
                </div>
                <div>
                  <h3 style={{
                    fontFamily: "var(--font-display)",
                    fontSize: 22,
                    fontWeight: 500,
                    margin: "0 0 10px",
                    color: "var(--ink)"
                  }}>
                    {title}
                  </h3>
                  <p style={{
                    margin: 0,
                    fontSize: 14,
                    lineHeight: 1.85,
                    color: "var(--sepia-light)"
                  }}>
                    {body}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}