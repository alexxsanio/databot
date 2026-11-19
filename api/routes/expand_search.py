
import json

import requests

from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse

from models.schemas import ExpandSearchRequest
from utils.enrichments import expand_searching_attr

from utils.storage import (
    get_dataset_dir,
    load_initial_csv,
    load_json,
    save_json
)

router = APIRouter(tags=["Expand Search"])


@router.post("/expand_search")
def expand_search_route(request: ExpandSearchRequest):
    try:
        df = load_initial_csv(
            request.dataset_id
        )

        expanded_df, attributes = expand_searching_attr(
            df=df,
            sample_size=request.sample_size,
            description=request.description
        )

        dataset_path = get_dataset_dir(
            request.dataset_id
        )

        output_path = (
            dataset_path / "expanded_sample.csv"
        )

        expanded_df.to_csv(
            output_path,
            index=False
        )

        metadata_path = (
            dataset_path / "metadata.json"
        )

        metadata = load_json(metadata_path)

        metadata["available_attributes"] = attributes
        metadata["sample_size"] = len(expanded_df)
        metadata["research_objective"] = (
            request.description
        )
        metadata["status"] = "expanded"

        save_json(
            metadata_path,
            metadata
        )

        return FileResponse(
            path=output_path,
            filename="expanded_sample.csv",
            media_type="text/csv",
            headers={
                "X-Dataset-ID": request.dataset_id,
                "X-Entry-Count": str(len(expanded_df)),
                "X-Available-Attributes": json.dumps(
                    attributes
                )
            }
        )

    except FileNotFoundError as exc:
        raise HTTPException(
            status_code=404,
            detail=str(exc)
        ) from exc

    except ValueError as exc:
        raise HTTPException(
            status_code=400,
            detail=str(exc)
        ) from exc

    except (requests.RequestException, RuntimeError) as exc:
        raise HTTPException(
            status_code=502,
            detail=str(exc)
        ) from exc


@router.get("/datasets/{dataset_id}/sample")
def download_sample(dataset_id: str):
    try:
        path = (
            get_dataset_dir(dataset_id)
            / "expanded_sample.csv"
        )

        if not path.is_file():
            raise FileNotFoundError(
                "Expanded sample CSV not found"
            )

        return FileResponse(
            path=path,
            filename="expanded_sample.csv",
            media_type="text/csv"
        )

    except ValueError as exc:
        raise HTTPException(
            status_code=400,
            detail=str(exc)
        ) from exc

    except FileNotFoundError as exc:
        raise HTTPException(
            status_code=404,
            detail=str(exc)
        ) from exc


@router.get("/datasets/{dataset_id}/metadata")
def get_metadata(dataset_id: str):
    try:
        metadata_path = (
            get_dataset_dir(dataset_id)
            / "metadata.json"
        )

        return load_json(metadata_path)

    except ValueError as exc:
        raise HTTPException(
            status_code=400,
            detail=str(exc)
        ) from exc

    except FileNotFoundError as exc:
        raise HTTPException(
            status_code=404,
            detail=str(exc)
        ) from exc
