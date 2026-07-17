"""
Stage 5 — Statistical Feature Aggregator v2 (SFA)

v2 changes over v1:
  - Standalone module: SFA no longer wraps an MSDC block internally.
    Channel expansion is handled by a separate MSDC block in the pipeline.
    This gives cleaner separation of concerns.
  - Computes: local mean, local variance, log-variance (entropy proxy)
  - Concatenates [x, variance, log_var] → 3C channels → 1×1 fuse → C + residual
  - noise_mode controls pooling window: 'mri'=3×3, 'sar'=5×5
"""

import torch
import torch.nn as nn


class SFA(nn.Module):
    """Statistical Feature Aggregator with entropy-based gating.

    Computes local variance and log-variance (differential entropy proxy)
    as additional features, then fuses with original via 1×1 conv + gate.

    Args:
        channels:   Number of input/output channels.
        noise_mode: 'mri' (3×3 pool) or 'sar' (5×5 pool).
        eps:        Epsilon for log stability (default 1e-6).
    """

    def __init__(self, channels=128, noise_mode="mri", eps=1e-6):
        super().__init__()
        self.eps = eps
        
        # Dual windows
        self.avg_pool_3 = nn.AvgPool2d(3, stride=1, padding=1)
        self.avg_pool_5 = nn.AvgPool2d(5, stride=1, padding=2)

        # Fuse: [x, var_3, log_var_3, var_5, log_var_5] (5C) → C
        self.gate_conv = nn.Sequential(
            nn.Conv2d(channels * 5, channels, kernel_size=1, bias=False),
            nn.BatchNorm2d(channels),
        )

    def forward(self, x):
        # 3x3 window stats
        mu_3 = self.avg_pool_3(x)
        var_3 = self.avg_pool_3((x - mu_3).pow(2))
        log_var_3 = torch.log(var_3 + self.eps)

        # 5x5 window stats
        mu_5 = self.avg_pool_5(x)
        var_5 = self.avg_pool_5((x - mu_5).pow(2))
        log_var_5 = torch.log(var_5 + self.eps)

        stat_feat = torch.cat([x, var_3, log_var_3, var_5, log_var_5], dim=1)
        gate = torch.sigmoid(self.gate_conv(stat_feat))
        return x * gate  # gated residual
