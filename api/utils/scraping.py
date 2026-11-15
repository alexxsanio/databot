import re
from collections import Counter
from urllib.parse import urljoin, urlparse

import pandas as pd
import requests
from bs4 import BeautifulSoup

from core.config import DATA_DIR, HEADERS
from utils.storage import save_json


def clean_text(text: str) -> str:
    return re.sub(r"\s+", " ", text).strip()


def suggest_elements(soup: BeautifulSoup) -> list[dict]:
    counts = Counter()

    for tag in soup.find_all(["article", "li", "div", "tr"]):
        if tag.name == "tr":
            counts["table tr"] += 1

        for css_class in tag.get("class", []):
            if re.fullmatch(r"[A-Za-z_][A-Za-z0-9_-]*", css_class):
                counts[f"{tag.name}.{css_class}"] += 1

    return [
        {"selector": selector, "count": count}
        for selector, count in counts.most_common(20)
        if count >= 2
    ]


def extract_entry(element, base_url: str) -> dict | None:
    anchor = element.find("a", href=True)
    heading = element.find(
        ["h1", "h2", "h3", "h4", "strong"]
    )

    if heading:
        name = clean_text(heading.get_text(" ", strip=True))
    elif anchor:
        name = clean_text(anchor.get_text(" ", strip=True))
    else:
        name = ""

    description = clean_text(
        element.get_text(" ", strip=True)
    )[:500]

    if not name:
        name = description[:100]

    if not name:
        return None

    url = (
        urljoin(base_url, anchor["href"])
        if anchor else base_url
    )

    return {
        "name": name,
        "description": description,
        "url": url,
        "source_page": base_url
    }


def init_search(
    webpages: list[str],
    selector: str | None = None
) -> tuple[list[dict], dict]:

    entries = []
    suggestions_by_page = {}

    for webpage in webpages:
        parsed = urlparse(webpage)

        if parsed.scheme not in {"http", "https"}:
            raise ValueError("Only HTTP(S) URLs are supported")

        response = requests.get(
            webpage,
            headers=HEADERS,
            timeout=20
        )
        response.raise_for_status()

        soup = BeautifulSoup(response.text, "html.parser")

        suggestions = suggest_elements(soup)
        suggestions_by_page[webpage] = suggestions

        if selector:
            selected = soup.select(selector)
        elif soup.select("table tbody tr"):
            selected = soup.select("table tbody tr")
        elif soup.select("article"):
            selected = soup.select("article")
        elif suggestions:
            selected = soup.select(suggestions[0]["selector"])
        else:
            selected = soup.select("main a[href]")

        for element in selected:
            entry = extract_entry(element, webpage)
            if entry:
                entries.append(entry)

    seen = set()
    unique_entries = []

    for entry in entries:
        key = (entry["name"], entry["url"])

        if key not in seen:
            seen.add(key)
            unique_entries.append(entry)

    for index, entry in enumerate(unique_entries, 1):
        entry["entry_id"] = index

    return unique_entries, suggestions_by_page


def save_init_search(
    entries: list[dict],
    dataset_id: str,
    suggestions: dict
):
    path = DATA_DIR / dataset_id
    path.mkdir(parents=True, exist_ok=True)

    csv_path = path / "initial.csv"

    columns = [
        "entry_id",
        "name",
        "description",
        "url",
        "source_page"
    ]

    pd.DataFrame(entries, columns=columns).to_csv(
        csv_path,
        index=False
    )

    save_json(
        path / "metadata.json",
        {
            "dataset_id": dataset_id,
            "suggested_elements": suggestions,
            "available_attributes": []
        }
    )

    return csv_path