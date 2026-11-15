import requests

from core.config import GOOGLE_API_KEY, GOOGLE_CX


def google_search(
    query: str,
    num_results: int = 10
) -> list[dict]:

    if not GOOGLE_API_KEY or not GOOGLE_CX:
        raise RuntimeError(
            "Google Search API credentials are missing"
        )

    response = requests.get(
        "https://customsearch.googleapis.com/customsearch/v1",
        params={
            "key": GOOGLE_API_KEY,
            "cx": GOOGLE_CX,
            "q": query,
            "num": min(num_results, 10)
        },
        timeout=20
    )

    response.raise_for_status()

    items = response.json().get("items", [])

    return [
        {
            "title": item.get("title", ""),
            "snippet": item.get("snippet", ""),
            "url": item.get("link", "")
        }
        for item in items
    ]