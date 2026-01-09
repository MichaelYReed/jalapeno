# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Jalapeño is an AI-powered food ordering application with natural language chat and voice ordering. It uses a Python/FastAPI backend with SQLite and a React/Vite frontend.

## Development Commands

### Backend (from `backend/` directory)

```bash
# Activate virtual environment (Windows)
.\venv\Scripts\activate

# Start dev server with hot reload
uvicorn main:app --reload

# Seed database with products
python seed_db.py
```

Backend runs at http://localhost:8000, API docs at http://localhost:8000/docs

### Frontend (from `frontend/` directory)

```bash
# Start dev server
npm run dev

# Build for production
npm run build
```

Frontend runs at http://localhost:5173, proxies `/api` requests to backend.

## Architecture

### Backend

- **main.py** - FastAPI app entry point. Loads `.env` before other imports (critical for OpenAI key).
- **database.py** - SQLAlchemy models: `Product`, `Order`, `OrderItem`
- **models.py** - Pydantic schemas for request/response validation
- **routers/** - API endpoints split by domain (catalog, orders, ai_assistant)
- **services/ai_service.py** - OpenAI integration with lazy client initialization via `get_client()`

The AI service uses GPT-4o-mini for chat (returns JSON with product matches) and Whisper for voice transcription.

### Frontend

- **App.jsx** - Main component with tab navigation (Catalog, AI Assistant, Orders)
- **context/CartContext.jsx** - Global cart state using React Context + useReducer
- **services/api.js** - API client for all backend calls
- **components/** - Organized by feature (Catalog, Cart, AIAssistant, Orders)

Vite config proxies `/api` to `localhost:8000` for seamless backend communication.

## Key Files

| File | Purpose |
|------|---------|
| `backend/.env` | OpenAI API key (not committed) |
| `backend/data/seed_products.json` | 78 food products for seeding |
| `frontend/vite.config.js` | Dev server proxy configuration |
