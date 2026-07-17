import { NextRequest, NextResponse } from "next/server";
import { CLASS_NAMES, MODELS } from "@/lib/models-data";

export const runtime = "nodejs";

type PredictRequestBody = {
  modelIds: string[];
  image: string; // data URL
};

// Simple seeded PRNG so demo-mode results are stable for a given
// (modelId, image) pair rather than re-randomizing on every render.
function seededRandom(seed: number) {
  let x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return hash;
}

function demoResultFor(modelId: string, imageSeed: number) {
  const model = MODELS.find((m) => m.id === modelId);
  const baseSeed = imageSeed + hashString(modelId);
  const rawScores = CLASS_NAMES.map((_, i) => seededRandom(baseSeed + i * 17.3));
  const winnerIdx = Math.floor(seededRandom(baseSeed) * CLASS_NAMES.length);
  rawScores[winnerIdx] += 1.4; // bias one class to look like a real confident prediction
  const total = rawScores.reduce((a, b) => a + b, 0);
  const probs = rawScores.map((s) => s / total);

  const classProbs: Record<string, number> = {};
  CLASS_NAMES.forEach((c, i) => (classProbs[c] = probs[i]));

  const latency = model ? model.cpu1t * (0.85 + seededRandom(baseSeed + 3) * 0.3) : 25;

  return {
    modelId,
    label: CLASS_NAMES[winnerIdx],
    confidence: probs[winnerIdx],
    latencyMs: latency,
    classProbs,
  };
}

export async function POST(req: NextRequest) {
  let body: PredictRequestBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { modelIds, image } = body;
  if (!modelIds?.length || !image) {
    return NextResponse.json(
      { error: "modelIds and image are required" },
      { status: 400 }
    );
  }

  const backendUrl = process.env.INFERENCE_API_URL;

  if (backendUrl) {
    try {
      const upstream = await fetch(`${backendUrl.replace(/\/$/, "")}/predict`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model_ids: modelIds, image }),
        signal: AbortSignal.timeout(30_000),
      });
      if (!upstream.ok) {
        throw new Error(`Backend responded ${upstream.status}`);
      }
      const data = await upstream.json();
      return NextResponse.json({ mode: "live", results: data.results });
    } catch (err) {
      // Fall through to demo mode but surface that the backend failed,
      // rather than silently pretending it's live.
      return NextResponse.json(
        {
          mode: "demo",
          results: modelIds.map((id) => demoResultFor(id, hashString(image.slice(0, 64)))),
          backendError:
            err instanceof Error ? err.message : "Backend request failed",
        },
        { status: 200 }
      );
    }
  }

  const imageSeed = hashString(image.slice(0, 64));
  const results = modelIds.map((id) => demoResultFor(id, imageSeed));
  return NextResponse.json({ mode: "demo", results });
}
