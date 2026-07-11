from fastapi import APIRouter, File, UploadFile, HTTPException
from PIL import Image
import io
import torch
import numpy as np
import os

router = APIRouter()

# ── Reuse CLIP from your existing embeddings.py ───────────────────────────────
from embeddings import get_image_embedding, _load_clip, _clip_device

CATEGORY_LABELS = {
    "shalwar kameez": "shalwar_kameez",
    "kurta": "kurta",
    "lehenga": "lehenga_sharara",
    "sharara": "lehenga_sharara",
    "gharara": "gharara_farshi",
    "anarkali": "anarkali",
    "gown": "gown",
    "saree": "saree",
    "sherwani": "sherwani",
    "dupatta": "dupatta_shawl",
    "shawl": "dupatta_shawl",
    "necklace": "necklace_choker",
    "jewellery": "jewellery",
    "bangles": "bangles_kara",
    "khussa": "khussa_kheri",
    "footwear": "footwear",
    "heels": "footwear",
    "bag": "bags_clutches",
    "clutch": "bags_clutches",
}

COLOR_PALETTE = {
    "black": (20, 20, 20),
    "white": (245, 245, 238),
    "ivory": (238, 226, 205),
    "gold": (204, 158, 55),
    "red": (170, 35, 45),
    "maroon": (105, 20, 35),
    "pink": (220, 110, 150),
    "orange": (220, 120, 35),
    "yellow": (220, 190, 55),
    "green": (55, 130, 80),
    "blue": (55, 100, 170),
    "purple": (115, 75, 150),
    "brown": (120, 75, 45),
    "silver": (170, 170, 165),
}


def nearest_color(rgb):
    r, g, b = rgb
    return min(
        COLOR_PALETTE,
        key=lambda name: (r - COLOR_PALETTE[name][0]) ** 2 + (g - COLOR_PALETTE[name][1]) ** 2 + (b - COLOR_PALETTE[name][2]) ** 2,
    )


def dominant_colors(img: Image.Image):
    small = img.resize((80, 80)).convert("RGB")
    pixels = np.array(small).reshape(-1, 3)
    # Drop very light backgrounds so garment colour is more likely to win.
    pixels = pixels[np.mean(pixels, axis=1) < 238]
    if len(pixels) == 0:
        pixels = np.array(small).reshape(-1, 3)
    quantized = (pixels // 32) * 32
    colors, counts = np.unique(quantized, axis=0, return_counts=True)
    top = colors[np.argsort(counts)[-3:]][::-1]
    names = []
    for color in top:
        name = nearest_color(tuple(int(v) for v in color))
        if name not in names:
            names.append(name)
    return names or ["unknown"]


def detect_category(img: Image.Image):
    try:
        model, preprocess = _load_clip()
        if model is None:
            return "other", 0.0

        labels = list(CATEGORY_LABELS.keys())
        prompts = [f"a photo of a Pakistani fashion {label}" for label in labels]
        import clip
        text_inputs = clip.tokenize(prompts).to(_clip_device)

        with torch.no_grad():
            image_input = preprocess(img).unsqueeze(0).to(_clip_device)
            image_features = model.encode_image(image_input)
            text_features = model.encode_text(text_inputs)
            image_features = image_features / image_features.norm(dim=-1, keepdim=True)
            text_features = text_features / text_features.norm(dim=-1, keepdim=True)
            scores = (image_features @ text_features.T).softmax(dim=-1).cpu().numpy()[0]

        best_idx = int(np.argmax(scores))
        if float(scores[best_idx]) < 0.12:
            return "other", float(scores[best_idx])
        return CATEGORY_LABELS[labels[best_idx]], float(scores[best_idx])
    except Exception:
        return "other", 0.0

# ── POST /closet/embed ────────────────────────────────────────────────────────
@router.post("/embed")
async def embed_image(image: UploadFile = File(...)):
    """
    Receives an image, returns its 512-dim CLIP embedding.
    Called by the Node backend when user uploads a closet item.
    """
    try:
        contents = await image.read()
        img = Image.open(io.BytesIO(contents)).convert("RGB")
        embedding = get_image_embedding(img)

        # get_image_embedding may return a numpy array or list - normalise to list
        if hasattr(embedding, "tolist"):
            embedding = embedding.tolist()
        if isinstance(embedding, list) and isinstance(embedding[0], list):
            embedding = embedding[0]  # unwrap nested list if needed

        return {"embedding": embedding}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/analyze")
async def analyze_image(image: UploadFile = File(...)):
    try:
        contents = await image.read()
        img = Image.open(io.BytesIO(contents)).convert("RGB")
        category, confidence = detect_category(img)
        colors = dominant_colors(img)
        tags = [category, *colors]
        return {
            "category": category,
            "confidence": round(confidence, 3),
            "dominantColor": colors[0],
            "colors": colors,
            "tags": [tag for tag in tags if tag and tag != "unknown"],
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ── POST /closet/similarity ───────────────────────────────────────────────────
@router.post("/similarity")
async def compute_similarity(data: dict):
    """
    Compares two embeddings. Returns cosine similarity score 0.0 - 1.0
    Body: { "embedding1": [...], "embedding2": [...] }
    """
    try:
        e1 = np.array(data["embedding1"])
        e2 = np.array(data["embedding2"])
        score = float(np.dot(e1, e2) / (np.linalg.norm(e1) * np.linalg.norm(e2)))
        return {"score": round(score, 4)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
