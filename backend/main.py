import logging
import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from config import settings
from db.session import engine
from models.base import Base
from api.routes import router
from services.scheduler import start_scheduler, stop_scheduler

logging.basicConfig(level=settings.log_level)


@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    start_scheduler()
    yield
    stop_scheduler()


app = FastAPI(
    title="Reputation Risk Intelligence Platform",
    description="AI-powered reputation risk monitoring for US banks",
    version="1.0.0",
    lifespan=lifespan,
)

# Allow frontend origins (local dev + production)
allowed_origins = [
    "http://localhost:5173",
    "http://localhost:3000",
    "https://johnnycchung.com",
    "https://www.johnnycchung.com",
]

# Add any custom origin from env
extra_origin = os.getenv("CORS_ORIGIN")
if extra_origin:
    allowed_origins.append(extra_origin)

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router)


@app.get("/health")
def health():
    return {"status": "ok", "version": "1.0.0"}
