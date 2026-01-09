# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Jalapeño is an AI-powered food ordering application with natural language chat and voice ordering. It uses a Python/FastAPI backend with SQLite and a React/Vite frontend.

## Development Commands

### Backend (from `backend/` directory)

```bash
# Activate virtual environment
.\venv\Scripts\activate        # Windows
source venv/bin/activate       # macOS/Linux

# Install dependencies
pip install -r requirements.txt

# Seed database with products
python seed_db.py

# Start dev server with hot reload
uvicorn main:app --reload
```

Backend runs at http://localhost:8000, API docs at http://localhost:8000/docs

### Frontend (from `frontend/` directory)

```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Build for production
npm run build
```

Frontend runs at http://localhost:5173, proxies `/api` requests to backend.

### Docker (from project root)

```bash
# Set API key first
export OPENAI_API_KEY=your_key_here

# Build and run both services
docker-compose up --build

# Run in background
docker-compose up -d

# Stop services
docker-compose down

# View logs
docker-compose logs -f
```

Docker serves frontend at http://localhost:80 and API at http://localhost:8000.

## Architecture

### Backend

- **main.py** - FastAPI entry point. Loads `.env` before other imports (critical for OpenAI key).
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

### Docker

- **backend/Dockerfile** - Python 3.12-slim, runs uvicorn
- **frontend/Dockerfile** - Multi-stage build: Node 20 for build, nginx for serving
- **frontend/nginx.conf** - SPA routing + reverse proxy to backend
- **docker-compose.yml** - Orchestrates services with shared network and SQLite volume

## Key Files

| File | Purpose |
|------|---------|
| `backend/.env` | OpenAI API key (not committed) |
| `backend/data/seed_products.json` | 78 food products for seeding |
| `frontend/vite.config.js` | Dev server proxy configuration |
| `docker-compose.yml` | Container orchestration |
| `frontend/nginx.conf` | Production proxy config |

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/products` | GET | List products (supports `search`, `category`, `subcategory` params) |
| `/api/products/{id}` | GET | Get single product |
| `/api/categories` | GET | List categories with subcategories |
| `/api/orders` | GET/POST | List or create orders |
| `/api/chat` | POST | AI chat for natural language ordering |
| `/api/voice` | POST | Voice-to-order via Whisper transcription |
