from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routes.init_search import router as init_router
from routes.expand_search import router as expand_router
from routes.search import router as search_router

app = FastAPI(title="Web Research API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=False,
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type"],
    expose_headers=[
        "X-Dataset-ID",
        "X-Available-Attributes",
        "X-Entry-Count"
    ]
)

app.include_router(init_router)
app.include_router(expand_router)
app.include_router(search_router)