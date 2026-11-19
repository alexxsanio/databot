import traceback
import requests

from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse

from models.schemas import InitSearchRequest
from utils.storage import create_dataset_id
from utils.scraping import init_search, save_init_search

router = APIRouter(tags=["Initial Search"])


@router.post("/init_search")
def init_search_route(request: InitSearchRequest):
    print("Received request:", request)
    try:
        print("Received webpages:", request.webpages)
        print("Received selector:", request.selector)

        entries, suggestions = init_search(
            webpages=request.webpages,
            selector=request.selector
        )

        print("Extracted entries:", len(entries))

        if not entries:
            raise HTTPException(
                status_code=422,
                detail="No entries found"
            )

        dataset_id = create_dataset_id()

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

    except ValueError as exc:
        traceback.print_exc()

        raise HTTPException(
            status_code=400,
            detail=str(exc)
        ) from exc

    except requests.RequestException as exc:
        traceback.print_exc()

        raise HTTPException(
            status_code=502,
            detail=str(exc)
        ) from exc