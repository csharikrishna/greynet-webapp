"""
GrayNet v2 — Grayscale-Native CNN Backbone for Scientific Imagery.

A lightweight CNN backbone purpose-built for single-channel (grayscale)
scientific imagery. At ~800K parameters (width_mult=1.0), GrayNet targets
the parameter band between MobileNetV3-Small and EfficientNet-Lite0 while
delivering representational capability matched to physics-generated data.

Modules:
    - GrayscaleStem:  Standard Conv stem expanding 1->24 channels
    - ACE:            Adaptive Contrast Enhancement v2 (gain 0-2)
    - TEB:            Texture Extraction Block (24->64 expansion)
    - MSDCBlock:      Multi-Scale Depthwise Conv block (GhostNet-inspired)
    - FAM:            Frequency Attention Module (MLP gate x freq_mask)
    - SFA:            Statistical Feature Aggregator (entropy-gated)
    - CBAMPlusPlus:   CBAM++ with VarPool (multiplicative fusion)
    - GrayNet:        Full assembled model
"""

from .model import GrayNet, graynet_v2, graynet_v2_small

# Backward compatibility
graynet_v1 = graynet_v2
graynet_v1_small = graynet_v2_small

__version__ = "2.0.0"
__all__ = ["GrayNet", "graynet_v2", "graynet_v2_small"]
