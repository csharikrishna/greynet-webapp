"""
Stage 7 — CBAM++ v2 (Channel + Spatial Attention with VarPool)

v2 changes over v1:
  - Three-branch fusion uses ELEMENT-WISE MULTIPLICATION instead of
    summation. Each branch independently produces a sigmoid gate, then
    the three gates are multiplied. This implements AND logic: a channel
    must be important under ALL three pooling strategies to pass.
  - This is the correct inductive bias for heterogeneous tumor features
    where discriminative channels should have simultaneously high mean
    (AvgPool), high peak (MaxPool), AND high variance (VarPool).
  - Summation was too permissive — any single strong signal could
    override the other two, causing glioma/meningioma confusion.
"""

import torch
import torch.nn as nn


class CBAMPlusPlus(nn.Module):
    """CBAM++ with VarPool and multiplicative three-branch fusion.

    Args:
        channels:       Number of input/output channels.
        reduction:      Reduction ratio for the shared MLP (default 12).
        spatial_kernel: Kernel size for spatial attention (default 7).
    """

    def __init__(self, channels=384, reduction=12, spatial_kernel=7):
        super().__init__()
        hidden = max(channels // reduction, 8)

        # Shared MLP backbone (without final activation — each branch adds its own sigmoid)
        self.mlp = nn.Sequential(
            nn.Linear(channels, hidden, bias=False),
            nn.GELU(),
            nn.Linear(hidden, channels, bias=False),
        )

        # Spatial attention: 2-ch (avg+max) → conv → sigmoid
        self.spatial_conv = nn.Conv2d(
            2, 1, kernel_size=spatial_kernel,
            padding=spatial_kernel // 2, bias=False,
        )

    def _channel_attention(self, x):
        B, C, H, W = x.shape

        # Three pooling strategies → shared MLP → three INDEPENDENT sigmoid gates
        avg_gate = torch.sigmoid(self.mlp(x.mean(dim=[2, 3])))
        max_gate = torch.sigmoid(self.mlp(x.amax(dim=[2, 3])))
        mean = x.mean(dim=[2, 3], keepdim=True)
        var_gate = torch.sigmoid(self.mlp(((x - mean) ** 2).mean(dim=[2, 3])))

        # ADDITIVE fusion: (avg + max + var) / 3
        Mc = ((avg_gate + max_gate + var_gate) / 3.0).unsqueeze(-1).unsqueeze(-1)
        return x * Mc

    def _spatial_attention(self, x):
        avg_sp = x.mean(dim=1, keepdim=True)
        max_sp = x.amax(dim=1, keepdim=True)
        sp = torch.cat([avg_sp, max_sp], dim=1)
        Ms = torch.sigmoid(self.spatial_conv(sp))
        return x * Ms

    def forward(self, x):
        x = self._channel_attention(x)
        x = self._spatial_attention(x)
        return x
