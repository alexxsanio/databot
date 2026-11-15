import json
import uuid
from pathlib import Path

import pandas as pd
from fastapi import HTTPException

from core.config import DATA_DIR


def dataset_dir(dataset_id: str) -> Path:
    try:
        validated = str(uuid.UUID(dataset_id))
    except ValueError:
        raise HTTPException(400, "Invalid dataset_id")

    path = DATA_DIR / validated

    if not path.is_dir():
        raise HTTPException(404, "Dataset not found")

    return path


def read_initial_csv(dataset_id: str) -> pd.DataFrame:
    path = dataset_dir(dataset_id) / "initial.csv"

    if not path.exists():
        raise HTTPException(404, "Initial CSV not found")

    return pd.read_csv(path, dtype=str).fillna("")


def save_json(path: Path, data: dict):
    path.write_text(
        json.dumps(data, indent=2, ensure_ascii=False),
        encoding="utf-8"
    )


def read_json(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8"))