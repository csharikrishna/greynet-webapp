"""
GrayNet inference API.

Loads every checkpoint listed in model_registry.py at startup, dynamically
quantizes each to INT8 for fast CPU inference, and serves:

  GET  /health              liveness check + which models loaded successfully
  GET  /models               registry metadata (params, reported accuracy, etc.)
  POST /predict               run one or more models on a base64 image

Preprocessing matches GreyNet's training pipeline: grayscale, resize to
each model's configured input_size (256x256 for every published
checkpoint), normalize with mean=0.5, std=0.5 (see scripts/test_transforms.py
in the source repo).
"""

import base64
import io
import logging
import time
from typing import Optional

import torch
import torch.nn.functional as F
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from PIL import Image
import numpy as np
from pydantic import BaseModel
from torchvision import transforms

from .graynet.model import GrayNet
from .model_registry import CLASS_NAMES, MODEL_REGISTRY, ModelEntry
from .gradcam import GradCAM, overlay_cam, to_base64_image

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("graynet-api")

app = FastAPI(title="GrayNet Inference API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # tighten to your deployed frontend origin in production
    allow_methods=["*"],
    allow_headers=["*"],
)

from typing import Dict, List

LOADED_MODELS: Dict[str, torch.nn.Module] = {}
LOAD_ERRORS: Dict[str, str] = {}


def _extract_state_dict(checkpoint) -> dict:
    """Checkpoints in this project have been saved with a few different
    conventions across training runs. Try the common ones."""
    if isinstance(checkpoint, dict):
        for key in ("model_state_dict", "state_dict", "model", "ema_state_dict"):
            if key in checkpoint and isinstance(checkpoint[key], dict):
                return checkpoint[key]
        # Looks like it's already a raw state_dict
        if all(isinstance(v, torch.Tensor) for v in checkpoint.values()):
            return checkpoint
    raise ValueError("Unrecognized checkpoint format — could not find a state_dict")


def _build_model(entry: ModelEntry) -> torch.nn.Module:
    model = GrayNet(
        in_channels=1,
        num_classes=entry.num_classes,
        width_mult=entry.width_mult,
        noise_mode=entry.noise_mode,
        dropout=entry.dropout,
        input_size=entry.input_size,
    )

    if not entry.checkpoint_path.exists():
        raise FileNotFoundError(
            f"Checkpoint not found at {entry.checkpoint_path}. Copy it in from "
            f"your GreyNet runs/ directory (see backend/README.md)."
        )

    checkpoint = torch.load(entry.checkpoint_path, map_location="cpu", weights_only=False)
    state_dict = _extract_state_dict(checkpoint)
    missing, unexpected = model.load_state_dict(state_dict, strict=False)
    if missing:
        logger.warning("%s: missing keys %s", entry.id, missing)
    if unexpected:
        logger.warning("%s: unexpected keys %s", entry.id, unexpected)

    model.eval()

    if entry.quantized:
        model = torch.quantization.quantize_dynamic(
            model, {torch.nn.Linear}, dtype=torch.qint8
        )

    return model


@app.on_event("startup")
def load_all_models():
    for model_id, entry in MODEL_REGISTRY.items():
        try:
            LOADED_MODELS[model_id] = _build_model(entry)
            logger.info("Loaded %s", model_id)
        except Exception as exc:  # noqa: BLE001 — we want to keep serving other models
            LOAD_ERRORS[model_id] = str(exc)
            logger.error("Failed to load %s: %s", model_id, exc)


class InstanceNormalize:
    def __init__(self, eps=1e-6):
        self.eps = eps

    def __call__(self, tensor):
        mean = tensor.mean()
        std = tensor.std() + self.eps
        return (tensor - mean) / std

def _preprocess(image: Image.Image, input_size: int) -> torch.Tensor:
    tfm = transforms.Compose(
        [
            transforms.Grayscale(num_output_channels=1),
            transforms.Resize(input_size),
            transforms.CenterCrop(input_size),
            transforms.ToTensor(),
            InstanceNormalize(),
        ]
    )
    return tfm(image).unsqueeze(0)  # (1, 1, H, W)


class PredictRequest(BaseModel):
    model_ids: List[str]
    image: str  # data URL or raw base64


class PredictResult(BaseModel):
    modelId: str
    label: str
    confidence: float
    latencyMs: float
    classProbs: Dict[str, float]
    gradcamBase64: Optional[str] = None


class PredictResponse(BaseModel):
    mode: str = "live"
    results: List[PredictResult]


@app.get("/health")
def health():
    return {
        "status": "ok",
        "loaded": sorted(LOADED_MODELS.keys()),
        "failed": LOAD_ERRORS,
    }


@app.get("/models")
def list_models():
    return {
        "models": [
            {
                "id": e.id,
                "name": e.name,
                "widthMult": e.width_mult,
                "reportedParamsK": e.reported_params_k,
                "reportedStdAcc": e.reported_std_acc,
                "loaded": e.id in LOADED_MODELS,
            }
            for e in MODEL_REGISTRY.values()
        ]
    }


def _decode_image(data_url: str) -> Image.Image:
    if "," in data_url and data_url.strip().startswith("data:"):
        data_url = data_url.split(",", 1)[1]
    try:
        raw = base64.b64decode(data_url)
        return Image.open(io.BytesIO(raw)).convert("L")
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Could not decode image: {exc}")


@app.post("/predict", response_model=PredictResponse)
def predict(req: PredictRequest):
    unknown = [m for m in req.model_ids if m not in MODEL_REGISTRY]
    if unknown:
        raise HTTPException(status_code=400, detail=f"Unknown model ids: {unknown}")

    image = _decode_image(req.image)
    results: List[PredictResult] = []

    for model_id in req.model_ids:
        entry = MODEL_REGISTRY[model_id]
        model = LOADED_MODELS.get(model_id)
        if model is None:
            raise HTTPException(
                status_code=503,
                detail=f"Model '{model_id}' failed to load: "
                f"{LOAD_ERRORS.get(model_id, 'unknown error')}",
            )

        tensor = _preprocess(image, entry.input_size)

        start = time.perf_counter()
        
        gradcam_b64 = None
        try:
            target_layer = getattr(model, 'msdc_c', None)
            if target_layer is None:
                target_layer = list(model.children())[-2] if len(list(model.children())) > 1 else list(model.children())[-1]
                
            gcam = GradCAM(model, target_layer)
            try:
                cam_map, top_idx, probs = gcam(tensor)
                if np.max(cam_map) > 0: # Ensure valid CAM was generated
                    blended = overlay_cam(tensor, cam_map)
                    gradcam_b64 = to_base64_image(blended)
            finally:
                gcam.remove_hooks()
        except Exception as e:
            logger.warning(f"GradCAM failed for {model_id}: {e}")
            # Ensure we still get the prediction without GradCAM
            with torch.no_grad():
                logits = model(tensor)
                probs = F.softmax(logits, dim=1).squeeze(0)
            top_idx = int(torch.argmax(probs).item())

        latency_ms = (time.perf_counter() - start) * 1000

        class_probs = {CLASS_NAMES[i]: float(probs[i]) for i in range(len(CLASS_NAMES))}

        results.append(
            PredictResult(
                modelId=model_id,
                label=CLASS_NAMES[top_idx],
                confidence=float(probs[top_idx]),
                latencyMs=latency_ms,
                classProbs=class_probs,
                gradcamBase64=gradcam_b64,
            )
        )

    return PredictResponse(mode="live", results=results)
