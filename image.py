from transformers import AutoImageProcessor, AutoModelForImageClassification
from PIL import Image
import torch

# 🖼️ Path to your image
image_path = "image.png"  # change to your image path
image = Image.open(image_path)

# 🧠 Load model and processor
model_name = "google/vit-base-patch16-224"
processor = AutoImageProcessor.from_pretrained(model_name)
model = AutoModelForImageClassification.from_pretrained(model_name)

# ⚙️ Preprocess
inputs = processor(images=image, return_tensors="pt")

# 🔍 Predict
with torch.no_grad():
    logits = model(**inputs).logits

# 📊 Get label
predicted_class_idx = logits.argmax(-1).item()
label = model.config.id2label[predicted_class_idx]

print(f"Prediction: {label}")
