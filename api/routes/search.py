import requests
import pandas as pd

from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse

from models.schemas import SearchRequest
from utils.enrichment import search_and_enrich
from utils.storage import (
    read_initial_csv,
    dataset_dir,
    read_json
)

router = APIRouter(tags=["Full Search"])


@router.post("/search")
def search_route(request: SearchRequest):

    df = read_initial_csv(request.dataset_id)
    path = dataset_dir(request.dataset_id)

    metadata = read_json(path / "metadata.json")

    available = set(
        metadata.get("available_attributes", [])
    )

    attributes = list(dict.fromkeys(
        request.attributes
    ))

    invalid = [
        attr for attr in attributes
        if attr not in available
    ]

    if invalid:
        raise HTTPException(
            status_code=400,
            detail={
                "error": "Attributes not discovered",
                "invalid": invalid,
                "available": sorted(available)
            }
        )

    enriched_entries = []

    for entry in df.to_dict(orient="records"):
        try:
            enriched = search_and_enrich(
                entry,
                attributes
            )

        except (requests.RequestException, RuntimeError):
            enriched = dict(entry)

            for attr in attributes:
                enriched[attr] = None
                enriched[f"{attr}_summary"] = ""
                enriched[f"{attr}_source"] = ""

        enriched_entries.append(enriched)

    result = pd.DataFrame(enriched_entries)
    output_path = path / "enriched.csv"

    result.to_csv(
        output_path,
        index=False
    )

    return FileResponse(
        path=output_path,
        filename="enriched.csv",
        media_type="text/csv",
        headers={
            "X-Dataset-ID": request.dataset_id,
            "X-Entry-Count": str(len(result))
        }
    )