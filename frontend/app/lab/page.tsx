"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Nav from "@/components/Nav";
import { MODELS, ModelStat } from "@/lib/models-data";
import ScatterSelector from "@/components/ScatterSelector";
import MagneticButton from "@/components/MagneticButton";
import { Upload, Activity, Cpu, Zap, Beaker, BrainCircuit } from "lucide-react";

type PredictResult = {
  modelId: string;
  label: string;
  confidence: number;
  latencyMs: number;
  classProbs: Record<string, number>;
  gradcamBase64?: string;
};

type ApiResponse = {
  mode: "live" | "demo";
  results: PredictResult[];
};

export default function LabPage() {
  const [selected, setSelected] = useState<string[]>([MODELS[0].id]); // Master baseline default
  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<ApiResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showGradCam, setShowGradCam] = useState(true);

  const toggleModel = (id: string) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id]
    );
  };

  const handleFile = useCallback((file: File) => {
    if (!file.type.startsWith("image/")) {
      setError("Please upload an image file (PNG or JPG MRI slice).");
      return;
    }
    setError(null);
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = () => setImageDataUrl(reader.result as string);
    reader.readAsDataURL(file);
    // Clear previous results on new image upload
    setResponse(null);
  }, []);

  const onDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      const file = e.dataTransfer.files?.[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const runInference = async () => {
    if (!imageDataUrl) {
      setError("Upload an MRI slice first.");
      return;
    }
    if (selected.length === 0) {
      setError("Select at least one model.");
      return;
    }
    setLoading(true);
    setError(null);
    setResponse(null);
    try {
      const res = await fetch("/api/predict", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model_ids: selected, image: imageDataUrl }),
      });
      if (!res.ok) throw new Error(`Request failed (${res.status})`);
      const data: ApiResponse = await res.json();
      setResponse(data);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Something went wrong running inference."
      );
    } finally {
      setLoading(false);
    }
  };

  const modelsById = useMemo(
    () => Object.fromEntries(MODELS.map((m) => [m.id, m])) as Record<string, ModelStat>,
    []
  );

  return (
    <main className="h-screen max-h-screen overflow-hidden bg-[#060809] flex flex-col text-paper selection:bg-signal selection:text-ink">
      <div className="absolute inset-0 bg-radial-fade opacity-30 pointer-events-none z-0" />
      <Nav />

      {/* Compact Application Header */}
      <div className="flex-none px-6 pt-24 pb-4 border-b border-white/5 flex items-center justify-between z-10 bg-[#060809]/80 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <Beaker className="w-5 h-5 text-signal" />
          <h1 className="font-display text-xl text-paper tracking-tight drop-shadow-md">
            Inference & Explainability Lab
          </h1>
        </div>
        <p className="hidden md:block text-dim font-body text-sm">Visualize activations, confidence distributions, and latency.</p>
      </div>

      <div className="flex-1 min-h-[0px] w-full max-w-[1800px] mx-auto p-4 lg:p-6 grid lg:grid-cols-[400px_1fr] gap-6 lg:gap-8 overflow-hidden z-10">
        {/* Left Column: Controls */}
        <div className="flex flex-col gap-8 overflow-y-auto custom-scrollbar overflow-x-hidden pr-2 pb-6">

          {/* Upload Section */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="rounded-2xl border border-white/5 bg-panel/40 backdrop-blur-xl p-6 shadow-2xl"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-mono text-sm tracking-wide text-paper flex items-center gap-2">
                <Upload className="w-4 h-4 text-dim" /> Data Source
              </h3>
            </div>

            <div
              onDrop={onDrop}
              onDragOver={(e) => e.preventDefault()}
              onClick={() => fileInputRef.current?.click()}
              className="group relative h-48 rounded-xl border border-dashed border-white/10 bg-black/20 flex flex-col items-center justify-center cursor-pointer overflow-hidden transition-all hover:border-signal/50 hover:bg-signal/5"
            >
              {imageDataUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={imageDataUrl}
                  alt="MRI slice"
                  className="max-h-full max-w-full object-contain z-10 transition-transform duration-500 group-hover:scale-105"
                />
              ) : (
                <div className="text-center z-10 flex flex-col items-center">
                  <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                    <Upload className="w-4 h-4 text-dim group-hover:text-signal transition-colors" />
                  </div>
                  <p className="font-mono text-xs text-dim group-hover:text-paper transition-colors">
                    Drag & Drop MRI Slice<br />or Click to Browse
                  </p>
                </div>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFile(file);
              }}
            />
            {fileName && (
              <p className="mt-3 font-mono text-[11px] text-dim truncate flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-signal" /> {fileName}
              </p>
            )}
          </motion.div>

          {/* Model Selection */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <div className="flex items-center justify-between mb-4 px-2">
              <h3 className="font-mono text-sm tracking-wide text-paper flex items-center gap-2 group">
                <Cpu className="w-4 h-4 text-dim transition-transform duration-700 group-hover:rotate-180" /> Architecture Scale
              </h3>
            </div>
            <ScatterSelector
              models={MODELS}
              selected={selected}
              onToggle={toggleModel}
            />
          </motion.div>

          {/* Run Action */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            <MagneticButton
              onClick={runInference}
              disabled={loading}
              className={`w-full py-4 rounded-xl font-mono text-sm uppercase tracking-widest transition-all overflow-hidden relative ${loading
                ? "bg-line text-dim cursor-wait"
                : "bg-signal text-ink hover:shadow-[0_0_40px_-5px_rgba(62,217,196,0.6)] active:scale-[0.98] before:absolute before:inset-0 before:-translate-x-full before:animate-[shimmer_2s_infinite] before:bg-gradient-to-r before:from-transparent before:via-white/30 before:to-transparent"
                }`}
            >
              <div className="flex items-center justify-center gap-2">
                {loading ? (
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                  >
                    <Activity className="w-4 h-4" />
                  </motion.div>
                ) : (
                  <Zap className="w-4 h-4" />
                )}
                {loading ? "Computing..." : "Execute Pipeline"}
              </div>
            </MagneticButton>

            {error && (
              <motion.p
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                className="mt-4 font-mono text-xs text-alert border border-alert/30 bg-alert/10 rounded-lg px-4 py-3"
              >
                {error}
              </motion.p>
            )}
          </motion.div>
        </div>

        {/* Right Column: XAI Dashboard Container */}
        <div className="h-full flex flex-col bg-panel/10 rounded-2xl border border-white/5 overflow-hidden relative">
          <AnimatePresence mode="wait">
            {!response && !loading && (
              <motion.div
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex-1 flex flex-col items-center justify-center text-dim min-h-[500px]"
              >
                <BrainCircuit className="w-16 h-16 opacity-20 mb-4" />
                <p className="font-mono text-sm tracking-widest uppercase">Waiting for telemetry</p>
              </motion.div>
            )}

            {loading && (
              <motion.div
                key="loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex-1 flex flex-col items-center justify-center bg-signal/5 min-h-[500px]"
              >
                <div className="flex gap-2 items-end h-8">
                  {[0, 1, 2, 3, 4].map((i) => (
                    <motion.div
                      key={i}
                      className="w-1.5 bg-signal rounded-full"
                      animate={{ height: ["20%", "100%", "20%"] }}
                      transition={{
                        repeat: Infinity,
                        duration: 1,
                        delay: i * 0.1,
                      }}
                    />
                  ))}
                </div>
                <p className="mt-6 font-mono text-xs text-signal tracking-widest uppercase">
                  Processing Tensors...
                </p>
              </motion.div>
            )}

            {response && (
              <motion.div
                key="results"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-6"
              >
                {/* XAI Controls */}
                <div className="flex items-center justify-between border-b border-white/10 pb-4">
                  <h2 className="font-display text-2xl text-paper">Inference Telemetry</h2>
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-xs text-dim">Grad-CAM Map</span>
                    <button
                      onClick={() => setShowGradCam(!showGradCam)}
                      className={`relative w-10 h-5 rounded-full transition-colors ${showGradCam ? 'bg-signal' : 'bg-line'}`}
                    >
                      <motion.div
                        className="absolute top-1 w-3 h-3 bg-white rounded-full"
                        animate={{ left: showGradCam ? 'calc(100% - 16px)' : '4px' }}
                        transition={{ type: "spring", stiffness: 500, damping: 30 }}
                      />
                    </button>
                  </div>
                </div>

                <div className="grid gap-6">
                  {response.results.map((r, i) => {
                    const meta = modelsById[r.modelId];
                    const topClass = r.label;

                    return (
                      <motion.div
                        key={r.modelId}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: i * 0.1, duration: 0.4 }}
                        className="rounded-2xl border border-white/10 bg-panel/60 p-5 overflow-hidden relative group"
                      >
                        {/* Glow effect on hover */}
                        <div className="absolute inset-0 bg-gradient-to-r from-signal/0 via-signal/5 to-signal/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000 pointer-events-none" />

                        <div className="grid md:grid-cols-[1fr_240px] gap-6">
                          {/* Data/Stats Side */}
                          <div>
                            <div className="flex items-baseline justify-between mb-6">
                              <div>
                                <h3 className="font-display text-xl text-paper">
                                  {meta?.name ?? r.modelId}
                                </h3>
                                <p className="font-mono text-xs text-dim mt-1">
                                  Latency: <span className="text-paper">{r.latencyMs.toFixed(1)} ms</span>
                                </p>
                              </div>
                              <div className="text-right">
                                <span className="block font-mono text-2xl text-signal capitalize">
                                  {topClass}
                                </span>
                                <span className="font-mono text-[10px] text-dim uppercase tracking-widest">
                                  Prediction
                                </span>
                              </div>
                            </div>

                            {/* Distribution Bars */}
                            <div className="space-y-4">
                              <p className="font-mono text-[10px] text-dim uppercase tracking-widest mb-2">Confidence Distribution</p>
                              {Object.entries(r.classProbs)
                                .sort((a, b) => b[1] - a[1])
                                .map(([cls, p]) => (
                                  <div key={cls} className="flex items-center gap-4">
                                    <span className="w-24 font-mono text-[11px] text-dim capitalize shrink-0">
                                      {cls}
                                    </span>
                                    <div className="flex-1 h-1 bg-black/50 rounded-full overflow-hidden relative">
                                      <motion.div
                                        initial={{ width: 0 }}
                                        animate={{ width: `${p * 100}%` }}
                                        transition={{ duration: 1, delay: 0.2 + (i * 0.1), ease: "easeOut" }}
                                        className={`absolute inset-y-0 left-0 ${cls === topClass ? "bg-signal shadow-[0_0_10px_rgba(62,217,196,0.8)]" : "bg-white/20"
                                          }`}
                                      />
                                    </div>
                                    <span className={`w-12 font-mono text-[11px] text-right ${cls === topClass ? 'text-signal' : 'text-dim'}`}>
                                      {(p * 100).toFixed(1)}%
                                    </span>
                                  </div>
                                ))}
                            </div>
                          </div>

                          {/* Image / GradCAM Side */}
                          <div className="relative h-48 md:h-full min-h-[160px] rounded-xl overflow-hidden border border-white/5 bg-black/40 flex items-center justify-center">
                            {r.gradcamBase64 && showGradCam ? (
                              <motion.img
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                src={r.gradcamBase64}
                                alt="Grad-CAM"
                                className="w-full h-full object-cover mix-blend-screen"
                              />
                            ) : (
                              imageDataUrl && (
                                <motion.img
                                  initial={{ opacity: 0 }}
                                  animate={{ opacity: 1 }}
                                  src={imageDataUrl}
                                  alt="Original MRI"
                                  className="w-full h-full object-cover opacity-80"
                                />
                              )
                            )}

                            {r.gradcamBase64 && (
                              <div className="absolute top-2 right-2 px-2 py-1 bg-black/80 backdrop-blur-md rounded border border-white/10 font-mono text-[9px] uppercase tracking-widest text-signal">
                                {showGradCam ? 'Grad-CAM Active' : 'Raw Output'}
                              </div>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </main>
  );
}
