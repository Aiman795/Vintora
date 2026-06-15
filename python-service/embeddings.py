import os
from pathlib import Path
from urllib.parse import urlparse, unquote

import numpy as np
from PIL import Image, ImageOps
from pymongo import MongoClient

try:
    import torch
    import clip
except Exception:
    torch = None
    clip = None

print("AI Service starting...")

MONGO_URI = os.getenv("MONGODB_URI", "mongodb://localhost:27017/")
UPLOADS_DIR = Path(os.getenv("SERVER_UPLOADS_DIR", Path(__file__).resolve().parents[1] / "server" / "uploads"))

client = MongoClient(MONGO_URI)
db = client["vintora"]
listings_collection = db["listings"]
print("MongoDB connected")

_clip_model = None
_clip_preprocess = None
_clip_failed = False
_clip_device = "cuda" if torch is not None and torch.cuda.is_available() else "cpu"


def _load_clip():
    global _clip_model, _clip_preprocess, _clip_failed
    if _clip_failed or clip is None or torch is None:
        return None, None
    if _clip_model is None or _clip_preprocess is None:
        try:
            _clip_model, _clip_preprocess = clip.load("ViT-B/32", device=_clip_device)
            _clip_model.eval()
        except Exception as exc:
            print(f"CLIP unavailable, using local visual matcher: {exc}")
            _clip_failed = True
            return None, None
    return _clip_model, _clip_preprocess


def _get_clip_embedding(image: Image.Image) -> np.ndarray | None:
    try:
        model, preprocess = _load_clip()
        if model is None or preprocess is None:
            return None
        with torch.no_grad():
            tensor = preprocess(ImageOps.exif_transpose(image).convert("RGB")).unsqueeze(0).to(_clip_device)
            features = model.encode_image(tensor)
            features = features / features.norm(dim=-1, keepdim=True)
        return features.cpu().numpy()[0].astype(np.float32)
    except Exception as exc:
        print(f"CLIP embedding failed: {exc}")
        return None


def get_image_embedding(image: Image.Image) -> np.ndarray:
    clip_embedding = _get_clip_embedding(image)
    if clip_embedding is not None:
        return clip_embedding

    img = ImageOps.exif_transpose(image).resize((96, 96)).convert("RGB")
    arr = np.asarray(img).astype(np.float32) / 255.0

    hist_parts = []
    for channel in range(3):
        hist, _ = np.histogram(arr[:, :, channel], bins=48, range=(0.0, 1.0))
        hist_parts.append(hist.astype(np.float32))

    blocks = []
    for row in range(4):
        for col in range(4):
            patch = arr[row * 24:(row + 1) * 24, col * 24:(col + 1) * 24, :]
            blocks.extend(patch.mean(axis=(0, 1)).tolist())

    embedding = np.concatenate([*hist_parts, np.array(blocks, dtype=np.float32)])
    norm = np.linalg.norm(embedding)
    return embedding / norm if norm > 0 else embedding


def get_image_fingerprint(image: Image.Image) -> np.ndarray:
    img = ImageOps.exif_transpose(image).convert("L").resize((32, 32), Image.LANCZOS)
    arr = np.asarray(img).astype(np.float32)
    return (arr > arr.mean()).astype(np.uint8).reshape(-1)


def _image_path_from_url(image_url: str) -> Path | None:
    if not image_url:
        return None
    parsed = urlparse(image_url)
    if parsed.scheme in ("http", "https"):
        filename = Path(unquote(parsed.path)).name
        return UPLOADS_DIR / filename
    path = Path(unquote(image_url))
    if path.is_absolute():
        return path
    if str(path).replace("\\", "/").startswith("/uploads/"):
        return UPLOADS_DIR / path.name
    return UPLOADS_DIR / path.name


def _listing_embedding(image_url: str) -> np.ndarray | None:
    image_path = _image_path_from_url(image_url)
    if not image_path or not image_path.exists():
        return None
    try:
        with Image.open(image_path) as img:
            return get_image_embedding(img)
    except Exception:
        return None


def _listing_fingerprint(image_url: str) -> np.ndarray | None:
    image_path = _image_path_from_url(image_url)
    if not image_path or not image_path.exists():
        return None
    try:
        with Image.open(image_path) as img:
            return get_image_fingerprint(img)
    except Exception:
        return None


def _cosine(a: np.ndarray, b: np.ndarray) -> float:
    denom = float(np.linalg.norm(a) * np.linalg.norm(b))
    if denom == 0:
        return 0.0
    return float(np.dot(a, b) / denom)


def _fingerprint_similarity(a: np.ndarray, b: np.ndarray) -> float:
    if a is None or b is None or len(a) != len(b):
        return 0.0
    return 1.0 - (np.count_nonzero(a != b) / len(a))


def _display_score(raw_score: float, uses_clip: bool = False) -> int:
    if uses_clip:
        calibrated = (raw_score - 0.45) / 0.30
        return round(max(0.0, min(calibrated, 1.0)) * 100)
    calibrated = (raw_score - 0.78) / 0.22
    return round(max(0.0, min(calibrated, 1.0)) * 100)


# ── CLIP text-based category detection ───────────────────────────────────────

VISUAL_CATEGORY_MAP = {
    "clutch bag":        ["Bags & Clutches"],
    "handbag":           ["Bags & Clutches"],
    "purse":             ["Bags & Clutches"],
    "potli bag":         ["Bags & Clutches"],
    "embellished bag":   ["Bags & Clutches"],
    "necklace":          ["Jewellery", "Necklace / Choker"],
    "earrings":          ["Jewellery"],
    "bracelet":          ["Jewellery", "Bangles / Kara"],
    "bangles":           ["Jewellery", "Bangles / Kara"],
    "ring":              ["Jewellery"],
    "heels":             ["Footwear", "Khussa / Kheri"],
    "sandals":           ["Footwear", "Khussa / Kheri"],
    "khussa shoes":      ["Footwear", "Khussa / Kheri"],
    "lehenga":           ["Lehenga / Sharara", "Gharara / Farshi", "Bridal Wear"],
    "sharara":           ["Lehenga / Sharara", "Gharara / Farshi"],
    "gharara":           ["Gharara / Farshi", "Lehenga / Sharara"],
    "anarkali dress":    ["Anarkali", "Shalwar Kameez"],
    "shalwar kameez":    ["Shalwar Kameez", "Kurta (Casual)"],
    "gown":              ["Gown", "Bridal Wear"],
    "saree":             ["Saree"],
    "dupatta":           ["Dupatta / Shawl", "Accessories"],
    "shawl":             ["Dupatta / Shawl", "Accessories"],
    "Pakistani dress":   ["Shalwar Kameez", "Lehenga / Sharara", "Anarkali"],
    "bridal dress":      ["Bridal Wear", "Lehenga / Sharara"],
    "embroidered dress": ["Shalwar Kameez", "Lehenga / Sharara", "Anarkali"],
}


def _detect_category_with_clip(image: Image.Image) -> list[str]:
    """Use CLIP zero-shot to detect what category the uploaded image belongs to.
    Returns only the single best matching category group to avoid cross-category noise.
    """
    try:
        model, preprocess = _load_clip()
        if model is None:
            return []

        labels = list(VISUAL_CATEGORY_MAP.keys())
        text_inputs = clip.tokenize(
            [f"a photo of a {label}" for label in labels]
        ).to(_clip_device)

        with torch.no_grad():
            img_tensor = preprocess(ImageOps.exif_transpose(image).convert("RGB")).unsqueeze(0).to(_clip_device)
            image_features = model.encode_image(img_tensor)
            text_features = model.encode_text(text_inputs)

            image_features = image_features / image_features.norm(dim=-1, keepdim=True)
            text_features = text_features / text_features.norm(dim=-1, keepdim=True)

            similarities = (image_features @ text_features.T).squeeze(0)
            probs = similarities.softmax(dim=-1).cpu().numpy()

        # Only use the single best match — avoids cross-category noise
        top_idx = int(np.argmax(probs))
        if probs[top_idx] < 0.15:
            return []

        label = labels[top_idx]
        print(f"[CLIP category] Best match: {label}: {probs[top_idx]:.2%}")
        return list(dict.fromkeys(VISUAL_CATEGORY_MAP.get(label, [])))

    except Exception as exc:
        print(f"[category detection] failed: {exc}")
        return []


def _category_fallback_search(categories: list[str], top_k: int = 4) -> list[dict]:
    """Return top listings from matching categories when visual similarity is too low."""
    if not categories:
        return []

    listings = list(listings_collection.find(
        {
            "status": "Live",
            "availabilityStatus": {"$ne": "Sold"},
            "category": {"$in": categories},
        },
        {
            "title": 1, "price": 1, "category": 1, "occasion": 1,
            "type": 1, "city": 1, "size": 1, "pricingModel": 1, "imageUrls": 1,
        }
    ).limit(top_k * 2))

    results = []
    for listing in listings:
        cat_score = 3 if listing.get("category") == categories[0] else 1
        results.append((cat_score, listing))

    results.sort(key=lambda x: x[0], reverse=True)

    return [
        {
            "id": str(l["_id"]),
            "_id": str(l["_id"]),
            "title": l.get("title", "Item"),
            "price": l.get("price", 0),
            "category": l.get("category", ""),
            "occasion": l.get("occasion", ""),
            "type": l.get("type", ""),
            "city": l.get("city", ""),
            "size": l.get("size", ""),
            "pricingModel": l.get("pricingModel", ""),
            "imageUrls": l.get("imageUrls", []),
            "similarity": 55,
            "matchType": "category",
        }
        for _, l in results[:top_k]
    ]


# ── Main search function ──────────────────────────────────────────────────────

def search_similar(query_embedding: np.ndarray, query_image: Image.Image = None, top_k: int = 4):
    uses_clip = len(query_embedding) == 512
    query_fingerprint = getattr(search_similar, "query_fingerprint", None)

    minimum_raw_score = 0.42 if uses_clip else 0.82
    minimum_display = 40

    listings = list(listings_collection.find(
        {"status": "Live", "availabilityStatus": {"$ne": "Sold"}},
        {
            "title": 1, "price": 1, "category": 1, "occasion": 1,
            "type": 1, "city": 1, "size": 1, "pricingModel": 1, "imageUrls": 1,
        },
    ))

    scored = []
    for listing in listings:
        best_score = 0.0
        for image_url in listing.get("imageUrls", []):
            embedding = _listing_embedding(image_url)
            fingerprint = _listing_fingerprint(image_url)
            if embedding is None and fingerprint is None:
                continue

            visual_score = _cosine(query_embedding, embedding) if embedding is not None else 0.0
            hash_score = _fingerprint_similarity(query_fingerprint, fingerprint) if query_fingerprint is not None else 0.0
            combined = max(
                hash_score,
                visual_score if uses_clip else (visual_score * 0.72) + (hash_score * 0.28)
            )
            best_score = max(best_score, combined)

        if best_score > 0:
            scored.append((best_score, listing))

    scored.sort(key=lambda item: item[0], reverse=True)

    # Build visual results
    visual_results = []
    for score, listing in scored[:top_k]:
        display = _display_score(score, uses_clip)
        if score < minimum_raw_score or display < minimum_display:
            continue
        visual_results.append({
            "id": str(listing["_id"]),
            "_id": str(listing["_id"]),
            "title": listing.get("title", "Item"),
            "price": listing.get("price", 0),
            "category": listing.get("category", ""),
            "occasion": listing.get("occasion", ""),
            "type": listing.get("type", ""),
            "city": listing.get("city", ""),
            "size": listing.get("size", ""),
            "pricingModel": listing.get("pricingModel", ""),
            "imageUrls": listing.get("imageUrls", []),
            "similarity": display,
            "matchType": "visual",
        })

    if visual_results:
        print(f"[search] Visual match found: {len(visual_results)} results")
        return visual_results

    # ── Fallback: category-based search using CLIP text understanding ─────────
    print("[search] No confident visual match — trying category fallback")
    if query_image is not None and uses_clip:
        categories = _detect_category_with_clip(query_image)
        if categories:
            print(f"[search] Detected categories: {categories}")
            fallback = _category_fallback_search(categories, top_k=top_k)
            if fallback:
                return fallback

    print("[search] No match found")
    return []