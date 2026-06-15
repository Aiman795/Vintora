import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { fetchPublicListings } from "../services/api.js";

const API_URL = "http://localhost:5000/api";
function listingImageUrl(url) {
  if (!url) return "";
  return url.startsWith("http") ? url : `${API_URL}${url}`;
}

function ProductThumb({ imageUrl, title }) {
  const [imgError, setImgError] = useState(false);
  if (!imageUrl || imgError) {
    return (
      <div style={{
        width: "56px", height: "56px", borderRadius: "8px", flexShrink: 0,
        background: "#f5f0eb", display: "flex", alignItems: "center",
        justifyContent: "center", fontSize: "11px", color: "#aaa",
      }}>
        No img
      </div>
    );
  }
  return (
    <div className="outfit-item-icon catalog-thumb" style={{ width: "56px", height: "56px", flexShrink: 0 }}>
      <img
        alt={title}
        src={imageUrl}
        onError={() => setImgError(true)}
        style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "8px" }}
      />
    </div>
  );
}

function isOutfitRequest(text) {
  const t = text.toLowerCase().trim();
  if (t.length < 8) return false;
  const greetings = [
    "hi", "hello", "hey", "salam", "assalam", "helo", "hii", "hiii",
    "good morning", "good evening", "good afternoon", "how are you",
    "what can you do", "who are you", "help me", "what is this", "test",
    "okay", "ok", "thanks", "thank you", "bye", "goodbye",
  ];
  for (const g of greetings) {
    if (t === g || t.startsWith(g + " ") || t.startsWith(g + "!") || t.startsWith(g + ",")) return false;
  }
  const signals = [
    "mehndi", "barat", "walima", "wedding", "shaadi", "eid", "nikah",
    "dholki", "mayon", "reception", "party", "function", "formal",
    "casual", "look", "outfit", "wear", "dress", "suggest", "style",
    "occasion", "event", "lunch", "dinner", "family", "colour", "color",
    "budget", "size", "lehenga", "shalwar", "kameez", "dupatta", "suit",
    "rs.", "rs ", "rupee", "small", "medium", "large", "pastel", "bright",
    "dark", "light", "traditional", "modern", "festive", "recommend",
  ];
  return signals.some((s) => t.includes(s));
}

function getConversationalReply(text) {
  const t = text.toLowerCase().trim();
  if (["hi", "hello", "hey", "salam", "assalam", "helo", "hii"].some((g) => t === g || t.startsWith(g + " "))) {
    return "Hello! I am your Vintora Stylist. Tell me about your upcoming occasion — the event name, preferred colours, size, and budget — and I will put together a complete look from our live catalogue.";
  }
  if (t.includes("how are you") || t.includes("how r you")) {
    return "I am doing great, thank you! Ready to style you. Share your occasion details and I will curate something beautiful from the Vintora catalogue.";
  }
  if (t.includes("what can you do") || t.includes("who are you") || t.includes("what is this")) {
    return "I am Vintora's AI Stylist. Describe your occasion — for example: 'Walima look, pastel colours, medium size, under Rs. 8,000' — and I will recommend a complete outfit from our live rental and resale catalogue.";
  }
  if (t.includes("thank")) {
    return "You are most welcome! Whenever you are ready for your next occasion, just describe it and I will find the perfect look for you.";
  }
  if (t.includes("bye") || t.includes("goodbye")) {
    return "Take care! Come back whenever you need styling help. Khuda Hafiz!";
  }
  return "I specialise in outfit curation for Pakistani occasions. Try something like: 'Mehndi function, bright colours, medium size, under Rs. 5,000' and I will find the best pieces from our live catalogue.";
}

export default function BuddyPage() {
  const [listings, setListings] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [outfit, setOutfit] = useState(null);
  const [messages, setMessages] = useState([
    {
      sender: "ai",
      text: "Welcome to Vintora Styling. Share your occasion, preferred colours, size, and budget, and I will curate a complete look from the live catalogue.",
    },
  ]);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    fetchPublicListings().then(setListings).catch(() => setListings([]));
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || loading) return;

    setInput("");
    setMessages((prev) => [...prev, { sender: "user", text }]);
    setLoading(true);

    if (!isOutfitRequest(text)) {
      setMessages((prev) => [...prev, { sender: "ai", text: getConversationalReply(text) }]);
      setLoading(false);
      return;
    }

    try {
      const token = localStorage.getItem("token") || sessionStorage.getItem("token") || "";

      const res = await fetch(`${API_URL}/buddy/suggest`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ event: text }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || `Server error ${res.status}`);
      }

      const data = await res.json();
      const result = data.outfit;

      if (result?.pieces?.length) {
        setOutfit(result);
      }

      setMessages((prev) => [
        ...prev,
        { sender: "ai", text: result?.intro || "Here is a curated look for your occasion." },
      ]);

      if (result?.tip) {
        setMessages((prev) => [...prev, { sender: "ai", text: `Styling tip: ${result.tip}` }]);
      }

    } catch (err) {
      console.error("[BuddyPage]", err.message);
      setMessages((prev) => [
        ...prev,
        { sender: "ai", text: "I could not create a recommendation right now. Please try again in a moment." },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const catalogPicks = listings.slice(0, 4);

  return (
    <main className="page">
      <div className="page-header-bar">
        <div>
          <h2>Vintora Styling</h2>
          <p>Describe the occasion and receive a curated outfit recommendation from the live catalogue.</p>
        </div>
      </div>

      <section className="buddy-layout">
        <div className="buddy-chat">
          <div className="buddy-chat-header">
            <div className="buddy-head-avatar">V</div>
            <div>
              <h3>Vintora Stylist</h3>
              <p>Occasionwear · Rentals · Resale styling</p>
            </div>
            <div className="status-dot" />
          </div>

          <div className="buddy-messages">
            {messages.map((message, index) => (
              <div className={`bmsg ${message.sender}`} key={`${message.sender}-${index}`}>
                <div className="bmsg-bubble">{message.text}</div>
              </div>
            ))}
            {loading && (
              <div className="bmsg ai">
                <div className="bmsg-bubble" style={{ opacity: 0.65 }}>Curating your outfit...</div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="buddy-input-bar">
            <input
              disabled={loading}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendMessage()}
              placeholder="Example: Walima look, pastel colours, medium size, under Rs. 8,000"
              value={input}
            />
            <button className="buddy-send" disabled={loading || !input.trim()} onClick={sendMessage} type="button">
              Send
            </button>
          </div>
        </div>

        <div className="buddy-panel">
          {outfit?.pieces?.length ? (
            <div className="suggestion-card">
              <h4>Curated Recommendation</h4>
              {outfit.pieces.map((piece, index) => (
                <Link
                  className="outfit-item"
                  key={`${piece.name}-${index}`}
                  style={{ textDecoration: "none", color: "inherit" }}
                  to={piece.resolvedId || piece.itemId ? `/product/${piece.resolvedId || piece.itemId}` : "/browse"}
                >
                  <ProductThumb imageUrl={piece.imageUrl} title={piece.name} />
                  <div className="outfit-item-info">
                    <h5>{piece.name}</h5>
                    <p>
                      {piece.note}
                      {piece.city ? ` · ${piece.city}` : ""}
                      {piece.price ? ` · Rs. ${Number(piece.price).toLocaleString()}` : ""}
                    </p>
                  </div>
                  <span className="oprice">{piece.type === "own" ? "Your closet" : "Rental"}</span>
                </Link>
              ))}
              {outfit.tip && <div className="outfit-note">{outfit.tip}</div>}
              <Link className="btn btn-gold" style={{ width: "100%", marginTop: "14px" }} to="/browse">
                Browse Catalogue
              </Link>
            </div>
          ) : (
            <div className="suggestion-card">
              <h4>Recommended Items</h4>
              {catalogPicks.map((item) => {
                const img = item.imageUrls?.find(Boolean);
                return (
                  <Link
                    className="outfit-item"
                    key={item._id}
                    style={{ textDecoration: "none", color: "inherit" }}
                    to={`/product/${item._id}`}
                  >
                    <ProductThumb imageUrl={img ? listingImageUrl(img) : null} title={item.title} />
                    <div className="outfit-item-info">
                      <h5>{item.title}</h5>
                      <p>{item.category} · {item.city} · Rs. {item.price?.toLocaleString()}</p>
                    </div>
                    <span className="oprice">{item.type === "Rent" ? "Rental" : "Buy"}</span>
                  </Link>
                );
              })}
              <div className="outfit-note">
                Share your occasion details to receive a personalised recommendation.
              </div>
              <Link className="btn btn-gold" style={{ width: "100%", marginTop: "14px" }} to="/browse">
                Browse All Items
              </Link>
            </div>
          )}

          <div className="suggestion-card">
            <h4>Styling Note</h4>
            <p className="muted-note" style={{ lineHeight: 1.75 }}>
              {outfit?.tip || "For formal Pakistani occasions, let one statement element lead the look: embroidery, jewellery, or colour. Keep the rest refined."}
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
