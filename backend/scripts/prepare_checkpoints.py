"""
Copy the 10 published checkpoints out of a local clone of the GreyNet
training repo (the one with runs/) into backend/checkpoints/, renamed to
match what model_registry.py expects.

Usage:
    python scripts/prepare_checkpoints.py /path/to/GreyNet
"""

import shutil
import sys
from pathlib import Path

# (source path relative to the GreyNet repo root, destination relative to backend/checkpoints/)
MAPPING = [
    ("runs/master_cleaned/fold_1/best_model.pt", "master_cleaned/fold_1_best_model.pt"),
    ("runs/master_v2_cleaned/fold_1/best_model.pt", "master_v2_cleaned/fold_1_best_model.pt"),
    ("runs/no_kd_cleaned_250k/fold_1/best_model.pt", "no_kd_cleaned_250k/fold_1_best_model.pt"),
    ("runs/student_cleaned_250k/best_student.pt", "student_cleaned_250k/best_student.pt"),
    ("runs/no_kd_cleaned_100k/fold_1/best_model.pt", "no_kd_cleaned_100k/fold_1_best_model.pt"),
    ("runs/student_kfold_100k_cleaned/best_student.pt", "student_kfold_100k_cleaned/best_student.pt"),
    ("runs/no_kd_cleaned_50k/fold_1/best_model.pt", "no_kd_cleaned_50k/fold_1_best_model.pt"),
    ("runs/student_kfold_50k_cleaned/best_student.pt", "student_kfold_50k_cleaned/best_student.pt"),
    ("runs/no_kd_cleaned_25k/fold_1/best_model.pt", "no_kd_cleaned_25k/fold_1_best_model.pt"),
    ("runs/student_kfold_25k_cleaned/best_student.pt", "student_kfold_25k_cleaned/best_student.pt"),
]


def main():
    if len(sys.argv) != 2:
        print(__doc__)
        sys.exit(1)

    src_root = Path(sys.argv[1])
    dst_root = Path(__file__).parent.parent / "checkpoints"

    ok, missing = 0, []
    for rel_src, rel_dst in MAPPING:
        src = src_root / rel_src
        dst = dst_root / rel_dst
        if not src.exists():
            missing.append(str(src))
            continue
        dst.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(src, dst)
        print(f"copied {rel_src} -> checkpoints/{rel_dst}")
        ok += 1

    print(f"\n{ok}/{len(MAPPING)} checkpoints copied.")
    if missing:
        print("Missing (edit model_registry.py or this script's MAPPING if your run names differ):")
        for m in missing:
            print(f"  - {m}")


if __name__ == "__main__":
    main()
