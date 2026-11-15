import os
from pathlib import Path
from dotenv import load_dotenv
from openai import OpenAI

load_dotenv()

BASE_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = BASE_DIR / "data" / "datasets"
DATA_DIR.mkdir(parents=True, exist_ok=True)

GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")
GOOGLE_CX = os.getenv("GOOGLE_SEARCH_ENGINE_ID")
OPENAI_MODEL = os.getenv("OPENAI_MODEL", "gpt-4.1-mini")

HEADERS = {
    "User-Agent": "Mozilla/5.0 (compatible; ResearchScraper/1.0)"
}

client = OpenAI()