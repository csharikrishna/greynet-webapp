# GrayNet inference backend

FastAPI service that loads all 10 GrayNet checkpoints and serves real
predictions. This exists because GrayNet's Frequency Attention Module uses
`torch.fft.rfft2`, which the standard ONNX opset doesn't trace — so
inference has to run on real PyTorch, not client-side ONNX.

## 1. Get the checkpoints in place

This repo does not include the trained `.pt` weight files. From a local
clone of the GreyNet training repo (the one with `runs/`):

```bash
python scripts/prepare_checkpoints.py /path/to/GreyNet
```

This copies the 10 representative checkpoints (fold 1 for non-KD runs,
the combined `best_student.pt` for KD runs) into `checkpoints/`, matching
the paths `app/model_registry.py` expects.

**Known gap:** as of this writing, `runs/no_kd_cleaned_25k/` in the source
repo only contains a `combined_classification_report.txt` — no saved
`best_model.pt`. The script will report this as missing. Either re-run
that training config to produce a checkpoint, point `femto-nokd` in
`model_registry.py` at a different fold, or drop that one model from the
registry — the other 9 will still load and serve fine.

If your own `runs/` folder uses different run names or fold numbers,
edit `MAPPING` in `scripts/prepare_checkpoints.py` and the `checkpoint_path`
values in `app/model_registry.py` to match.

## 2. Run locally

```bash
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

Check `http://localhost:8000/health` — it lists which models loaded and
which failed (with the reason), so you can tell immediately if a
checkpoint path or format is wrong rather than guessing from a stack trace
during a request.

## 3. Checkpoint format

`app/main.py` tries a few common conventions when loading each `.pt` file
(`model_state_dict`, `state_dict`, `model`, or a raw state_dict). If your
checkpoints were saved a different way, adjust `_extract_state_dict` in
`app/main.py`.

## 4. Quantization

Every model is dynamically quantized (`torch.quantization.quantize_dynamic`,
INT8 on Linear layers) at load time — this is the approach you already
settled on after the ONNX/FFT export limitation, applied uniformly across
all 10 checkpoints. Set `quantized=False` on a `ModelEntry` in
`model_registry.py` to disable it for a specific model if you want to
A/B the accuracy difference.

## 5. Deploying

CPU-only hosting is enough — GrayNet's own benchmarks show 15-40ms CPU
inference per image even at the largest (813K param) size. Options that
fit a small always-on container without needing a GPU:

- **Railway** — connect the repo, point it at `backend/`, it picks up the
  Dockerfile automatically.
- **Fly.io** — `fly launch` from this directory, then `fly deploy`.
- **Render** — new Web Service, Docker runtime, root directory `backend/`.

Whichever you use, set the frontend's `INFERENCE_API_URL` environment
variable to this service's public URL once it's deployed (see
`../frontend/.env.example`).

## 6. API

- `GET /health` — liveness + per-model load status
- `GET /models` — registry metadata
- `POST /predict` — body `{ "model_ids": ["pico-kd", "master-v2"], "image": "data:image/png;base64,..." }`
