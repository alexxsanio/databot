import uuid

import requests
from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse

from models.schemas import InitSearchRequest
from utils.scraping import init_search, save_init_search

router = APIRouter(tags=["Initial Search"])


@router.post("/init_search")
def init_search_route(request: InitSearchRequest):
    try:
        entries, suggestions = init_search(
            webpages=request.webpages,
            selector=request.selector
        )

        if not entries:
            raise HTTPException(
                status_code=422,
                detail="No entries found. Try a CSS selector."
            )

        dataset_id = str(uuid.uuid4())

        csv_path = save_init_search(
            entries=entries,
            dataset_id=dataset_id,
            suggestions=suggestions
        )

        return FileResponse(
            path=csv_path,
            filename="initial.csv",
            media_type="text/csv",
            headers={
                "X-Dataset-ID": dataset_id,
                "X-Entry-Count": str(len(entries))
            }
        )

    except requests.RequestException as exc:
        raise HTTPException(
            status_code=502,
            detail=str(exc)
        )
    except ValueError as exc:
        raise HTTPException(
            status_code=400,
            detail=str(exc)
        )