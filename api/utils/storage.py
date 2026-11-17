
import json
import os
import re
import uuid
from pathlib import Path

import pandas as pd


DATA_DIR = Path(
    os.getenv("DATA_DIR", "data")
).resolve()

DATA_DIR.mkdir(parents=True, exist_ok=True)


def create_dataset_id() -> str:
    return uuid.uuid4().hex


def get_dataset_dir(dataset_id: str) -> Path:
    if not isinstance(dataset_id, str):
        raise ValueError("Invalid dataset_id")

    if not re.fullmatch(r"[a-f0-9]{32}", dataset_id):
        raise ValueError("Invalid dataset_id")

    return DATA_DIR / dataset_id


def save_json(path: Path, data: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)

    temporary = path.with_suffix(".tmp")

    temporary.write_text(
        json.dumps(data, indent=2, ensure_ascii=False),
        encoding="utf-8"
    )

    temporary.replace(path)


def load_json(path: Path) -> dict:
    if not path.is_file():
        raise FileNotFoundError(str(path))

    return json.loads(path.read_text(encoding="utf-8"))


def load_initial_csv(dataset_id: str) -> pd.DataFrame:
    csv_path = get_dataset_dir(dataset_id) / "initial.csv"

    if not csv_path.is_file():
        raise FileNotFoundError("Initial CSV not found")

    df = pd.read_csv(csv_path).fillna("")

    if "name" not in df.columns:
        raise ValueError("Initial CSV requires a name column")

    return df
