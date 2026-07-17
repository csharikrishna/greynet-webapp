"""
GrayNet v2 — Full Assembled Model

10-stage grayscale-native CNN backbone.

v2 channel schedule (width_mult=1.0):
  Stage 1:  Stem       1  -> 24         (224->112)
  Stage 2:  ACE        24ch
  Stage 3:  TEB        24 -> 64         (expansion!)
  Stage 4:  FAM-Fine   64ch at 112x112
  Stage 5a: MSDC-A x2  64 -> 96   s=2  (112->56)
  Stage 5b: SFA        96ch             (standalone)
  Stage 5c: MSDC-B x2  96 -> 160  s=2  (56->28)
  Stage 5d: CBAM++     160ch
  Stage 5e: MSDC-C x1  160 -> 240 s=2  (28->14)
  Stage 5f: FAM-Coarse 240ch at 14x14
  Stage 6:  Head       240 -> 320 -> classes

Key v2 improvements:
  - TEB expands 24->64 (was 16->16): 4x more texture features
  - ACE gain range (0,2): contrast amplification for faint lesions
  - CBAM++ multiplication fusion: strict consensus gating
  - FAM MLP gate x freq_mask: per-image adaptive spectral filtering
  - Ghost 5x5 cheap ops: wider texture receptive field
  - Fewer, wider MSDC blocks (2+2+1=5 vs 2+3+2=7)
"""

import math
import torch
import torch.nn as nn

from .stem import GrayscaleStem
from .ace import ACE
from .teb import TEB
from .msdc import MSDCBlock
from .fam import FAM
from .sfa import SFA
from .cbam import CBAMPlusPlus
from .head import ClassificationHead


def _make_divisible(v, divisor=8, min_value=None):
    """Ensure channel count is divisible by divisor."""
    if min_value is None:
        min_value = divisor
    new_v = max(min_value, int(v + divisor / 2) // divisor * divisor)
    if new_v < 0.9 * v:
        new_v += divisor
    return new_v


class GrayNet(nn.Module):
    """GrayNet v2 — Grayscale-native CNN backbone.

    Args:
        in_channels:    Input channels (default 1).
        num_classes:    Number of classification outputs (default 4).
        width_mult:     Width multiplier for channel scaling (default 1.0).
        noise_mode:     'mri' or 'sar' for SFA pooling window (default 'mri').
        dropout:        Dropout rate in classification head (default 0.2).
        input_size:     Expected input spatial size (default 224).
        drop_path_rate: Maximum stochastic depth rate (default 0.0).
    """

    BASE_CHANNELS = {
        "stem": 24,
        "texture": 64,
        "mid1": 96,
        "mid2": 192,
        "deep": 280,
        "embed": 360,
    }

    def __init__(self, in_channels=1, num_classes=4, width_mult=1.0,
                 noise_mode="mri", dropout=0.2, input_size=224,
                 drop_path_rate=0.0):
        super().__init__()
        self.width_mult = width_mult

        def ch(c):
            return _make_divisible(c * width_mult)

        c_stem = ch(self.BASE_CHANNELS["stem"])     # 24
        c_tex  = ch(self.BASE_CHANNELS["texture"])   # 64
        c_mid1 = ch(self.BASE_CHANNELS["mid1"])      # 96
        c_mid2 = ch(self.BASE_CHANNELS["mid2"])      # 160
        c_deep = ch(self.BASE_CHANNELS["deep"])      # 240
        c_embed = ch(self.BASE_CHANNELS["embed"])    # 320

        # Spatial sizes after each stride-2
        s1 = input_size // 2    # 112 (after stem)
        s2 = s1 // 2            # 56  (after MSDC-A)
        s3 = s2 // 2            # 28  (after MSDC-B)
        s4 = s3 // 2            # 14  (after MSDC-C)

        # DropPath: linearly increasing rates for 5 MSDC blocks (2+2+1)
        num_blocks = 5
        dpr = [drop_path_rate * i / max(num_blocks - 1, 1)
               for i in range(num_blocks)]

        # ── Stage 1: Grayscale Stem (1 -> stem_ch, stride 2) ──
        self.stem = GrayscaleStem(in_channels=in_channels, out_channels=c_stem)

        # ── Stage 2: Adaptive Contrast Enhancement ──
        self.ace = ACE(channels=c_stem)

        # ── Stage 3: Texture Extraction Block (stem_ch -> tex_ch) ──
        self.teb = TEB(in_channels=c_stem, out_channels=c_tex)

        # ── Stage 4: FAM-Fine at 112×112 (before first downsample) ──
        self.fam_fine = FAM(channels=c_tex, reduction=4)

        # ── Stage 5a: MSDC-A x2 (tex -> mid1, stride 2) ──
        self.msdc_a = nn.Sequential(
            MSDCBlock(c_tex, c_mid1, stride=2, expand_ratio=3,
                      drop_path_rate=dpr[0]),
            MSDCBlock(c_mid1, c_mid1, stride=1, expand_ratio=3,
                      drop_path_rate=dpr[1]),
        )

        # ── Stage 5b: SFA (standalone, at mid1 channels) ──
        self.sfa = SFA(channels=c_mid1, noise_mode=noise_mode)

        # ── Stage 5c: MSDC-B x2 (mid1 -> mid2, stride 2) ──
        self.msdc_b = nn.Sequential(
            MSDCBlock(c_mid1, c_mid2, stride=2, expand_ratio=3,
                      drop_path_rate=dpr[2]),
            MSDCBlock(c_mid2, c_mid2, stride=1, expand_ratio=3,
                      drop_path_rate=dpr[3]),
        )

        # ── Stage 5d: CBAM++ attention ──
        self.cbam = CBAMPlusPlus(channels=c_mid2, reduction=12)

        # ── Stage 5e: MSDC-C x1 (mid2 -> deep, stride 2) ──
        self.msdc_c = MSDCBlock(c_mid2, c_deep, stride=2, expand_ratio=3,
                                drop_path_rate=dpr[4])

        # ── Stage 5f: FAM-Coarse at 14×14 ──
        self.fam_coarse = FAM(channels=c_deep, reduction=8)

        # ── Stage 6: Classification Head ──
        self.head = ClassificationHead(
            in_channels=c_deep, embed_dim=c_embed,
            num_classes=num_classes, dropout=dropout,
        )

        self._init_weights()

    def _init_weights(self):
        """Kaiming initialization for conv layers, constant for BN."""
        for m in self.modules():
            if isinstance(m, nn.Conv2d):
                nn.init.kaiming_normal_(m.weight, mode="fan_out",
                                        nonlinearity="relu")
                if m.bias is not None:
                    nn.init.zeros_(m.bias)
            elif isinstance(m, nn.BatchNorm2d):
                nn.init.ones_(m.weight)
                nn.init.zeros_(m.bias)
            elif isinstance(m, nn.Linear):
                nn.init.normal_(m.weight, 0, 0.01)
                if m.bias is not None:
                    nn.init.zeros_(m.bias)

    def forward_features(self, x):
        """Extract features without classification head."""
        x = self.stem(x)        # (B,1,H,H)   -> (B,24,H/2,H/2)
        x = self.ace(x)         # contrast normalization
        x = self.teb(x)         # (B,24,H/2)   -> (B,64,H/2)
        x = self.fam_fine(x)    # frequency attention (fine)
        x = self.msdc_a(x)      # (B,64,H/2)   -> (B,96,H/4)
        x = self.sfa(x)         # statistical features
        x = self.msdc_b(x)      # (B,96,H/4)   -> (B,160,H/8)
        x = self.cbam(x)        # channel+spatial attention
        x = self.msdc_c(x)      # (B,160,H/8)  -> (B,240,H/16)
        x = self.fam_coarse(x)  # frequency attention (coarse)
        return x

    def forward(self, x):
        """Full forward pass: features + classification."""
        x = self.forward_features(x)
        return self.head(x)

    def get_stage_params(self):
        """Return parameter count per stage for auditing."""
        stages = {
            "Stage 1 - Stem": self.stem,
            "Stage 2 - ACE": self.ace,
            "Stage 3 - TEB": self.teb,
            "Stage 4 - FAM-Fine": self.fam_fine,
            "Stage 5a - MSDC-A": self.msdc_a,
            "Stage 5b - SFA": self.sfa,
            "Stage 5c - MSDC-B": self.msdc_b,
            "Stage 5d - CBAM++": self.cbam,
            "Stage 5e - MSDC-C": self.msdc_c,
            "Stage 5f - FAM-Coarse": self.fam_coarse,
            "Stage 6 - Head": self.head,
        }
        counts = {}
        for name, module in stages.items():
            counts[name] = sum(p.numel() for p in module.parameters())
        counts["TOTAL"] = sum(p.numel() for p in self.parameters())
        return counts

    def freeze_early_stages(self):
        """Freeze Stages 1-3 for cross-domain transfer."""
        for module in [self.stem, self.ace, self.teb]:
            for param in module.parameters():
                param.requires_grad = False

    def get_fam_lr_params(self, base_lr, fam_lr_scale=0.1):
        """Get param groups with reduced LR for FAM freq_mask parameters."""
        fam_params = []
        other_params = []
        for name, param in self.named_parameters():
            if not param.requires_grad:
                continue
            if "freq_mask" in name:
                fam_params.append(param)
            else:
                other_params.append(param)
        return [
            {"params": other_params, "lr": base_lr},
            {"params": fam_params, "lr": base_lr * fam_lr_scale},
        ]


def graynet_v2(num_classes=4, noise_mode="mri", **kwargs):
    """GrayNet v2 at width_mult=1.0."""
    return GrayNet(
        num_classes=num_classes, width_mult=1.0,
        noise_mode=noise_mode, **kwargs,
    )


def graynet_v2_small(num_classes=4, noise_mode="mri", **kwargs):
    """GrayNet v2-Small at width_mult=0.75."""
    return GrayNet(
        num_classes=num_classes, width_mult=0.75,
        noise_mode=noise_mode, **kwargs,
    )


# Backward compatibility
graynet_v1 = graynet_v2
graynet_v1_small = graynet_v2_small
