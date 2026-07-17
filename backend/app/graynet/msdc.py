"""
Stage 4/6 — Multi-Scale Depthwise Conv Block v2 (MSDC)

v2 changes over v1:
  - Ghost cheap operation uses 5×5 kernel (was 3×3). For texture-dominant
    grayscale imagery, the wider receptive field in the cheap operation
    captures longer-range texture gradients at negligible parameter cost
    (25 vs 9 weights per channel, depthwise).
  - All other aspects retained from v1 (proven stable over 7 training runs).
"""

import torch
import torch.nn as nn


class DropPath(nn.Module):
    """Stochastic Depth: randomly drop entire residual branches during training."""

    def __init__(self, drop_prob: float = 0.0):
        super().__init__()
        self.drop_prob = drop_prob

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        if self.drop_prob == 0.0 or not self.training:
            return x
        keep_prob = 1 - self.drop_prob
        shape = (x.shape[0],) + (1,) * (x.ndim - 1)
        random_tensor = torch.rand(shape, dtype=x.dtype, device=x.device)
        random_tensor = torch.floor(random_tensor + keep_prob)
        return x * random_tensor / keep_prob

    def extra_repr(self):
        return f"drop_prob={self.drop_prob:.3f}"


class GhostConv(nn.Module):
    """Ghost convolution: generates half features via cheap DW operations.

    v2: cheap operation uses 5×5 kernel for wider texture receptive field.

    Args:
        in_channels:  Input channels.
        out_channels: Output channels (must be even).
        cheap_kernel: Kernel size for cheap depthwise transform (default 5).
    """

    def __init__(self, in_channels: int, out_channels: int, cheap_kernel: int = 5):
        super().__init__()
        assert out_channels % 2 == 0, "GhostConv requires even out_channels"
        half = out_channels // 2

        # Real convolutions: half the channels
        self.primary = nn.Sequential(
            nn.Conv2d(in_channels, half, kernel_size=1, bias=False),
            nn.BatchNorm2d(half),
            nn.SiLU(inplace=True),
        )

        # Cheap depthwise: generates the other half (v2: 5×5 kernel)
        self.cheap = nn.Sequential(
            nn.Conv2d(
                half, half,
                kernel_size=cheap_kernel, stride=1,
                padding=cheap_kernel // 2,
                groups=half, bias=False,
            ),
            nn.BatchNorm2d(half),
            nn.SiLU(inplace=True),
        )

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        primary = self.primary(x)
        cheap = self.cheap(primary)
        return torch.cat([primary, cheap], dim=1)


class MSDCBlock(nn.Module):
    """Multi-Scale Depthwise Conv block with Ghost projection.

    Architecture: PWConv(in->hidden) -> DWConv5x5(stride) -> GhostConv(->out) + skip

    Args:
        in_channels:     Input channels.
        out_channels:    Output channels.
        stride:          Spatial stride for the depthwise layer (default 1).
        expand_ratio:    Expansion ratio for the hidden dimension (default 3).
        dw_kernel:       Depthwise kernel size (default 5).
        drop_path_rate:  Stochastic depth drop rate (default 0.0).
    """

    def __init__(
        self,
        in_channels: int,
        out_channels: int,
        stride: int = 1,
        expand_ratio: int = 3,
        dw_kernel: int = 5,
        drop_path_rate: float = 0.0,
    ):
        super().__init__()
        hidden = in_channels * expand_ratio
        self.use_skip = stride == 1 and in_channels == out_channels

        # Expansion: pointwise 1×1
        self.expand = nn.Sequential(
            nn.Conv2d(in_channels, hidden, kernel_size=1, bias=False),
            nn.BatchNorm2d(hidden),
            nn.SiLU(inplace=True),
        )

        # Depthwise: 5×5 spatial mixing
        self.depthwise = nn.Sequential(
            nn.Conv2d(
                hidden, hidden,
                kernel_size=dw_kernel, stride=stride,
                padding=dw_kernel // 2,
                groups=hidden, bias=False,
            ),
            nn.BatchNorm2d(hidden),
            nn.SiLU(inplace=True),
        )

        # Ghost projection (v2: 5×5 cheap kernel)
        if out_channels % 2 != 0:
            self.project = nn.Sequential(
                nn.Conv2d(hidden, out_channels, kernel_size=1, bias=False),
                nn.BatchNorm2d(out_channels),
            )
        else:
            self.project = GhostConv(hidden, out_channels, cheap_kernel=5)

        # Skip connection
        if not self.use_skip:
            self.skip = nn.Sequential(
                nn.Conv2d(in_channels, out_channels, kernel_size=1,
                          stride=stride, bias=False),
                nn.BatchNorm2d(out_channels),
            )
        else:
            self.skip = nn.Identity()

        # Stochastic depth
        self.drop_path = (
            DropPath(drop_path_rate)
            if drop_path_rate > 0.0 and self.use_skip
            else nn.Identity()
        )

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        out = self.expand(x)
        out = self.depthwise(out)
        out = self.project(out)
        skip = self.skip(x)
        return self.drop_path(out) + skip
