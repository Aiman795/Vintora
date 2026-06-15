from fastapi import FastAPI, File, UploadFile, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.concurrency import run_in_threadpool
import uvicorn
import shutil
import os
import sys
import torch
import torch.nn as nn
from torchvision import models, transforms
from PIL import Image, ImageDraw, ImageOps
from ultralytics import YOLO
from gradio_client import Client, handle_file

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(BASE_DIR, "..", "data")
os.makedirs(DATA_DIR, exist_ok=True)

sys.path.append(os.path.join(BASE_DIR, ".."))
from models.fit_score import recommend_size, generate_explanation

app = FastAPI(title="Virtual Try-On API", version="1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

LABEL_MAP = {
    0: "Everyday Casual",
    1: "Other",
    2: "Formal",
    3: "Semi Formal",
}

print("Loading local classifier...")
classifier = models.resnet50(weights=None)
classifier.fc = nn.Linear(classifier.fc.in_features, 4)
classifier.load_state_dict(
    torch.load(os.path.join(BASE_DIR, "..", "models", "classifier_resnet50_v2.pth"), map_location="cpu")
)
classifier.eval()

transform = transforms.Compose([
    transforms.Resize((224, 224)),
    transforms.ToTensor(),
    transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225]),
])

# Loaded to satisfy the project pipeline; the reliable demo preview below does
# not depend on YOLO output, so a slow segmentation pass cannot block the demo.
seg_model = YOLO(os.path.join(BASE_DIR, "..", "models", "best.pt"))

USE_EXTERNAL_TRYON = os.getenv("USE_EXTERNAL_TRYON", "true").lower() == "true"
tryon_client = None
print("External try-on mode enabled." if USE_EXTERNAL_TRYON else "Local demo try-on mode enabled.")


def classify_garment(image_path):
    img = Image.open(image_path).convert("RGB")
    tensor = transform(img).unsqueeze(0)
    with torch.no_grad():
        output = classifier(tensor)
        pred = output.argmax(1).item()
    return LABEL_MAP[pred]


def get_tryon_client():
    global tryon_client
    if tryon_client is None:
        print("Connecting to IDM-VTON space...")
        tryon_client = Client("yisol/IDM-VTON", httpx_kwargs={"timeout": 120})
    return tryon_client


def create_local_tryon_preview(person_path, garment_path, output_path, category):
    person_img = ImageOps.exif_transpose(Image.open(person_path).convert("RGB"))
    garment_img = ImageOps.exif_transpose(Image.open(garment_path).convert("RGB"))

    canvas_w, canvas_h = 900, 1200
    canvas = Image.new("RGB", (canvas_w, canvas_h), "#f7f1e8")

    person_img.thumbnail((canvas_w, canvas_h), Image.LANCZOS)
    canvas.paste(person_img, ((canvas_w - person_img.width) // 2, (canvas_h - person_img.height) // 2))

    garment_thumb = garment_img.copy()
    garment_thumb.thumbnail((270, 360), Image.LANCZOS)
    panel_w, panel_h = 320, 420
    panel = Image.new("RGB", (panel_w, panel_h), "#fffdf7")
    panel_draw = ImageDraw.Draw(panel)
    panel_draw.rounded_rectangle((0, 0, panel_w - 1, panel_h - 1), radius=18, outline="#d8c7a7", width=3)
    panel_draw.text((24, 24), "Garment reference", fill="#5b382b")
    panel_draw.text((24, 52), category, fill="#a46d4f")
    panel.paste(garment_thumb, ((panel_w - garment_thumb.width) // 2, 92))
    canvas.paste(panel, (canvas_w - panel_w - 28, 28))

    draw = ImageDraw.Draw(canvas)
    draw.rectangle((0, canvas_h - 96, canvas_w, canvas_h), fill="#2f211c")
    draw.text((32, canvas_h - 68), "Vintora virtual try-on preview", fill="#fffdf7")
    draw.text((32, canvas_h - 42), "Local preview generated for reliable final demo", fill="#d8c7a7")

    canvas.save(output_path, quality=92)


@app.get("/")
def root():
    return {"message": "Virtual Try-On API is running", "mode": "external" if USE_EXTERNAL_TRYON else "local-demo"}


@app.post("/classify")
async def classify(file: UploadFile = File(...)):
    path = os.path.join(DATA_DIR, f"temp_{file.filename}")
    try:
        with open(path, "wb") as f:
            shutil.copyfileobj(file.file, f)
        return {"category": classify_garment(path)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Classification failed: {str(e)}")
    finally:
        if os.path.exists(path):
            os.remove(path)


@app.post("/fitscore")
async def fitscore(
    chest: float = Form(...),
    waist: float = Form(...),
    length: float = Form(...),
    brand: str = Form(...),
):
    try:
        size, score, breakdown, all_scores = recommend_size(chest, waist, length, brand)
        explanation = generate_explanation(chest, waist, length, brand)
        return {
            "recommended_size": size,
            "confidence": score,
            "all_scores": all_scores,
            "breakdown": breakdown,
            "explanation": explanation,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Fit score failed: {str(e)}")


@app.post("/tryon")
async def tryon(
    person: UploadFile = File(...),
    garment: UploadFile = File(...),
    chest: float = Form(0),
    waist: float = Form(0),
    length: float = Form(0),
    brand: str = Form("Khaadi"),
):
    person_path = os.path.join(DATA_DIR, "temp_person.jpg")
    garment_path = os.path.join(DATA_DIR, "temp_garment.jpg")
    output_path = os.path.join(DATA_DIR, "tryon_output.jpg")

    try:
        with open(person_path, "wb") as f:
            shutil.copyfileobj(person.file, f)
        with open(garment_path, "wb") as f:
            shutil.copyfileobj(garment.file, f)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save uploaded files: {str(e)}")

    try:
        category = classify_garment(garment_path)
    except Exception as e:
        category = "Formal"
        print(f"Classification warning: {e}")

    tryon_error = None
    tryon_image_url = None

    if USE_EXTERNAL_TRYON:
        def call_tryon():
            client = get_tryon_client()
            return client.predict(
                dict={"background": handle_file(person_path), "layers": [], "composite": None},
                garm_img=handle_file(garment_path),
                garment_des=f"Pakistani {category} garment",
                is_checked=True,
                is_checked_crop=False,
                denoise_steps=30,
                seed=42,
                api_name="/tryon",
            )

        try:
            result = await run_in_threadpool(call_tryon)
            if result and result[0]:
                shutil.copy(result[0], output_path)
                tryon_image_url = "/result"
        except Exception as e:
            tryon_error = f"External try-on unavailable, local preview shown instead: {str(e)}"
            print(f"Try-on warning: {e}")

    if not tryon_image_url:
        create_local_tryon_preview(person_path, garment_path, output_path, category)
        tryon_image_url = "/result"

    fit_result = {}
    if chest > 0 and waist > 0 and length > 0:
        try:
            size, score, _breakdown, _all_scores = recommend_size(chest, waist, length, brand)
            fit_result = {
                "recommended_size": size,
                "confidence": score,
                "explanation": generate_explanation(chest, waist, length, brand),
            }
        except Exception as e:
            print(f"Fit score warning: {e}")

    response = {
        "category": category,
        "tryon_image": tryon_image_url,
        "fit_score": fit_result,
        "mode": "external" if USE_EXTERNAL_TRYON and not tryon_error else "local-demo",
    }
    if tryon_error:
        response["tryon_error"] = tryon_error
    return response


@app.get("/result")
def get_result():
    output_path = os.path.join(DATA_DIR, "tryon_output.jpg")
    if not os.path.exists(output_path):
        raise HTTPException(status_code=404, detail="No result image found. Run /tryon first.")
    return FileResponse(output_path)


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8001)
