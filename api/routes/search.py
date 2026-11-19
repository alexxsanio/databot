
import requests
import pandas as pd

from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse

from models.schemas import SearchRequest
from utils.enrichments import search_and_enrich

from utils.storage import (
    get_dataset_dir,
    load_initial_csv,
    load_json,
    save_json
)

router = APIRouter(tags=["Full Search"])


@router.post("/search")
def search_route(request: SearchRequest):
    try:
        df = load_initial_csv(
            request.dataset_id
        )

        dataset_path = get_dataset_dir(
            request.dataset_id
        )

        metadata_path = (
            dataset_path / "metadata.json"
        )

        metadata = load_json(metadata_path)

        available_attributes = set(
            metadata.get(
                "available_attributes",
                []
            )
        )

        requested_attributes = list(
            dict.fromkeys(request.attributes)
        )

        invalid_attributes = [
            attr
            for attr in requested_attributes
            if attr not in available_attributes
        ]

        if invalid_attributes:
            raise HTTPException(
                status_code=400,
                detail={
                    "error": (
                        "Some requested attributes "
                        "were not discovered"
                    ),
                    "invalid": invalid_attributes,
                    "available": sorted(
                        available_attributes
                    )
                }
            )

        enriched_entries = []
        failed_entries = []

        for entry in df.to_dict(
            orient="records"
        ):
            try:
                enriched = search_and_enrich(
                    entry=entry,
                    attributes=requested_attributes
                )

            except (
                requests.RequestException,
                RuntimeError
            ) as exc:
                failed_entries.append({
                    "entry_id": entry.get("entry_id"),
                    "error": str(exc)
                })

                enriched = dict(entry)

                for attr in requested_attributes:
                    enriched[attr] = None
                    enriched[f"{attr}_summary"] = ""
                    enriched[f"{attr}_source"] = ""

            enriched_entries.append(enriched)

        result = pd.DataFrame(
            enriched_entries
        )

        output_path = (
            dataset_path / "enriched.csv"
        )

        result.to_csv(
            output_path,
            index=False
        )

        metadata["requested_attributes"] = (
            requested_attributes
        )
        metadata["total_enriched"] = (
            len(result) - len(failed_entries)
        )
        metadata["failed_entries"] = failed_entries

        metadata["status"] = (
            "completed"
            if not failed_entries
            else "completed_with_errors"
        )

        save_json(
            metadata_path,
            metadata
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

    except HTTPException:
        raise

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
