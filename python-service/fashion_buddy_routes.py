from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional
import json
import httpx

router = APIRouter()

ANTHROPIC_URL = "https://api.anthropic.com/v1/messages"
ANTHROPIC_MODEL = "claude-sonnet-4-20250514"


# ── Greeting / intent detection ───────────────────────────────────────────────

def is_outfit_request(text: str) -> bool:
    """Return True only if the message looks like an actual styling/outfit request."""
    text = text.lower().strip()

    if len(text) < 8:
        return False

    greetings = [
        "hi", "hello", "hey", "salam", "assalam", "helo", "hii", "hiii", "hiiii",
        "good morning", "good evening", "good afternoon", "how are you",
        "what can you do", "who are you", "help", "what is this", "test",
        "okay", "ok", "thanks", "thank you", "bye", "goodbye",
    ]
    for g in greetings:
        if text == g or text.startswith(g + " ") or text.startswith(g + "!") or text.startswith(g + ","):
            return False

    fashion_signals = [
        "mehndi", "barat", "walima", "wedding", "shaadi", "eid", "nikah",
        "dholki", "mayon", "reception", "party", "function", "formal",
        "casual", "look", "outfit", "wear", "dress", "suggest", "style",
        "occasion", "event", "lunch", "dinner", "family", "colour", "color",
        "budget", "size", "lehenga", "shalwar", "kameez", "dupatta", "suit",
        "rs.", "rs ", "rupee", "small", "medium", "large", "pastel", "bright",
        "dark", "light", "formal", "semi", "traditional", "modern",
    ]
    return any(signal in text for signal in fashion_signals)


def get_conversational_reply(text: str) -> dict:
    """Return a friendly chat response for non-outfit messages."""
    text_lower = text.lower().strip()

    if any(g in text_lower for g in ["hi", "hello", "hey", "salam", "assalam", "helo", "hii"]):
        return {
            "conversational": True,
            "intro": "Hello! I am your Vintora Stylist. Tell me about your upcoming occasion — the event name, your preferred colours, size, and budget — and I will put together a complete look from our live catalogue.",
            "pieces": [],
            "tip": "",
        }

    if any(g in text_lower for g in ["how are you", "how r you", "how are u"]):
        return {
            "conversational": True,
            "intro": "I am doing great, thank you for asking! Ready to style you. Share your occasion details and I will curate something beautiful from the Vintora catalogue.",
            "pieces": [],
            "tip": "",
        }

    if any(g in text_lower for g in ["what can you do", "who are you", "what is this"]):
        return {
            "conversational": True,
            "intro": "I am Vintora's AI Stylist. Describe your occasion — for example: 'Walima look, pastel colours, medium size, under Rs. 8,000' — and I will recommend a complete outfit from our live rental and resale catalogue.",
            "pieces": [],
            "tip": "",
        }

    if any(g in text_lower for g in ["thanks", "thank you", "shukriya"]):
        return {
            "conversational": True,
            "intro": "You are most welcome! Whenever you are ready for your next occasion, just describe it and I will find the perfect look for you.",
            "pieces": [],
            "tip": "",
        }

    if any(g in text_lower for g in ["help"]):
        return {
            "conversational": True,
            "intro": "Of course! Just tell me your occasion, preferred colours, size, and budget. For example: 'Mehndi function, bright colours, medium size, under Rs. 5,000'. I will suggest a complete outfit from the Vintora catalogue.",
            "pieces": [],
            "tip": "",
        }

    if any(g in text_lower for g in ["bye", "goodbye", "khuda hafiz"]):
        return {
            "conversational": True,
            "intro": "Take care! Come back whenever you need styling help for your next occasion. Khuda Hafiz!",
            "pieces": [],
            "tip": "",
        }

    # Generic fallback for anything short or unclear
    return {
        "conversational": True,
        "intro": "I specialise in outfit curation for Pakistani occasions. Try something like: 'Barat look, deep red, medium size, under Rs. 15,000' and I will find the best pieces from our live catalogue for you.",
        "pieces": [],
        "tip": "",
    }


# ── Theme-based hardcoded fallback ────────────────────────────────────────────

def _pick_theme(event: str, style_note: str = ""):
    text = f"{event} {style_note}".lower()

    if any(w in text for w in ["mehndi", "mayon", "dholki"]):
        return {
            "intro": "For a Mehndi event, go bright, festive, and comfortable so you can move easily while still looking polished.",
            "pieces": [
                {"icon": "D", "name": "Mustard Gota Patti Sharara Set", "note": "Bright colour works beautifully for Mehndi photos.", "type": "rental"},
                {"icon": "S", "name": "Gold Khussa With Threadwork", "note": "Comfortable for dancing and long events.", "type": "rental"},
                {"icon": "J", "name": "Pearl Jhumka and Tikka Set", "note": "Keeps the look traditional but soft.", "type": "rental"},
                {"icon": "B", "name": "Embroidered Potli Bag", "note": "Matches festive gota and mirror work.", "type": "rental"},
            ],
            "tip": "Drape the dupatta on one shoulder and keep makeup warm with gold shimmer.",
        }

    if any(w in text for w in ["barat", "bridal", "wedding", "shaadi"]):
        return {
            "intro": "For a Barat or wedding look, choose richer fabrics, deeper tones, and statement jewellery.",
            "pieces": [
                {"icon": "D", "name": "Maroon Zardozi Lehenga", "note": "Rich embroidery makes it ideal for Barat.", "type": "rental"},
                {"icon": "S", "name": "Antique Gold Block Heels", "note": "Adds height while matching heavy work.", "type": "rental"},
                {"icon": "J", "name": "Kundan Choker With Earrings", "note": "Balances the neckline and dupatta.", "type": "rental"},
                {"icon": "B", "name": "Velvet Bridal Clutch", "note": "A compact formal finishing piece.", "type": "rental"},
            ],
            "tip": "Pin the dupatta neatly so jewellery and embroidery both remain visible.",
        }

    if any(w in text for w in ["walima", "reception"]):
        return {
            "intro": "For Walima, a softer elegant palette works best: ivory, champagne, silver, or pastel tones.",
            "pieces": [
                {"icon": "D", "name": "Ivory Net Gown With Silver Work", "note": "Elegant and refined for reception lighting.", "type": "rental"},
                {"icon": "S", "name": "Silver Embellished Heels", "note": "Complements cool metallic embroidery.", "type": "rental"},
                {"icon": "J", "name": "Crystal Drop Earrings", "note": "Keeps the look graceful and light.", "type": "rental"},
                {"icon": "B", "name": "Pearl White Clutch", "note": "Soft accessory for pastel styling.", "type": "rental"},
            ],
            "tip": "Use a clean hairstyle and let the gown silhouette stay the main focus.",
        }

    if any(w in text for w in ["eid", "lunch", "casual", "family"]):
        return {
            "intro": "For Eid or a family gathering, keep it fresh, breathable, and polished.",
            "pieces": [
                {"icon": "D", "name": "Mint Embroidered Lawn Suit", "note": "Light fabric works well for daytime.", "type": "rental"},
                {"icon": "S", "name": "Neutral Kolhapuri Sandals", "note": "Comfortable and easy to repeat.", "type": "rental"},
                {"icon": "J", "name": "Small Pearl Studs", "note": "Simple jewellery keeps it graceful.", "type": "rental"},
                {"icon": "B", "name": "Tan Crossbody Bag", "note": "Practical for family visits.", "type": "rental"},
            ],
            "tip": "Choose a printed or embroidered dupatta if the suit is plain.",
        }

    return {
        "intro": "I put together a balanced Pakistani fashion look for your occasion.",
        "pieces": [
            {"icon": "D", "name": "Embroidered Chiffon Kameez With Dupatta", "note": "Dressy without feeling too heavy.", "type": "rental"},
            {"icon": "S", "name": "Gold Low Heels", "note": "Comfortable for long wear.", "type": "rental"},
            {"icon": "J", "name": "Statement Jhumkas", "note": "Adds a traditional focal point.", "type": "rental"},
            {"icon": "B", "name": "Matching Embroidered Clutch", "note": "Pulls the outfit together.", "type": "rental"},
        ],
        "tip": "Match one accessory to the dupatta colour for a coordinated finish.",
    }


def fallback_outfit(event: str, style_note: str = "", closet_items=None, reason: str = ""):
    outfit = _pick_theme(event, style_note)
    closet_items = closet_items or []
    if closet_items:
        outfit["pieces"][0] = {
            "icon": "D",
            "name": closet_items[0].itemName,
            "note": f"Use your own {closet_items[0].category.lower()} as the base.",
            "type": "own",
        }
    if reason:
        outfit["source"] = "local_fallback"
    return outfit


def catalog_outfit(event: str, style_note: str = "", closet_items=None, catalog_items=None, reason: str = ""):
    catalog_items = catalog_items or []
    if not catalog_items:
        return fallback_outfit(event, style_note, closet_items, reason)

    text = f"{event} {style_note}".lower()

    def item_score(item):
        searchable = " ".join([
            item.title or "", item.category or "",
            item.occasion or "", " ".join(item.tags or []),
        ]).lower()
        score = 0
        for word in text.split():
            if len(word) > 2 and word in searchable:
                score += 2
        if item.occasion and item.occasion.lower() in text:
            score += 5
        return score

    selected = sorted(catalog_items, key=item_score, reverse=True)[:4]
    pieces = [
        {
            "icon": "I",
            "name": item.title,
            "note": f"{item.category} in {item.city or 'available city'} - Rs. {int(item.price or 0)}.",
            "type": "rental" if item.type == "Rent" else "buy",
            "itemId": item.id,
            "price": item.price,
            "city": item.city,
        }
        for item in selected
    ]

    closet_items = closet_items or []
    if closet_items:
        pieces.insert(0, {
            "icon": "O",
            "name": closet_items[0].itemName,
            "note": f"Use your own {closet_items[0].category.lower()} with these catalog picks.",
            "type": "own",
        })
        pieces = pieces[:4]

    return {
        "intro": "I matched your occasion with real items currently available in the Vintora catalog.",
        "pieces": pieces,
        "tip": "Open any suggested item from Browse and confirm size, city, and availability before booking.",
        "source": "catalog_fallback" if reason else "catalog",
    }


# ── Request schemas ───────────────────────────────────────────────────────────

class ClosetItemInput(BaseModel):
    itemName: str
    category: str


class CatalogItemInput(BaseModel):
    id: Optional[str] = ""
    title: str
    category: str
    occasion: Optional[str] = ""
    type: Optional[str] = "Rent"
    price: Optional[float] = 0
    city: Optional[str] = ""
    tags: Optional[List[str]] = []


class OutfitRequest(BaseModel):
    event: str
    styleNote: Optional[str] = ""
    closetItems: Optional[List[ClosetItemInput]] = []
    catalogItems: Optional[List[CatalogItemInput]] = []


# ── POST /buddy/suggest-outfit ────────────────────────────────────────────────

@router.post("/suggest-outfit")
async def suggest_outfit(body: OutfitRequest):
    if not body.event:
        raise HTTPException(status_code=400, detail="event is required")

    # ── Handle greetings and non-outfit messages ──────────────────────────────
    if not is_outfit_request(body.event):
        return get_conversational_reply(body.event)

    # ── Build closet context ──────────────────────────────────────────────────
    if body.closetItems:
        closet_desc = "The user has these items in their Smart Closet:\n"
        for item in body.closetItems:
            closet_desc += f"  - {item.itemName} ({item.category})\n"
        closet_desc += "Try to incorporate their closet items and label them as 'own'."
    else:
        closet_desc = "The user has no closet items. Suggest rental items only."

    # ── Build catalogue context (top 8 by relevance) ──────────────────────────
    catalog_context = ""
    if body.catalogItems:
        text = f"{body.event} {body.styleNote or ''}".lower()

        def score(item):
            searchable = f"{item.title} {item.category} {item.occasion} {' '.join(item.tags or [])}".lower()
            s = sum(2 for w in text.split() if len(w) > 2 and w in searchable)
            if item.occasion and item.occasion.lower() in text:
                s += 5
            return s

        top = sorted(body.catalogItems, key=score, reverse=True)[:8]
        if top:
            catalog_context = "\nReal items currently available in the Vintora catalogue:\n"
            for item in top:
                catalog_context += (
                    f"  - [{item.id}] {item.title} | {item.category}"
                    f" | Rs.{int(item.price or 0)} | {item.city or 'N/A'}"
                    f" | {item.type or 'Rent'}"
                    f"{' | ' + item.occasion if item.occasion else ''}\n"
                )
            catalog_context += "Prioritise these real items in your suggestion. Use their exact titles and IDs.\n"

    # ── Build prompt ──────────────────────────────────────────────────────────
    prompt = f"""You are Vintora's AI Fashion Buddy — a warm, knowledgeable Pakistani fashion stylist.

Event: {body.event}
{f"Style note: {body.styleNote}" if body.styleNote else ""}

{closet_desc}
{catalog_context}

Suggest a complete outfit for this occasion. Respond ONLY with valid JSON — no markdown, no backticks, no extra text.

{{
  "intro": "A warm 1-2 sentence personalised greeting for this event and Pakistani culture",
  "pieces": [
    {{
      "icon": "D",
      "name": "Specific item name — use exact catalogue title if available",
      "note": "Short styling tip under 15 words",
      "type": "own or rental",
      "itemId": "catalogue item ID if used, else empty string"
    }},
    {{
      "icon": "S",
      "name": "Footwear",
      "note": "Styling tip",
      "type": "rental",
      "itemId": ""
    }},
    {{
      "icon": "J",
      "name": "Jewellery",
      "note": "Styling tip",
      "type": "rental",
      "itemId": ""
    }},
    {{
      "icon": "B",
      "name": "Bag or clutch",
      "note": "Styling tip",
      "type": "rental",
      "itemId": ""
    }}
  ],
  "tip": "One overall styling tip specific to this event and Pakistani fashion"
}}

Rules:
- Use Pakistani fashion terms naturally (Dupatta, Sherwani, Lehenga, Kameez, Gharara, etc.)
- Be specific with colours and fabrics
- If a catalogue item fits, use its exact title and ID in itemId field
- Mark closet items as "own", everything else as "rental"
- Keep each note under 15 words
- Do not add any text outside the JSON"""

    # ── Call Anthropic API ────────────────────────────────────────────────────
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                ANTHROPIC_URL,
                headers={
                    "Content-Type": "application/json",
                    "anthropic-version": "2023-06-01",
                },
                json={
                    "model": ANTHROPIC_MODEL,
                    "max_tokens": 1024,
                    "messages": [{"role": "user", "content": prompt}],
                },
            )

        if response.status_code != 200:
            raise Exception(f"Anthropic API returned {response.status_code}: {response.text}")

        data = response.json()
        raw_text = data["content"][0]["text"].strip()
        raw_text = raw_text.replace("```json", "").replace("```", "").strip()
        outfit = json.loads(raw_text)

        # Enrich pieces with catalogue metadata if itemId matched
        catalog_map = {item.id: item for item in (body.catalogItems or []) if item.id}
        for piece in outfit.get("pieces", []):
            item_id = piece.get("itemId", "")
            if item_id and item_id in catalog_map:
                matched = catalog_map[item_id]
                piece["price"] = matched.price
                piece["city"] = matched.city

        return outfit

    except json.JSONDecodeError:
        return catalog_outfit(body.event, body.styleNote, body.closetItems, body.catalogItems, "invalid_json")
    except Exception as e:
        print(f"[buddy] Anthropic call failed: {e}")
        return catalog_outfit(body.event, body.styleNote, body.closetItems, body.catalogItems, str(e))