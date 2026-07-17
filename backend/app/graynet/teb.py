"""
Stage 3 — Texture Extraction Block v2 (TEB)

v2 changes over v1:
  - EXPANDS channels from in_ch to out_ch (24→64 default) instead of
    projecting back to the same count. This is the single most impactful
    change for glioma classification — v1 crushed 48 channels of rich
    multi-scale texture down to 16, discarding 67% of texture information.
  - Residual uses a 1×1 projection shortcut (since in_ch != out_ch).
  - Activation: GELU for consistency with v2 front-end.

Cost: ~8,408 parameters for 24→64.
"""

import torch
import torch.nn as nn


class _DepthwisePath(nn.Module):
    """Single depthwise convolution path within TEB."""

    def __init__(self, channels: int, kernel_size: int, dilation: int = 1):
        super().__init__()
        self.conv = nn.Conv2d(
            channels, channels,
            kernel_size=kernel_size, stride=1,
            padding=(kernel_size // 2) * dilation,
            dilation=dilation,
            groups=channels, bias=False,
        )
        self.bn = nn.BatchNorm2d(channels)
        self.act = nn.GELU()

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        return self.act(self.bn(self.conv(x)))


class TEB(nn.Module):
    """Texture Extraction Block with channel expansion.

    Three parallel depthwise paths (3×3, 5×5, 7×7) capture multi-scale
    texture. Outputs are concatenated and projected to out_channels.

    Args:
        in_channels:  Input channels (default 24, from stem).
        out_channels: Output channels (default 64, expanded).
        kernel_sizes: Tuple of kernel sizes for parallel paths.
    """

    def __init__(self, in_channels: int = 24, out_channels: int = 64,
                 kernel_sizes: tuple = (3, 5, 7)):
        super().__init__()
        self.paths = nn.ModuleList(
            [_DepthwisePath(in_channels, k) for k in kernel_sizes]
        )
        # 4th path: Dilated 3x3 (dilation=2)
        self.paths.append(_DepthwisePath(in_channels, 3, dilation=2))

        # Project concatenated multi-scale features to output channels
        concat_channels = in_channels * (len(kernel_sizes) + 1)
        self.proj = nn.Conv2d(concat_channels, out_channels, 1, bias=False)

        # Residual projection (needed because in_ch != out_ch)
        self.residual = nn.Conv2d(in_channels, out_channels, 1, bias=False)

        self.bn = nn.BatchNorm2d(out_channels)
        self.act = nn.GELU()

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        """(B, in_ch, H, W) → (B, out_ch, H, W) with residual."""
        multi_scale = [path(x) for path in self.paths]
        cat = torch.cat(multi_scale, dim=1)
        out = self.proj(cat)
        return self.act(self.bn(out + self.residual(x)))


# Backward compatibility: if called with single 'channels' arg
def _teb_compat(channels=None, in_channels=None, out_channels=None, **kwargs):
    if channels is not None and in_channels is None:
        return TEB(in_channels=channels, out_channels=channels, **kwargs)
    return TEB(in_channels=in_channels or 24, out_channels=out_channels or 64, **kwargs)
