import ClosetItem from "../models/ClosetItem.js";
import Listing from "../models/Listing.js";

// ── Claude API call ───────────────────────────────────────────────────────────
async function callClaude(prompt) {
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1000,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!response.ok) {
    throw new Error(`Claude API error: ${response.status}`);
  }

  const data = await response.json();
  let raw = data.content[0].text.trim();
  raw = raw.replace(/```json/g, "").replace(/```/g, "").trim();
  return JSON.parse(raw);
}

// ── Smart local fallback (no API needed) ─────────────────────────────────────
function detectOccasion(text) {
  const t = text.toLowerCase();
  if (["mehndi", "dholki", "mayon"].some((w) => t.includes(w))) return "mehndi";
  if (["barat", "wedding", "shaadi", "bridal"].some((w) => t.includes(w))) return "barat";
  if (["walima", "reception"].some((w) => t.includes(w))) return "walima";
  if (["eid", "casual", "family", "lunch"].some((w) => t.includes(w))) return "casual";
  if (["formal", "dinner", "party", "function"].some((w) => t.includes(w))) return "formal";
  return "general";
}

const OCCASION_CONFIG = {
  mehndi: {
    keywords: ["mehndi", "bright", "festive", "yellow", "green", "sharara", "embroidered", "colorful", "colour"],
    intro: "For your Mehndi, I picked bright and festive pieces from our live catalogue — perfect for dancing and photos!",
    tip: "Go for bright colours and comfortable footwear — you will be on the dance floor all night!",
  },
  barat: {
    keywords: ["barat", "bridal", "wedding", "red", "maroon", "lehenga", "heavy", "zardozi", "formal"],
    intro: "For Barat, here are rich and elegant pieces from our catalogue — statement pieces for your most important day.",
    tip: "Let the embroidery speak — keep jewellery bold and makeup rich for Barat.",
  },
  walima: {
    keywords: ["walima", "reception", "pastel", "ivory", "soft", "elegant", "light", "chiffon"],
    intro: "For Walima, I selected soft and refined pieces — a graceful look for the morning after.",
    tip: "Soft palette and clean lines make a Walima look timeless and elegant.",
  },
  casual: {
    keywords: ["eid", "casual", "lawn", "light", "fresh", "shalwar", "cotton", "embroidered"],
    intro: "For a casual occasion, here are fresh and comfortable picks from our catalogue.",
    tip: "Choose an embroidered dupatta to elevate a simple outfit effortlessly.",
  },
  formal: {
    keywords: ["formal", "dinner", "party", "chiffon", "embroidered", "net", "silk"],
    intro: "For a formal occasion, I curated polished and sophisticated pieces from our catalogue.",
    tip: "One statement jewellery piece can transform an entire formal look.",
  },
  general: {
    keywords: ["dress", "formal", "embroidered", "suit", "kameez", "traditional"],
    intro: "Here are some lovely pieces from our live catalogue suited to your occasion.",
    tip: "Match one accessory to your dupatta colour for a coordinated finish.",
  },
};

function scoreListings(listings, occasion, userText, limit = 4) {
  const config = OCCASION_CONFIG[occasion] || OCCASION_CONFIG.general;
  const t = userText.toLowerCase();

  const budgetMatch = t.match(/rs\.?\s*(\d+[\d,]*)/i) || t.match(/under\s+(\d+[\d,]*)/i);
  const budget = budgetMatch ? parseInt(budgetMatch[1].replace(/,/g, "")) : null;

  const colours = ["red", "maroon", "blue", "green", "yellow", "pink", "white", "ivory", "pastel", "black", "gold", "orange", "purple"];
  const preferredColour = colours.find((c) => t.includes(c));

  return listings
    .filter((item) => {
      if (budget && item.price && item.price > budget * 1.2) return false;
      return true;
    })
    .map((item) => {
      const searchable = `${item.title} ${item.category} ${item.occasion || ""} ${(item.tags || []).join(" ")}`.toLowerCase();
      let score = 0;

      config.keywords.forEach((kw) => { if (searchable.includes(kw)) score += 3; });
      if (item.occasion && item.occasion.toLowerCase().includes(occasion)) score += 8;
      if (preferredColour && searchable.includes(preferredColour)) score += 5;

      t.split(" ").forEach((word) => {
        if (word.length > 3 && searchable.includes(word)) score += 2;
      });

      if (item.imageUrls?.some(Boolean)) score += 2;

      return { item, score };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ item }) => {
      const img = item.imageUrls?.find(Boolean);
      const imageUrl = img
        ? img.startsWith("http") ? img : `http://localhost:5000${img}`
        : null;

      return {
        name: item.title,
        note: `${item.category} available in ${item.city || "your city"}.`,
        type: item.type === "Rent" ? "rental" : "buy",
        itemId: item._id.toString(),
        resolvedId: item._id.toString(),
        imageUrl,
        price: item.price,
        city: item.city,
        category: item.category,
      };
    });
}

// Build "own" pieces from the user's Smart Closet
function buildClosetPieces(closetItems, limit = 2) {
  if (!closetItems || !closetItems.length) return [];

  return closetItems.slice(0, limit).map((item) => {
    const img = item.imageUrl;
    const imageUrl = img
      ? (img.startsWith("http") ? img : `http://localhost:5000${img}`)
      : null;

    return {
      name: item.itemName,
      note: "From your Smart Closet — pair this with the rentals below.",
      type: "own",
      itemId: "",
      resolvedId: null,
      imageUrl,
      price: null,
      city: null,
      category: item.category,
    };
  });
}

// ── Request schemas ───────────────────────────────────────────────────────────

// ── POST /api/buddy/suggest ───────────────────────────────────────────────────
export const suggestOutfit = async (req, res) => {
  try {
    const { event } = req.body;

    if (!event) {
      return res.status(400).json({ success: false, message: "event is required" });
    }

    // Fetch real listings from DB
    const listings = await Listing.find({ isActive: { $ne: false } })
      .select("_id title category occasion type price city tags imageUrls")
      .lean();

    // Fetch user closet if logged in
    let closetItems = [];
    if (req.user?._id) {
      closetItems = await ClosetItem.find({ userId: req.user._id })
        .select("itemName category imageUrl")
        .lean();
    }

    const occasion = detectOccasion(event);
    const config = OCCASION_CONFIG[occasion] || OCCASION_CONFIG.general;

    // Build catalogue text for Claude (top 20 most relevant by occasion keywords)
    const allScored = listings
      .map((item) => {
        const searchable = `${item.title} ${item.category} ${item.occasion || ""} ${(item.tags || []).join(" ")}`.toLowerCase();
        const score = config.keywords.reduce((s, kw) => s + (searchable.includes(kw) ? 3 : 0), 0);
        return { item, score };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 20);

    const catalogText = allScored.map(({ item }) =>
      `[${item._id}] ${item.title} | ${item.category} | Rs.${item.price || 0} | ${item.city || "N/A"} | ${item.type || "Rent"}${item.occasion ? " | " + item.occasion : ""}`
    ).join("\n");

    const closetText = closetItems.length
      ? "User's own closet items (mark these pieces as 'own' if used, with empty itemId):\n" +
        closetItems.map((i) => `  - ${i.itemName} (${i.category})`).join("\n")
      : "User has no closet items — suggest rental items only.";

    const prompt = `You are Vintora's AI Fashion Buddy — a warm, expert Pakistani fashion stylist.

User request: "${event}"
Detected occasion: ${occasion}

${closetText}

Available items in the Vintora catalogue:
${catalogText}

Pick the MOST SUITABLE 3-4 items for a ${occasion} occasion. Consider colours, formality, and Pakistani fashion norms.
If the user has closet items that fit, include 1-2 of them marked as "own" with empty itemId, and fill the rest with catalogue rentals.

Respond ONLY with valid JSON, no markdown, no extra text:
{
  "intro": "Warm 1-2 sentence response personalised to this occasion and Pakistani culture. If closet items are used, mention combining their wardrobe with rentals.",
  "pieces": [
    {
      "name": "Exact catalogue title OR exact closet item name",
      "note": "Why this suits the occasion specifically, under 12 words",
      "type": "rental or own",
      "itemId": "exact MongoDB ID from catalogue list above, or empty string for closet items",
      "category": "dress/footwear/jewellery/bag"
    }
  ],
  "tip": "One specific actionable styling tip for ${occasion} in Pakistani fashion"
}

Occasion styling rules:
- Mehndi: MUST be bright colours (yellow, green, orange, pink), festive, comfortable for dancing
- Barat/Wedding: rich fabrics, deep tones (red, maroon, gold), heavy embroidery, formal
- Walima: soft pastels (ivory, champagne, blush), elegant, lighter than Barat
- Eid/Casual: fresh, breathable, modest, lawn or cotton preferred
- Formal: polished, sophisticated, chiffon or net fabrics

IMPORTANT: itemId must be EXACTLY the MongoDB ID shown in brackets in the catalogue list, or empty string "" for closet items.
Only use catalogue items from the list above for rentals. If a category has no good match, still include it with the closest item.`;

    let result;
    try {
      result = await callClaude(prompt);

      // Enrich Claude's response with real image URLs and metadata
      const listingMap = {};
      listings.forEach((l) => { listingMap[l._id.toString()] = l; });

      const closetMap = {};
      closetItems.forEach((c) => { closetMap[c.itemName.toLowerCase()] = c; });

      result.pieces = (result.pieces || []).map((piece) => {
        // Catalogue item match
        const matched = listingMap[piece.itemId];
        if (matched) {
          const img = matched.imageUrls?.find(Boolean);
          return {
            ...piece,
            resolvedId: matched._id.toString(),
            imageUrl: img ? (img.startsWith("http") ? img : `http://localhost:5000${img}`) : null,
            price: matched.price,
            city: matched.city,
          };
        }

        // Closet item match (by name, since itemId is empty for closet pieces)
        if (piece.type === "own") {
          const closetMatch = closetMap[piece.name?.toLowerCase()];
          if (closetMatch?.imageUrl) {
            const img = closetMatch.imageUrl;
            return {
              ...piece,
              resolvedId: null,
              imageUrl: img.startsWith("http") ? img : `http://localhost:5000${img}`,
            };
          }
        }

        return { ...piece, imageUrl: piece.imageUrl || null, resolvedId: piece.resolvedId || null };
      });

    } catch (aiErr) {
      console.warn("[fashionBuddyController] Claude failed, using smart fallback:", aiErr.message);

      const closetPieces = buildClosetPieces(closetItems, 2);
      const remainingSlots = Math.max(4 - closetPieces.length, 2);
      const catalogPieces = scoreListings(listings, occasion, event, remainingSlots);

      result = {
        intro: closetItems.length
          ? `I combined pieces from your Smart Closet with matching rentals from our catalogue for ${occasion === "general" ? "your occasion" : "your " + occasion}.`
          : config.intro,
        pieces: [...closetPieces, ...catalogPieces],
        tip: config.tip,
        source: "local_fallback",
      };
    }

    return res.json({ success: true, outfit: result });

  } catch (error) {
    console.error("[fashionBuddyController] suggestOutfit:", error.message);
    res.status(500).json({ success: false, message: "Server error" });
  }
};