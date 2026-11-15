from fastapi import FastAPI

from routes.init_search import router as init_search_router
from routes.expand_search import router as expand_search_router
from routes.search import router as search_router

app = FastAPI(
    title="HTML Scraping API",
    version="1.0.0"
)

app.include_router(init_search_router)
app.include_router(expand_search_router)
app.include_router(search_router)


@app.get("/")
def root():
    return {
        "message": "HTML Scraping API",
        "docs": "/docs"
    }