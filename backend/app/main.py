from contextlib import asynccontextmanager
import logging
import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database.db import init_db
from app.api import templates, generation

# Make diagram_service and generation logs visible in uvicorn output
logging.basicConfig(level=logging.INFO)
logging.getLogger("app.services.diagram_service").setLevel(logging.DEBUG)
logging.getLogger("app.api.generation").setLevel(logging.DEBUG)


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    os.makedirs(os.getenv("TEMPLATES_PATH", "/data/templates"), exist_ok=True)
    yield


app = FastAPI(title="Document Generator API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(templates.router)
app.include_router(generation.router)


@app.get("/health")
def health():
    return {"status": "ok"}
