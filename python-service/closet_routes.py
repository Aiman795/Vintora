from fastapi import APIRouter, File, UploadFile, HTTPException
from PIL import Image
import io
import torch
import numpy as np
import os

router = APIRouter()

# ── Reuse CLIP from your existing embeddings.py ───────────────────────────────
from embeddings import get_image_embedding

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