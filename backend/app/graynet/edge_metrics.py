"""
Edge Deployment Metrics for GrayNet models.

Computes FLOPs, latency, throughput, memory, and model size
for inclusion in classification reports and paper tables.

Metrics reported:
  - Parameter count (total / trainable)
  - Model size on disk (KB)
  - FLOPs / MACs  (via thop)
  - Inference latency  (mean, std, min, max, P95, P99)
  - Throughput  (images / second)
  - Peak GPU memory during inference
"""

import copy
import time
import torch
import numpy as np
from io import BytesIO


# ── Individual metric functions ──────────────────────────────────────────

def count_parameters(model):
    """Return (total_params, trainable_params)."""
    total = sum(p.numel() for p in model.parameters())
    trainable = sum(p.numel() for p in model.parameters() if p.requires_grad)
    return total, trainable


def get_model_size_kb(model):
    """Serialize state_dict to memory and return size in KB."""
    buf = BytesIO()
    torch.save(model.state_dict(), buf)
    return buf.tell() / 1024.0


def count_flops(model, input_size=256, device="cpu"):
    """Count FLOPs (multiply-accumulate operations x2) using thop."""
    try:
        from thop import profile, clever_format
        dummy = torch.randn(1, 1, input_size, input_size, device=device)
        m = copy.deepcopy(model).to(device).eval()
        flops, _ = profile(m, inputs=(dummy,), verbose=False)
        return flops  # total FLOPs (= 2 * MACs)
    except Exception:
        return None


def measure_latency(model, input_size=256, device="cuda",
                    num_warmup=50, num_runs=200, batch_size=1):
    """
    Measure per-batch inference latency.

    Returns dict with mean_ms, std_ms, min_ms, max_ms, p95_ms, p99_ms,
    and throughput_ips (images per second).
    """
    is_cuda = (device == "cuda"
               or (isinstance(device, torch.device) and device.type == "cuda"))
    m = copy.deepcopy(model).to(device).eval()
    dummy = torch.randn(batch_size, 1, input_size, input_size, device=device)

    # Warmup
    with torch.no_grad():
        for _ in range(num_warmup):
            m(dummy)
    if is_cuda:
        torch.cuda.synchronize()

    latencies = []
    with torch.no_grad():
        for _ in range(num_runs):
            if is_cuda:
                torch.cuda.synchronize()
            t0 = time.perf_counter()
            m(dummy)
            if is_cuda:
                torch.cuda.synchronize()
            latencies.append((time.perf_counter() - t0) * 1000.0)  # ms

    lat = np.array(latencies)
    return {
        "mean_ms":  float(np.mean(lat)),
        "std_ms":   float(np.std(lat)),
        "min_ms":   float(np.min(lat)),
        "max_ms":   float(np.max(lat)),
        "p95_ms":   float(np.percentile(lat, 95)),
        "p99_ms":   float(np.percentile(lat, 99)),
        "throughput_ips": float(batch_size * 1000.0 / np.mean(lat)),
    }


def get_peak_memory_mb(model, input_size=256, device="cuda", batch_size=1):
    """Peak GPU memory (MB) for a single forward pass."""
    is_cuda = (device == "cuda"
               or (isinstance(device, torch.device) and device.type == "cuda"))
    if not is_cuda:
        return None
    m = copy.deepcopy(model).to(device).eval()
    torch.cuda.reset_peak_memory_stats()
    torch.cuda.empty_cache()
    dummy = torch.randn(batch_size, 1, input_size, input_size, device=device)
    with torch.no_grad():
        m(dummy)
    return torch.cuda.max_memory_allocated() / (1024 * 1024)


# ── Aggregate function ───────────────────────────────────────────────────

def compute_edge_metrics(model, input_size=256, device="cuda"):
    """
    Compute all edge-deployment metrics and return a formatted multi-line
    string ready to be appended to classification reports.

    Metrics:
      - Parameters, model size, FLOPs
      - Batch-1 latency (mean/std/min/max/P95/P99) + throughput
      - Batch-32 latency + throughput
      - Peak GPU memory
    """
    dev = device if isinstance(device, torch.device) else torch.device(device)

    # ── Static metrics ────────────────────────────────────────────────
    total_p, train_p = count_parameters(model)
    size_kb = get_model_size_kb(model)
    flops = count_flops(model, input_size, dev)

    # ── Dynamic metrics ───────────────────────────────────────────────
    lat_b1  = measure_latency(model, input_size, dev, batch_size=1)
    lat_b32 = measure_latency(model, input_size, dev, batch_size=32)
    peak_mem = get_peak_memory_mb(model, input_size, dev, batch_size=1)

    # ── Format ────────────────────────────────────────────────────────
    sep = "=" * 55
    lines = ["", "Edge Deployment Metrics", sep]

    lines += [
        f"  Parameters (total)     : {total_p:,}",
        f"  Parameters (trainable) : {train_p:,}",
        f"  Model Size             : {size_kb:.2f} KB",
    ]

    if flops is not None:
        macs = flops / 2.0  # thop returns FLOPs; MACs = FLOPs / 2
        if flops >= 1e9:
            lines.append(f"  FLOPs ({input_size}x{input_size} input) : {flops/1e9:.4f} GFLOPs  ({macs/1e6:.2f} MMACs)")
        elif flops >= 1e6:
            lines.append(f"  FLOPs ({input_size}x{input_size} input) : {flops/1e6:.4f} MFLOPs  ({macs/1e6:.4f} MMACs)")
        else:
            lines.append(f"  FLOPs ({input_size}x{input_size} input) : {flops/1e3:.2f} KFLOPs  ({macs/1e3:.2f} KMACs)")
    else:
        lines.append("  FLOPs                  : N/A (install thop: pip install thop)")

    lines += [
        "",
        "  Inference Latency (GPU, batch=1):",
        f"    Mean   : {lat_b1['mean_ms']:.3f} ms",
        f"    Std    : {lat_b1['std_ms']:.3f} ms",
        f"    Min    : {lat_b1['min_ms']:.3f} ms",
        f"    Max    : {lat_b1['max_ms']:.3f} ms",
        f"    P95    : {lat_b1['p95_ms']:.3f} ms",
        f"    P99    : {lat_b1['p99_ms']:.3f} ms",
        f"  Throughput (batch=1)   : {lat_b1['throughput_ips']:,.1f} img/s",
        "",
        "  Inference Latency (GPU, batch=32):",
        f"    Mean   : {lat_b32['mean_ms']:.3f} ms",
        f"  Throughput (batch=32)  : {lat_b32['throughput_ips']:,.1f} img/s",
    ]

    if peak_mem is not None:
        lines += [
            "",
            f"  Peak GPU Memory (b=1)  : {peak_mem:.2f} MB",
        ]

    lines.append(sep)
    return "\n".join(lines)
