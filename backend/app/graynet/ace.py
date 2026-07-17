"""
Stage 2 — Adaptive Contrast Enhancement v2 (ACE)

v2 changes over v1:
  - Gain range (0, 2) instead of (0, 1): allows BOTH suppression AND
    amplification of contrast. Critical for faint low-grade glioma borders.
  - Shared 5×5 DW context kernel feeds two separate 1×1 pointwise heads
    for gain and bias. More parameter-efficient than two separate DW convs.
  - Output BatchNorm for stable gradient flow.

Cost: ~1,848 parameters for 24 channels.
"""

import torch
import torch.nn as nn


class ACE(nn.Module):
    """Adaptive Contrast Enhancement v2.

    Learns spatially-varying gain (0,2) and bias maps via a shared
    depthwise context kernel and separate pointwise prediction heads.

    Args:
        channels:    Number of input/output channels.
        kernel_size: Depthwise kernel size for spatial context (default 5).
    """

    def __init__(self, channels: int = 24, kernel_size: int = 5):
        super().__init__()
        padding = kernel_size // 2

        # Shared spatial context: depthwise conv builds per-channel context
        self.context = nn.Conv2d(
            channels, channels,
            kernel_size=kernel_size, stride=1, padding=padding,
            groups=channels, bias=False,
        )

        # Gain head: 1×1 pointwise predicts per-channel gain
        self.gain_head = nn.Conv2d(channels, channels, 1)

        # Bias head: 1×1 pointwise predicts per-channel bias
        self.bias_head = nn.Conv2d(channels, channels, 1)

        # Output normalization
        self.bn = nn.BatchNorm2d(channels)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        """Apply spatially-varying contrast: x * gain(0,2) + bias.

        The gain range (0,2) allows both suppression (<1) and
        amplification (>1) of local contrast.
        """
        ctx = self.context(x)
        gain = torch.sigmoid(self.gain_head(ctx)) * 2.0  # range (0, 2)
        bias = self.bias_head(ctx)
        return self.bn(x * gain + bias)
