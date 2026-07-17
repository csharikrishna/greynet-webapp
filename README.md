# GrayNet — website

A production-shaped site for the [GreyNet](https://github.com/csharikrishna/GreyNet)
brain tumor MRI classifier: an informative landing page explaining the
architecture end-to-end, and a "lab" page to run any of the 10 trained
checkpoints on a real MRI slice.

```
web-app/
  frontend/   Next.js 14 site — landing page + lab, deployable standalone
  backend/    FastAPI inference service — needed only for real (non-demo) predictions
```

## Why two folders

GrayNet's Frequency Attention Module uses `torch.fft.rfft2`, which the
standard ONNX opset can't trace. That rules out running inference
client-side in the browser, so predictions need a real PyTorch process —
hence a separate backend. The frontend works fully on its own in **demo
mode** (clearly labeled simulated results) and upgrades automatically to
real predictions once you deploy the backend and point `INFERENCE_API_URL`
at it.

## Quickest path to see it running

```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:3000` — landing page, architecture walkthrough, and
`/lab` in demo mode, no backend required.

## Getting real predictions

```bash
cd backend
python scripts/prepare_checkpoints.py /path/to/your/GreyNet/clone
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

Then in `frontend/.env.local`:

```
INFERENCE_API_URL=http://localhost:8000
```

Restart `npm run dev`. See `backend/README.md` for the one checkpoint
(`no_kd_cleaned_25k`) that isn't currently saved anywhere in the source
repo, and `frontend/README.md` for deployment options.

## What's accurate here vs. what needs your input

Everything about the architecture, the benchmark numbers, and the data
leakage findings was pulled directly from the GreyNet source (`graynet/*.py`,
`configs/*.yaml`, `leakage/Data_Leakage_Report.md`) — not invented for the
site. Two things genuinely need your input before this is fully live:

1. **Checkpoint files** — not included here; run the prep script against
   your training repo.
2. **Checkpoint format** — `backend/app/main.py` guesses at common
   `state_dict` save conventions; confirm it matches how you actually
   saved your `.pt` files, and adjust `_extract_state_dict` if not.

## Deployment summary

| Piece | Where | Cost shape |
|---|---|---|
| Frontend | Vercel | Free tier is enough |
| Backend | Railway / Fly.io / Render | Small CPU-only container, always-on |

See each folder's README for step-by-step instructions.
