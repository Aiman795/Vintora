import torch
import numpy as np
from transformers import CLIPProcessor, CLIPModel
from pymongo import MongoClient

# Load CLIP model
print("Loading CLIP model... ⏳")
model = CLIPModel.from_pretrained("./clip-model")
processor = CLIPProcessor.from_pretrained("./clip-model")
model.eval()
print("CLIP model loaded ✅")

# Connect to MongoDB
client = MongoClient("mongodb://localhost:27017/")
db = client["vintora"]
products_collection = db["products"]
print("MongoDB connected ✅")

def get_text_embedding(text: str) -> list:
    """Generate CLIP embedding from text description"""
    inputs = processor(text=[text], return_tensors="pt", padding=True)
    with torch.no_grad():
        features = model.get_text_features(**inputs)
    # Handle both old and new transformers output format
    if hasattr(features, 'last_hidden_state'):
        embedding = features.last_hidden_state[0, 0].numpy()
    else:
        embedding = features.detach().numpy()[0]
    embedding = embedding / np.linalg.norm(embedding)
    return embedding.tolist()

def generate_all_embeddings():
    products = list(products_collection.find({}))
    print(f"\nFound {len(products)} products in MongoDB")
    print("Generating embeddings from product descriptions...\n")

    success = 0

    for i, product in enumerate(products):
        print(f"[{i+1}/{len(products)}] Processing: {product['title']}")

        # Combine title + category + description for richer embedding
        text = f"{product['title']} {product['category']} {product.get('description', '')}"
        embedding = get_text_embedding(text)

        # Save embedding to MongoDB
        products_collection.update_one(
            {"_id": product["_id"]},
            {"$set": {"embedding": embedding}}
        )
        print(f"  ✅ Embedding saved ({len(embedding)} dimensions)")
        success += 1

    print(f"\nDone! {success}/{len(products)} products updated ✅")
    client.close()

generate_all_embeddings()