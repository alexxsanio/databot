import requests
import pandas as pd

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

    expanded_df.to_csv(
        path / "expanded_sample.csv",
        index=False
    )

    metadata_path = path / "metadata.json"
    metadata = read_json(metadata_path)

    metadata["available_attributes"] = attributes

    save_json(metadata_path, metadata)

    return {
        "dataset_id": request.dataset_id,
        "sample_size": len(expanded_df),
        "available_attributes": attributes,
        "sample_results": expanded_df.where(
            pd.notna(expanded_df), None
        ).to_dict(orient="records")
    }


@router.get("/datasets/{dataset_id}/sample")
def download_sample(dataset_id: str):

    path = dataset_dir(dataset_id) / "expanded_sample.csv"

    if not path.exists():
        raise HTTPException(404, "Sample CSV not found")

    return FileResponse(
        path,
        filename="expanded_sample.csv",
        media_type="text/csv"
    )


@router.get("/datasets/{dataset_id}/metadata")
def get_metadata(dataset_id: str):

    path = dataset_dir(dataset_id) / "metadata.json"

    return read_json(path)