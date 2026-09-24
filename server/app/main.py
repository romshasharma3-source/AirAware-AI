
import os

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import router

load_dotenv()

# --------------------------------------------------
# FastAPI Server Configuration
# --------------------------------------------------

app = FastAPI(
    title="AirAware AI",
    description="AI-powered Air Quality Assistant",
    version="1.0.0",
)

# --------------------------------------------------
# CORS Configuration
# --------------------------------------------------

allowed_origins = [
    origin.strip()
    for origin in os.getenv(
        "ALLOWED_ORIGINS",
        "http://localhost:5173,http://localhost:5174",
    ).split(",")
    if origin.strip()
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --------------------------------------------------
# Register API Routes
# --------------------------------------------------

app.include_router(router)


# --------------------------------------------------
# Server Routes
# --------------------------------------------------

@app.get("/")
async def root():
    return {
        "message": "AirAware AI API is running",
        "docs": "/docs",
        "version": "1.0.0",
    }


@app.get("/health")
async def health():
    return {
        "status": "healthy",
        "service": "AirAware AI",
    }

@app.get("/docs", include_in_schema=False)
async def docs_redirect():
    return {
        "message": "Open the interactive API documentation at /docs"
    }