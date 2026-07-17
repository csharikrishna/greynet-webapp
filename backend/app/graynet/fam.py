"""
Stage 4 / Stage 8 — Frequency Attention Module v2 (FAM)

v2 changes over v1:
  - Replaces static complex spectral mask with MLP gate × learnable freq_mask.
    The MLP gate adapts per-image based on actual spectral content.
    The freq_mask learns domain-specific spectral priors at training time.
  - freq_mask parameters should use 0.1× learning rate to prevent
    early spectral collapse (use model.get_fam_lr_params()).
  - Residual connection ensures near-identity initialization.
  - FAMLite removed — unified FAM handles all spatial sizes via reduction param.
"""

import torch
import torch.nn as nn


class FAM(nn.Module):
    """Frequency Attention Module with adaptive MLP gate.

    Two-factor spectral modulation:
      1. Static freq_mask: learns domain-specific spectral profile
      2. Dynamic MLP gate: adapts per-image based on amplitude statistics

    Args:
        channels:   Number of input channels.
        reduction:  Reduction ratio for gate MLP (default 4).
    """

    def __init__(self, channels: int = 64, reduction: int = 4):
        super().__init__()
        self.channels = channels

        # Learnable domain-specific spectral profile (initialized to ones = identity)
        self.freq_mask = nn.Parameter(torch.ones(1, channels, 1, 1))

        # Per-image adaptive gate: amplitude statistics → channel gate
        hidden = max(channels // reduction, 8)
        self.gate = nn.Sequential(
            nn.Linear(channels, hidden),
            nn.GELU(),
            nn.Linear(hidden, channels),
            nn.Sigmoid(),
        )

        # Residual scaling (starts small, grows during training)
        self.scale = nn.Parameter(torch.ones(1) * 0.5)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        """Spectral filtering with per-image MLP gate × static mask."""
        B, C, H, W = x.shape
        input_dtype = x.dtype
        x_float = x.float()

        # Forward FFT
        X_freq = torch.fft.rfft2(x_float, norm='ortho')

        # Per-channel mean amplitude → MLP gate
        amp = X_freq.abs().mean(dim=[-2, -1])  # (B, C)
        gate = self.gate(amp).unsqueeze(-1).unsqueeze(-1)  # (B, C, 1, 1)

        # Two-factor mask: static domain prior × dynamic per-image gate
        mask = gate * self.freq_mask  # (B, C, 1, 1) broadcast over freq dims

        # Apply mask in frequency domain
        X_filtered = X_freq * mask

        # Inverse FFT
        out = torch.fft.irfft2(X_filtered, s=(H, W), norm='ortho')
        out = out.to(input_dtype)

        return x + self.scale * out
