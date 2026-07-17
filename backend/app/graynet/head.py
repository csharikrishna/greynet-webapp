"""
Stage 9 — Classification Head v2

Retained from v1: Dual-pool (Avg+Max) head. This was empirically
better than GAP-only (v2 spec) because MaxPool captures peak
discriminative features critical for glioma vs meningioma.

v2 change: embed_dim default lowered to match new deep channel count.
"""

import torch
import torch.nn as nn


class ClassificationHead(nn.Module):
    """Dual-pool classification head (Avg + Max).

    Args:
        in_channels: Input channels from backbone.
        embed_dim:   Embedding dimension before classifier.
        num_classes: Number of output classes.
        dropout:     Dropout rate (default 0.2).
    """

    def __init__(self, in_channels=240, embed_dim=320,
                 num_classes=4, dropout=0.2):
        super().__init__()
        self.conv = nn.Sequential(
            nn.Conv2d(in_channels, embed_dim, kernel_size=1, bias=False),
            nn.BatchNorm2d(embed_dim),
            nn.SiLU(inplace=True),
        )
        self.avg_pool = nn.AdaptiveAvgPool2d(1)
        self.max_pool = nn.AdaptiveMaxPool2d(1)
        self.drop = nn.Dropout(p=dropout)
        self.fc = nn.Linear(embed_dim, num_classes)

    def forward(self, x):
        x = self.conv(x)
        avg = self.avg_pool(x).flatten(1)
        mx = self.max_pool(x).flatten(1)
        x = avg + mx
        x = self.drop(x)
        return self.fc(x)
