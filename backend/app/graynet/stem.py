"""
Stage 1 — Grayscale-Native Stem (v2)

Expands from 1-channel grayscale input to `out_channels` feature maps
using a standard convolution at stride 2.

v2 changes:
  - Default output channels: 24 (was 16)
  - Activation: GELU (better gradient flow for novel downstream modules)
  - 24 independent 3×3 filters on raw grayscale pixels provide 50% more
    initial feature diversity than 16, at only 104 extra parameters.
"""

import torch
import torch.nn as nn


class GrayscaleStem(nn.Module):
    """Grayscale-native stem: Standard Conv(1→out_ch) at stride 2.

    Args:
        in_channels:  Input channels (default 1 for grayscale).
        out_channels: Output feature channels (default 24).
        kernel_size:  Convolution kernel size (default 3).
        stride:       Spatial stride (default 2).
    """

    def __init__(
        self,
        in_channels: int = 1,
        out_channels: int = 24,
        kernel_size: int = 3,
        stride: int = 2,
    ):
        super().__init__()
        padding = kernel_size // 2

        self.conv = nn.Conv2d(
            in_channels,
            out_channels,
            kernel_size=kernel_size,
            stride=stride,
            padding=padding,
            bias=False,
        )
        self.bn = nn.BatchNorm2d(out_channels)
        self.act = nn.GELU()

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        """Forward pass: (B, 1, H, W) → (B, out_ch, H/2, W/2)."""
        return self.act(self.bn(self.conv(x)))


# Backward compatibility alias
DWStem = GrayscaleStem
