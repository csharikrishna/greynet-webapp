export type ModelStat = {
  id: string;
  name: string;
  tier: "Master" | "Lite" | "Mini" | "Pico" | "Femto";
  kd: boolean;
  widthMult: number;
  params: number; // in K
  sizeKB: number;
  cpu1t: number; // ms
  cpu4t: number; // ms
  gpu: number; // ms
  stdAcc: number; // %
  ttaAcc: number; // %
  delta: number; // pp
};

// Source: user-provided benchmark table, cross-checked against
// configs/*.yaml width_mult values in the GreyNet repository.
export const MODELS: ModelStat[] = [
  { id: "master-v1", name: "Master v1", tier: "Master", kd: false, widthMult: 1.0, params: 813.1, sizeKB: 3290.19, cpu1t: 107.95, cpu4t: 39.64, gpu: 4.69, stdAcc: 97.81, ttaAcc: 97.79, delta: -0.01 },
  { id: "master-v2", name: "Master v2", tier: "Master", kd: false, widthMult: 1.0, params: 813.1, sizeKB: 3290.19, cpu1t: 101.98, cpu4t: 38.60, gpu: 3.73, stdAcc: 98.11, ttaAcc: 98.13, delta: 0.01 },
  { id: "lite-nokd", name: "Lite No-KD", tier: "Lite", kd: false, widthMult: 0.53, params: 249.5, sizeKB: 1066.32, cpu1t: 48.79, cpu4t: 22.32, gpu: 3.98, stdAcc: 97.87, ttaAcc: 97.98, delta: 0.12 },
  { id: "lite-kd", name: "Lite KD", tier: "Lite", kd: true, widthMult: 0.53, params: 249.5, sizeKB: 1066.32, cpu1t: 49.05, cpu4t: 21.78, gpu: 3.87, stdAcc: 98.03, ttaAcc: 98.03, delta: -0.0 },
  { id: "mini-nokd", name: "Mini No-KD", tier: "Mini", kd: false, widthMult: 0.35, params: 110.5, sizeKB: 514.88, cpu1t: 31.92, cpu4t: 17.26, gpu: 3.83, stdAcc: 97.87, ttaAcc: 97.95, delta: 0.09 },
  { id: "mini-kd", name: "Mini KD", tier: "Mini", kd: true, widthMult: 0.35, params: 110.5, sizeKB: 514.88, cpu1t: 31.99, cpu4t: 17.33, gpu: 4.05, stdAcc: 98.19, ttaAcc: 98.24, delta: 0.06 },
  { id: "pico-nokd", name: "Pico No-KD", tier: "Pico", kd: false, widthMult: 0.20, params: 52.9, sizeKB: 281.82, cpu1t: 23.59, cpu4t: 14.78, gpu: 3.80, stdAcc: 97.66, ttaAcc: 97.75, delta: 0.09 },
  { id: "pico-kd", name: "Pico KD", tier: "Pico", kd: true, widthMult: 0.20, params: 52.9, sizeKB: 281.82, cpu1t: 24.63, cpu4t: 15.58, gpu: 3.93, stdAcc: 97.85, ttaAcc: 98.10, delta: 0.25 },
  { id: "femto-nokd", name: "Femto No-KD", tier: "Femto", kd: false, widthMult: 0.10, params: 24.7, sizeKB: 168.51, cpu1t: 29.69, cpu4t: 30.49, gpu: 8.72, stdAcc: 96.94, ttaAcc: 97.42, delta: 0.48 },
  { id: "femto-kd", name: "Femto KD", tier: "Femto", kd: true, widthMult: 0.10, params: 24.7, sizeKB: 168.51, cpu1t: 17.18, cpu4t: 23.43, gpu: 3.95, stdAcc: 97.01, ttaAcc: 97.32, delta: 0.30 },
];

export const CLASS_NAMES = ["glioma", "meningioma", "notumor", "pituitary"] as const;
export type ClassName = (typeof CLASS_NAMES)[number];

export const LEAKAGE_STATS = {
  trainImages: 5600,
  testImages: 1600,
  duplicatesFound: 1380,
  leakagePct: 86.25,
  cleanedLeaksFlagged: 2,
  cleanedTrueLeaks: 0,
  cleanedPicoAcc: 97.30,
  sourceDatasets: ["figshare", "SARTAJ", "Br35H"],
  addedDataset: "BRISC 2025",
};

export type Stage = {
  index: number;
  id: string;
  name: string;
  tag: string;
  summary: string;
  detail: string;
  costNote?: string;
};

// Descriptions are derived directly from the module docstrings and
// forward-pass logic in graynet/*.py.
export const STAGES: Stage[] = [
  {
    index: 1,
    id: "stem",
    name: "Grayscale Stem",
    tag: "stem.py",
    summary: "A single stride-2 convolution that expands the raw 1-channel MRI slice into 24 feature maps.",
    detail:
      "We avoid the computationally wasteful 'RGB-replication' trick used by standard transfer-learning backbones. GrayNet is unapologetically grayscale-first, natively reading intensity to save parameters seamlessly.",
    costNote: "~104 extra parameters over a 16-channel stem, for 50% more initial feature diversity.",
  },
  {
    index: 2,
    id: "ace",
    name: "Adaptive Contrast Enhancement",
    tag: "ace.py",
    summary: "Learns a spatially-varying gain and bias map to sharpen faint tumor borders before deeper feature extraction.",
    detail:
      "A shared 5×5 depthwise kernel builds local context, then two separate 1×1 heads predict a per-pixel gain (0–2, allowing both suppression and amplification) and bias. This matters clinically: low-grade glioma borders are often barely distinguishable from healthy tissue in raw pixel intensity, and ACE gives the network room to boost that contrast adaptively per image.",
    costNote: "~1,848 parameters at 24 channels.",
  },
  {
    index: 3,
    id: "teb",
    name: "Texture Extraction Block",
    tag: "teb.py",
    summary: "Expands 24 channels to 64 using parallel dilated depthwise convolutions to capture multi-scale texture.",
    detail:
      "The v1 design compressed 48 channels of texture features back down to 16 — discarding two-thirds of the signal. v2 instead expands channel width through this block, keeping the richer multi-scale texture representation intact for the modules downstream. A 1×1 projection shortcut handles the residual since input and output widths differ.",
    costNote: "~8,408 parameters for the 24→64 expansion.",
  },
  {
    index: 4,
    id: "fam",
    name: "Frequency Attention Module",
    tag: "fam.py",
    summary: "Applies a real 2D FFT to the feature map, gates it in the frequency domain, then transforms back — the layer that blocks ONNX export.",
    detail:
      "MRI noise and fine tissue boundaries often separate cleaner in the frequency domain. We designed this module to let the network reason natively using Fourier transforms rather than forcing CNNs to approximate frequency filtering.",
  },
  {
    index: 5,
    id: "msdc",
    name: "Multi-Scale Depthwise Conv (Ghost)",
    tag: "msdc.py",
    summary: "Ghost convolutions generate half the output channels cheaply from the other half, reused three times through the network at increasing depth.",
    detail:
      "Grayscale imagery relies heavily on texture, benefiting from wider 5×5 receptive fields. However, larger filters increase computational cost. GrayNet uses Ghost convolutions to generate half its feature maps with cheap 5x5 depthwise operations, maintaining rich context without the parameter overhead.",
  },
  {
    index: 6,
    id: "sfa",
    name: "Statistical Feature Aggregator",
    tag: "sfa.py",
    summary: "Computes local variance and log-variance across two window sizes as explicit statistical features, fused back in via gating.",
    detail:
      "Beyond learned convolutional features, SFA explicitly computes local mean, variance, and log-variance (a differential-entropy proxy) over 3×3 and 5×5 windows — proxies for local noise and texture roughness that MRI tissue boundaries often reveal directly. These are concatenated with the original features and fused through a 1×1 gate back down to the original channel count, with a residual connection.",
  },
  {
    index: 7,
    id: "cbam",
    name: "CBAM++ (Channel + Spatial Attention)",
    tag: "cbam.py",
    summary: "Three attention branches — average-pool, max-pool, and variance-pool — combined with multiplication rather than summation.",
    detail:
      "Standard CBAM sums its attention branches, so any one strong signal can dominate. GrayNet's variant multiplies the three gates instead, implementing AND logic: a channel only passes through if it scores highly on mean activation, peak activation, and variance simultaneously. This was an empirical fix — summation was too permissive and caused confusion between glioma and meningioma, which differ more in variance/texture than raw intensity.",
  },
  {
    index: 8,
    id: "head",
    name: "Classification Head",
    tag: "head.py",
    summary: "Dual-pool (average + max) head projecting to 4 tumor classes: glioma, meningioma, no tumor, pituitary.",
    detail:
      "A 1×1 conv projects the final feature map to an embedding dimension, then both average-pooling and max-pooling are computed and concatenated before the final linear classifier. Max-pooling alone empirically outperformed pure global-average-pooling here, because it preserves the single most discriminative activation rather than diluting it — useful for distinguishing glioma from meningioma, which can hinge on a small, sharply localized feature.",
  },
];
