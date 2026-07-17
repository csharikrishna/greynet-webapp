"use client";

import { useEffect, useRef } from "react";

export default function SpectrumCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const cssSize = canvas.clientWidth;
    canvas.width = cssSize * dpr;
    canvas.height = cssSize * dpr;
    ctx.scale(dpr, dpr);

    const N = 512; // Use higher resolution for real images
    const imgRaw = new Image();
    const imgGrad = new Image();
    let loaded = 0;

    imgRaw.src = '/sample_mri.jpg';
    imgGrad.src = '/sample_gradcam.jpg';

    const onBothLoaded = () => {
      loaded++;
      if (loaded !== 2) return;

      const rawCanvas = document.createElement("canvas");
      rawCanvas.width = N;
      rawCanvas.height = N;
      rawCanvas.getContext("2d")!.drawImage(imgRaw, 0, 0, N, N);

      const gradCanvas = document.createElement("canvas");
      gradCanvas.width = N;
      gradCanvas.height = N;
      gradCanvas.getContext("2d")!.drawImage(imgGrad, 0, 0, N, N);

      let start: number | null = null;
      const durationMs = 4200;

      function frame(ts: number) {
        if (!ctx || !canvas) return;
        if (start === null) start = ts;
        const t = ((ts - start) % durationMs) / durationMs;
        // Ping-pong sweep 0 -> 1 -> 0
        const sweep = t < 0.5 ? t * 2 : 2 - t * 2;
        const boundaryPx = sweep * cssSize;

        ctx.clearRect(0, 0, cssSize, cssSize);
        ctx.imageSmoothingEnabled = true;

        ctx.drawImage(rawCanvas, 0, 0, N, N, 0, 0, cssSize, cssSize);

        ctx.save();
        ctx.beginPath();
        ctx.rect(boundaryPx, 0, cssSize - boundaryPx, cssSize);
        ctx.clip();
        ctx.drawImage(gradCanvas, 0, 0, N, N, 0, 0, cssSize, cssSize);
        ctx.restore();

        // Cybernetic scanner line with intense neon glow
        ctx.shadowBlur = 20;
        ctx.shadowColor = "rgba(62,217,196,1)";
        ctx.fillStyle = "rgba(62,217,196,1)";
        ctx.fillRect(boundaryPx - 2, 0, 4, cssSize);
        ctx.shadowBlur = 0; // Reset for performance

        rafRef.current = requestAnimationFrame(frame);
      }

      const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (prefersReduced) {
        ctx.imageSmoothingEnabled = true;
        ctx.drawImage(rawCanvas, 0, 0, N, N, 0, 0, cssSize * 0.55, cssSize);
        ctx.drawImage(gradCanvas, 0, 0, N, N, cssSize * 0.55, 0, cssSize * 0.45, cssSize);
      } else {
        rafRef.current = requestAnimationFrame(frame);
      }
    };

    imgRaw.onload = onBothLoaded;
    imgGrad.onload = onBothLoaded;

    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  return (
    <div className="relative w-full aspect-square max-w-md mx-auto p-4 rounded-[2.5rem] bg-[#0A0C0E]/60 border border-white/10 backdrop-blur-xl shadow-[0_0_60px_-15px_rgba(62,217,196,0.25)]">
      <div className="relative w-full h-full rounded-[1.5rem] overflow-hidden bg-black ring-1 ring-white/5">
        <canvas
          ref={canvasRef}
          className="w-full h-full"
          style={{ imageRendering: "auto" }}
          role="img"
          aria-label="Animated transform showing Grad-CAM feature activations over the input MRI slice"
        />
        <div className="absolute bottom-6 left-6 right-6 flex justify-between pointer-events-none z-10">
          <span className="bg-black/60 border border-white/10 px-3 py-1.5 rounded-full font-mono text-[9px] uppercase tracking-widest text-paper shadow-lg backdrop-blur-md">
            Spatial domain
          </span>
          <span className="bg-signal/15 border border-signal/30 px-3 py-1.5 rounded-full font-mono text-[9px] uppercase tracking-widest text-signal shadow-[0_0_15px_rgba(62,217,196,0.3)] backdrop-blur-md">
            Grad-CAM Heatmap
          </span>
        </div>
      </div>
    </div>
  );
}
