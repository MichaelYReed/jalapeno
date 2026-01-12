# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Jalapeño is an AI-powered food ordering application with natural language chat and voice ordering. It uses a Python/FastAPI backend with PostgreSQL (SQLite fallback for local dev) and a React/Vite frontend. Production deployment uses AWS ECS Fargate via AWS Copilot.

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
# Create .env file with API key (or set environment variable)
echo "OPENAI_API_KEY=your_key_here" > .env

# Build and run both services (uses PostgreSQL)
docker-compose up --build

# Run in background
docker-compose up -d

# Stop services
docker-compose down

# View logs
docker-compose logs -f
```

Docker runs PostgreSQL, backend, and frontend. Frontend at http://localhost:80, API at http://localhost:8000.

### AWS Deployment (from project root)

Uses AWS Copilot for ECS Fargate deployment with RDS PostgreSQL.

```powershell
# Check prerequisites
.\deploy-aws.ps1 check

# Full deployment (first time)
.\deploy-aws.ps1 deploy

# Individual commands
.\deploy-aws.ps1 init       # Initialize Copilot app
.\deploy-aws.ps1 env        # Create prod environment
.\deploy-aws.ps1 secrets    # Store OpenAI API key
.\deploy-aws.ps1 backend    # Deploy backend service
.\deploy-aws.ps1 frontend   # Deploy frontend to S3
.\deploy-aws.ps1 status     # Show deployment status
.\deploy-aws.ps1 delete     # Remove all AWS resources
```

Prerequisites: AWS CLI, AWS Copilot CLI, Docker, configured AWS credentials with admin access.

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

### Database

- **database.py** - SQLAlchemy with environment-based DATABASE_URL
- Supports PostgreSQL (production/Docker) and SQLite (local development fallback)
- `DATABASE_URL` or `DB_SECRET` (AWS Secrets Manager JSON) controls which database is used
- Auto-seeds 78 products on startup if database is empty

### Docker

- **backend/Dockerfile** - Python 3.12-slim with PostgreSQL client libs, runs uvicorn
- **frontend/Dockerfile** - Multi-stage build: Node 20 for build, nginx for serving
- **frontend/nginx.conf** - SPA routing + reverse proxy to backend
- **docker-compose.yml** - PostgreSQL + backend + frontend with health checks

### AWS (Copilot)

- **copilot/backend/manifest.yml** - ECS Fargate service definition
- **copilot/environments/prod/manifest.yml** - Production environment config
- **copilot/environments/addons/jalapeno-db.yml** - RDS PostgreSQL CloudFormation template
- **deploy-aws.ps1** - PowerShell deployment script
- **frontend/.env.production** - Production API URL for frontend build
- Secrets stored in AWS SSM Parameter Store

## Key Files

| File | Purpose |
|------|---------|
| `.env` | Environment variables for Docker (OPENAI_API_KEY) |
| `backend/data/seed_products.json` | 78 food products with image URLs |
| `backend/fetch_images.py` | Script to fetch product images from Unsplash |
| `backend/database.py` | SQLAlchemy setup with PostgreSQL/SQLite support |
| `frontend/vite.config.js` | Dev server proxy configuration |
| `docker-compose.yml` | Local dev with PostgreSQL container |
| `frontend/nginx.conf` | Production proxy config |
| `deploy-aws.ps1` | AWS Copilot deployment script |
| `copilot/backend/manifest.yml` | ECS Fargate service config |
| `copilot/environments/addons/jalapeno-db.yml` | RDS PostgreSQL CloudFormation |
| `frontend/.env.production` | Production API URL for builds |

## Product Images

Product images are fetched from Unsplash API and stored in `seed_products.json`.

```bash
# Fetch/update images (requires Unsplash API key in script)
cd backend
python fetch_images.py

# Re-seed database after updating images
docker exec leonintro-backend-1 python -c "from database import SessionLocal, Product; db=SessionLocal(); db.query(Product).delete(); db.commit()"
docker exec leonintro-backend-1 python seed_db.py
```

The script skips products that already have images. Unsplash free tier allows 50 requests/hour.

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/products` | GET | List products (supports `search`, `category`, `subcategory` params) |
| `/api/products/{id}` | GET | Get single product |
| `/api/categories` | GET | List categories with subcategories |
| `/api/orders` | GET/POST | List or create orders |
| `/api/chat` | POST | AI chat for natural language ordering |
| `/api/voice` | POST | Voice-to-order via Whisper transcription |
| `/health` | GET | Health check endpoint for AWS ALB |

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `OPENAI_API_KEY` | OpenAI API key for chat and voice | Yes |
| `DATABASE_URL` | PostgreSQL connection string | Production only |
| `DB_SECRET` | AWS Secrets Manager JSON (alternative to DATABASE_URL) | AWS only |
| `VITE_API_URL` | Backend API URL for frontend builds | Production only |

Local development uses SQLite by default if `DATABASE_URL` is not set.

## AWS Architecture

```
┌─────────────────┐     ┌─────────────────┐
│   S3 Bucket     │     │ Application     │
│   (Frontend)    │     │ Load Balancer   │
└─────────────────┘     └────────┬────────┘
                                 │
                                 ▼
                        ┌─────────────────┐
                        │   ECS Fargate   │
                        │   (Backend)     │
                        └────────┬────────┘
                                 │
                                 ▼
                        ┌─────────────────┐
                        │  RDS PostgreSQL │
                        │   (db.t3.micro) │
                        └─────────────────┘
```

AWS resources are managed by Copilot. Secrets stored in SSM Parameter Store at:
- `/copilot/jalapeno/prod/secrets/OPENAI_API_KEY`

**Live URLs:**
- Frontend: http://jalapeno-frontend-prod.s3-website-us-east-1.amazonaws.com
- Backend API: http://jalape-Publi-n1Sr6QWCeWpE-323367462.us-east-1.elb.amazonaws.com
