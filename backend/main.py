import os
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables BEFORE importing other modules
env_path = Path(__file__).parent / '.env'
load_dotenv(env_path)

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from database import init_db
from routers import catalog, orders, ai_assistant
from seed_db import seed_products


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Initialize database and seed if empty
    init_db()
    seed_products()
    yield
    # Shutdown: cleanup if needed


app = FastAPI(
    title="Jalapeño API",
    description="AI-powered food ordering system with natural language processing",
    version="1.0.0",
    lifespan=lifespan
)

# Configure CORS for React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:3000",
        "http://localhost:80",
        "https://dknu09xe73cdt.cloudfront.net",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(catalog.router, prefix="/api", tags=["Catalog"])
app.include_router(orders.router, prefix="/api", tags=["Orders"])
app.include_router(ai_assistant.router, prefix="/api", tags=["AI Assistant"])


@app.get("/")
async def root():
    return {
        "message": "Jalapeño API",
        "docs": "/docs",
        "endpoints": {
            "products": "/api/products",
            "categories": "/api/categories",
            "orders": "/api/orders",
            "chat": "/api/chat",
            "voice": "/api/voice"
        }
    }


@app.get("/health")
async def health_check():
    return {"status": "healthy"}
