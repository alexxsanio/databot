import requests

from core.config import (
    GOOGLE_API_KEY,
    GOOGLE_SEARCH_ENGINE_ID,
    GOOGLE_RESULTS_PER_QUERY,
    REQUEST_TIMEOUT
)


def google_search(
    query: str,
    num_results: int = GOOGLE_RESULTS_PER_QUERY
) -> list[dict]:

    if not GOOGLE_API_KEY:
        raise RuntimeError(
            "GOOGLE_API_KEY is missing"
        )

    if not GOOGLE_SEARCH_ENGINE_ID:
        raise RuntimeError(
            "GOOGLE_SEARCH_ENGINE_ID is missing"
        )

    response = requests.get(
        "https://customsearch.googleapis.com/customsearch/v1",
        params={
            "key": GOOGLE_API_KEY,
            "cx": GOOGLE_SEARCH_ENGINE_ID,
            "q": query,
            "num": min(max(num_results, 1), 10)
        },
        timeout=REQUEST_TIMEOUT
    )

    response.raise_for_status()

    results = response.json().get("items", [])

    return [
        {
            "title": result.get("title", ""),
            "snippet": result.get("snippet", ""),
            "url": result.get("link", "")
        }
        for result in results
    ]