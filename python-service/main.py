from fastapi import FastAPI, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
from embeddings import get_image_embedding, get_image_fingerprint, search_similar
from PIL import Image
import io
import os
from dotenv import load_dotenv

load_dotenv()

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def root():
    return {"message": "Vintora Python AI service is running"}

@app.post("/search")
async def visual_search(image: UploadFile = File(...)):
    try:
        contents = await image.read()
        img = Image.open(io.BytesIO(contents)).convert("RGB")
        query_embedding = get_image_embedding(img)
        search_similar.query_fingerprint = get_image_fingerprint(img)
        # Pass image so category fallback can use CLIP text matching
        results = search_similar(query_embedding, query_image=img, top_k=4)
        return {"success": True, "results": results}
    except Exception as e:
        return {"success": False, "error": str(e), "results": []}


def include_optional_router(module_name: str, router_name: str, prefix: str):
    try:
        module = __import__(module_name, fromlist=[router_name])
        app.include_router(getattr(module, router_name), prefix=prefix)
    except Exception as exc:
        reason = str(exc)

        @app.get(f"{prefix}/status")
        def optional_router_status():
            return {"available": False, "reason": reason}


include_optional_router("closet_routes", "router", "/closet")
include_optional_router("fashion_buddy_routes", "router", "/buddy")

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)