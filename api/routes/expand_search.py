
import json

import pandas as pd
import requests

from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse

from models.schemas import ExpandSearchRequest
from utils.enrichment import expand_searching_attr
from utils.storage import (
    read_initial_csv,
    dataset_dir,
    read_json,
    save_json
)

router = APIRouter(tags=["Expand Search"])


@router.post("/expand_search")
def expand_search_route(request: ExpandSearchRequest):
    df = read_initial_csv(request.dataset_id)

    try:
        expanded_df, attributes = expand_searching_attr(
            df,
            sample_size=request.sample_size,
            description=request.description
        )

    except (requests.RequestException, RuntimeError) as exc:
        raise HTTPException(
            status_code=502,
            detail=str(exc)
        )

    except ValueError as exc:
        raise HTTPException(
            status_code=400,
            detail=str(exc)
        )

    path = dataset_dir(request.dataset_id)

    output_path = path / "expanded_sample.csv"

    expanded_df.to_csv(
        output_path,
        index=False
    )

    metadata_path = path / "metadata.json"
    metadata = read_json(metadata_path)

    metadata["available_attributes"] = attributes

    save_json(metadata_path, metadata)

    return FileResponse(
        path=output_path,
        filename="expanded_sample.csv",
        media_type="text/csv",
        headers={
            "X-Dataset-ID": request.dataset_id,
            "X-Entry-Count": str(len(expanded_df)),
            "X-Available-Attributes": json.dumps(attributes)
        }
    )
