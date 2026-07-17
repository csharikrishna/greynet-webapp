"""
Model registry — maps each of the 10 benchmarked GrayNet checkpoints to
the exact constructor arguments used to train it (cross-checked against
configs/*.yaml in the GreyNet repo) and to a checkpoint file path.

IMPORTANT: this repo does not ship the trained .pt weight files (they're
too large / not meant for git). Copy the relevant checkpoints from your
GreyNet `runs/` directory into backend/checkpoints/ before deploying,
using the paths below as a guide, or edit CHECKPOINT_DIR / the `path`
fields to point at wherever you store them (e.g. an S3/R2 bucket you
download from at container startup).

Each run in GreyNet's runs/ folder is a 5-fold CV run; fold_1's
checkpoint is used here as the representative deployed weight for each
tier. Swap in a different fold, an EMA/SWA checkpoint, or an ensemble
across folds if you'd rather serve that.
"""

from dataclasses import dataclass, field
from pathlib import Path

CHECKPOINT_DIR = Path(__file__).parent.parent / "checkpoints"

CLASS_NAMES = ["glioma", "meningioma", "notumor", "pituitary"]


@dataclass
class ModelEntry:
    id: str
    name: str
    width_mult: float
    dropout: float
    checkpoint_path: Path
    reported_params_k: float
    reported_std_acc: float
    quantized: bool = False
    noise_mode: str = "mri"
    num_classes: int = 4
    input_size: int = 256


from typing import Dict

MODEL_REGISTRY: Dict[str, ModelEntry] = {
    e.id: e
    for e in [
        ModelEntry(
            id="master-v1",
            name="Master v1",
            width_mult=1.0,
            dropout=0.15,
            checkpoint_path=CHECKPOINT_DIR / "master_cleaned" / "fold_1_best_model.pt",
            reported_params_k=813.1,
            reported_std_acc=97.81,
        ),
        ModelEntry(
            id="master-v2",
            name="Master v2",
            width_mult=1.0,
            dropout=0.05,
            checkpoint_path=CHECKPOINT_DIR / "master_v2_cleaned" / "fold_1_best_model.pt",
            reported_params_k=813.1,
            reported_std_acc=98.11,
        ),
        ModelEntry(
            id="lite-nokd",
            name="Lite No-KD",
            width_mult=0.53,
            dropout=0.05,
            checkpoint_path=CHECKPOINT_DIR / "no_kd_cleaned_250k" / "fold_1_best_model.pt",
            reported_params_k=249.5,
            reported_std_acc=97.87,
        ),
        ModelEntry(
            id="lite-kd",
            name="Lite KD",
            width_mult=0.53,
            dropout=0.05,
            checkpoint_path=CHECKPOINT_DIR / "student_cleaned_250k" / "best_student.pt",
            reported_params_k=249.5,
            reported_std_acc=98.03,
        ),
        ModelEntry(
            id="mini-nokd",
            name="Mini No-KD",
            width_mult=0.35,
            dropout=0.0,
            checkpoint_path=CHECKPOINT_DIR / "no_kd_cleaned_100k" / "fold_1_best_model.pt",
            reported_params_k=110.5,
            reported_std_acc=97.87,
        ),
        ModelEntry(
            id="mini-kd",
            name="Mini KD",
            width_mult=0.35,
            dropout=0.0,
            checkpoint_path=CHECKPOINT_DIR / "student_kfold_100k_cleaned" / "best_student.pt",
            reported_params_k=110.5,
            reported_std_acc=98.19,
        ),
        ModelEntry(
            id="pico-nokd",
            name="Pico No-KD",
            width_mult=0.20,
            dropout=0.0,
            checkpoint_path=CHECKPOINT_DIR / "no_kd_cleaned_50k" / "fold_1_best_model.pt",
            reported_params_k=52.9,
            reported_std_acc=97.66,
        ),
        ModelEntry(
            id="pico-kd",
            name="Pico KD",
            width_mult=0.20,
            dropout=0.0,
            checkpoint_path=CHECKPOINT_DIR / "student_kfold_50k_cleaned" / "best_student.pt",
            reported_params_k=52.9,
            reported_std_acc=97.85,
        ),
        ModelEntry(
            id="femto-nokd",
            name="Femto No-KD",
            width_mult=0.10,
            dropout=0.0,
            checkpoint_path=CHECKPOINT_DIR / "no_kd_cleaned_25k" / "fold_1_best_model.pt",
            reported_params_k=24.7,
            reported_std_acc=96.94,
        ),
        ModelEntry(
            id="femto-kd",
            name="Femto KD",
            width_mult=0.10,
            dropout=0.0,
            checkpoint_path=CHECKPOINT_DIR / "student_kfold_25k_cleaned" / "best_student.pt",
            reported_params_k=24.7,
            reported_std_acc=97.01,
        ),
    ]
}
