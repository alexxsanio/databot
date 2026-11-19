import os

from dotenv import load_dotenv
from openai import OpenAI

load_dotenv()

OPENAI_MODEL = os.getenv(
    "OPENAI_MODEL",
    "gpt-4.1-mini"
)

GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")
GOOGLE_SEARCH_ENGINE_ID = os.getenv(
    "GOOGLE_SEARCH_ENGINE_ID"
)

REQUEST_TIMEOUT = 20
GOOGLE_RESULTS_PER_QUERY = 5

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 "
        "(compatible; ResearchScraper/1.0)"
    )
}

client = OpenAI()