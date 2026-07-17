# GrayNet – Research Dashboard & Inference Engine
**Official Web Application for the [GrayNet Architecture](https://github.com/csharikrishna/GreyNet)**

This repository contains the standalone, production-ready web application and inference backend for GrayNet—a highly parameter-efficient, grayscale-native convolutional neural network engineered for resource-constrained clinical deployment.

> **Note:** This repository is strictly for the frontend UI and the inference backend. For the primary PyTorch training code, model definitions, and experimental methodology, please visit the [Main GrayNet Repository](https://github.com/csharikrishna/GreyNet).

---

## 🏗️ Architecture Split

Because this application serves both a high-performance interactive user interface and heavy PyTorch model checkpoints, the repository is fundamentally split into two distinct decoupled services:

### 1. `frontend/` (Next.js)
The frontend is a strictly typed React application built heavily on **Next.js, Tailwind CSS, Framer Motion**, and **React Three Fiber**. It acts as an interactive academic manifesto and a visual dashboard for the Grad-CAM evaluation outputs.
* **Tech Stack:** Next.js (App Router), TypeScript, Tailwind, Recharts.
* **Execution:** Completely stateless. All telemetry metrics and parameters are mapped locally without requiring the Python inference backend.

### 2. `backend/` (FastAPI & PyTorch)
The backend is a high-performance Python REST API built to serve real-time predictions and Grad-CAM localized heatmaps from the actual trained GrayNet checkpoints.
* **Tech Stack:** FastAPI, PyTorch, Torchvision, Uvicorn.
* **Checkpoints:** Located in `backend/checkpoints/`, this includes all 10 scaling derivations of GrayNet (from the 813K-parameter Master model down to the 24K-parameter Femto micro-model).

---

## 🚀 Deployment Strategy

To successfully deploy this application, you must utilize a split-deployment infrastructure. Vercel is highly recommended for the frontend, while a heavier containerized service like Render is required for the backend.

### Deploying the Frontend (Vercel)
Vercel provides exceptional CDN edge caching for Next.js applications but struggles with heavy Python ML environments.
1. Connect this repository to your Vercel account.
2. In the Project Settings, under **Root Directory**, set it explicitly to `frontend`.
3. Vercel will automatically configure the build commands. 

### Deploying the Backend (Render)
Render (or AWS/Google Cloud) is required to host the ~1.5GB PyTorch footprint and load the 10 `.pt` model weights into active memory.
1. Connect this repository to Render and spin up a **Web Service**.
2. In the configuration, set the **Root Directory** to `backend`.
3. You may use the provided `backend/Dockerfile` to deploy a pristine environment, or allow Render to build natively using `backend/requirements.txt`.
4. Ensure your server instance has adequate RAM to load multiple lightweight PyTorch models (1GB+ RAM recommended).

---

## 💻 Local Development

If you wish to spin up both environments locally for development, you will need two separate terminal instances.

### Terminal 1: Spin up the inference backend
```bash
cd backend
pip install -r requirements.txt
python -m app.main
```
*(The backend will boot on `http://localhost:8000`)*

### Terminal 2: Spin up the frontend dashboard
```bash
cd frontend
npm install
npm run dev
```
*(The frontend will boot on `http://localhost:3000`)*

## 🔗 Citation & Core Research
If you utilize GrayNet in your academic research or clinical systems, please refer to the primary repository for citation guidelines and methodologies regarding the extraction of grayscale spatial metrics:
👉 **[GrayNet Core Repository](https://github.com/csharikrishna/GreyNet)**
