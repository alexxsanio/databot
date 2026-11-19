from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routes.init_search import router as init_router
from routes.expand_search import router as expand_router
from routes.search import router as search_router


app = FastAPI(
    title="Web Research API",
    description=(
        "HTML webpage scraping, attribute discovery, "
        "and search-based dataset enrichment"
    ),
    version="1.0.0"
)


app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://10.0.0.54:3000",
    ],
    allow_credentials=False,
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type"],
    expose_headers=[
        "X-Dataset-ID",
        "X-Entry-Count",
        "X-Available-Attributes"
    ]
)


app.include_router(init_router)
app.include_router(expand_router)
app.include_router(search_router)


@app.get("/")
def root():
    return {
        "name": "Web Research API",
        "status": "running",
        "endpoints": [
            "/init_search",
            "/expand_search",
            "/search"
        ]
    }


@app.get("/health")
def health():
    return {
        "status": "ok"
    }