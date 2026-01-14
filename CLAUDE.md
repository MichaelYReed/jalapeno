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

Uses AWS Copilot for ECS Fargate deployment with RDS PostgreSQL and CloudFront for HTTPS.

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
.\deploy-aws.ps1 frontend   # Deploy frontend to S3 + CloudFront (HTTPS)
.\deploy-aws.ps1 cloudfront # Update CloudFront distribution only
.\deploy-aws.ps1 status     # Show deployment status
.\deploy-aws.ps1 delete     # Remove all AWS resources
```

Prerequisites: AWS CLI, AWS Copilot CLI, Docker, configured AWS credentials with admin access.

## Architecture

### Backend

- **main.py** - FastAPI entry point. Loads `.env` before other imports (critical for OpenAI key).
- **database.py** - SQLAlchemy models: `Product`, `Order`, `OrderItem`, `NutritionCache`
- **models.py** - Pydantic schemas for request/response validation
- **routers/** - API endpoints split by domain (catalog, orders, ai_assistant)
- **services/ai_service.py** - OpenAI integration with lazy client initialization via `get_client()`
- **services/nutrition_service.py** - USDA FoodData Central API integration with caching and query optimization

The AI service uses GPT-4o-mini for chat (returns JSON with product matches) and Whisper for voice transcription.

### Frontend

- **App.jsx** - Main component with tab navigation (Catalog, AI Assistant, Orders, Inventory)
- **context/CartContext.jsx** - Global cart state using React Context + useReducer
- **context/ToastContext.jsx** - Toast notification system with success/error/info/warning methods
- **services/api.js** - API client for all backend calls
- **components/** - Organized by feature (Catalog, Cart, AIAssistant, Orders, Inventory, BarcodeScanner, UI)
- **components/UI/Modal.jsx** - Reusable modal component with backdrop and keyboard handling
- **components/UI/Toast.jsx** - Toast notifications (bottom-right, auto-dismiss after 3s)
- **components/UI/Skeleton.jsx** - Loading skeleton components (ProductCardSkeleton, ProductRowSkeleton)
- **components/Catalog/ProductDetailModal.jsx** - Product detail modal with nutrition facts
- **components/Catalog/NutritionFacts.jsx** - FDA-style nutrition label component

Vite config proxies `/api` to `localhost:8000` for seamless backend communication.

### UI Patterns

- **Toast notifications** - Success/error feedback via `useToast()` hook, slides in from bottom-right
- **Loading skeletons** - Pulsing placeholder cards/rows while data loads (replaces spinners)
- **Empty states** - Icon + message when no products match filters
- **Keyboard shortcuts** - Escape key closes all modals (ProductForm, delete confirmation, etc.)
- **Dark mode** - Full support via ThemeContext, all components have `dark:` Tailwind variants

### Database

- **database.py** - SQLAlchemy with environment-based DATABASE_URL
- Supports PostgreSQL (production/Docker) and SQLite (local development fallback)
- `DATABASE_URL` or `DB_SECRET` (AWS Secrets Manager JSON) controls which database is used
- **seed_db.py** - Auto-seeds 78 products on startup if empty, or updates missing images/flags for existing products
- Products have `is_food` flag: 1 = food item (has nutrition data), 0 = non-food supplies (no nutrition lookup)

### Nutrition Service

The nutrition service (`services/nutrition_service.py`) fetches data from USDA FoodData Central API:

- **Query optimization**: Simplifies product names by removing sizes, descriptors, and special characters
- **Special mappings**: Maps problematic product names to better USDA search terms (e.g., "yellow onions" → "onion raw")
- **Fallback search**: Tries multiple query variations, then falls back to branded foods if needed
- **Caching**: Stores results in `NutritionCache` table for 30 days to avoid repeated API calls
- **Non-food handling**: Products with `is_food=0` skip API lookup and return "non-food item" response

All 71 food products have nutrition data; 7 supplies items are correctly flagged as non-food.

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
| `backend/seed_db.py` | Database seeding and image update script |
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

All 78 products have images fetched from Unsplash API and stored in `seed_products.json`.

```bash
# Fetch/update images (requires Unsplash API key in script)
cd backend
python fetch_images.py

# Redeploy backend to update images (seed script auto-updates on startup)
copilot svc deploy --name backend --env prod
```

The fetch script skips products that already have images. Unsplash free tier allows 50 requests/hour. The seed script automatically updates missing image URLs for existing products on startup.

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/products` | GET | List products (supports `search`, `category`, `subcategory` params) |
| `/api/products` | POST | Create new product |
| `/api/products/{id}` | GET | Get single product |
| `/api/products/{id}` | PUT | Update product |
| `/api/products/{id}` | DELETE | Delete product |
| `/api/products/{id}/nutrition` | GET | Get nutrition facts from USDA FoodData Central |
| `/api/products/barcode/{barcode}` | GET | Lookup product by barcode (with Open Food Facts fallback) |
| `/api/images/search` | GET | Search Unsplash for product image (fallback for barcode scan) |
| `/api/categories` | GET | List categories with subcategories |
| `/api/orders` | GET/POST | List or create orders |
| `/api/chat` | POST | AI chat for natural language ordering |
| `/api/voice` | POST | Voice-to-order via Whisper transcription |
| `/health` | GET | Health check endpoint for AWS ALB |

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `OPENAI_API_KEY` | OpenAI API key for chat and voice | Yes |
| `USDA_API_KEY` | USDA FoodData Central API key for nutrition data | Yes |
| `DATABASE_URL` | PostgreSQL connection string | Production only |
| `DB_SECRET` | AWS Secrets Manager JSON (alternative to DATABASE_URL) | AWS only |
| `VITE_API_URL` | Backend API URL for frontend builds | Production only |

Local development uses SQLite by default if `DATABASE_URL` is not set. Get USDA API key at https://fdc.nal.usda.gov/api-key-signup.html

## AWS Architecture

```
                        ┌─────────────────┐
                        │   CloudFront    │ ← HTTPS
                        │   (CDN + SSL)   │
                        └────────┬────────┘
                                 │
                    ┌────────────┴────────────┐
                    │                         │
                    ▼                         ▼
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

CloudFront serves the frontend over HTTPS and proxies `/api/*` requests to the backend ALB. This provides:
- HTTPS/TLS encryption
- Edge caching for static assets
- SPA routing (404 → index.html)

AWS resources are managed by Copilot. Secrets stored in SSM Parameter Store at:
- `/copilot/jalapeno/prod/secrets/OPENAI_API_KEY`
- `/copilot/jalapeno/prod/secrets/USDA_API_KEY`

**Live URLs:**
- Frontend (HTTPS): https://dknu09xe73cdt.cloudfront.net
- Backend API: http://jalape-Publi-n1Sr6QWCeWpE-323367462.us-east-1.elb.amazonaws.com

## Inventory Management

The Inventory tab (amber-styled to distinguish from customer-facing green UI) provides staff with product CRUD operations:

### Features

- **Product List** - View all products with images, categories, prices, stock status, and barcodes
- **Add Product** - Scan barcode to auto-fill from Open Food Facts, or enter manually
- **Edit Product** - Update name, description, category, price, stock, image URL
- **Delete Product** - Remove products with confirmation dialog

### Barcode Scanning

The app uses Quagga2 library for barcode scanning:

1. **Customer scanning** - Scan product barcode in catalog to quickly add to cart
2. **Inventory scanning** - Scan barcode when adding products to pre-fill form data from Open Food Facts
3. **Fallback search** - If barcode not in local DB, looks up Open Food Facts and shows similar local products

When scanning a barcode for inventory, the app auto-fills:
- **Name** - Product name from Open Food Facts
- **Description** - Generic name, or brand + quantity if no generic name
- **Category** - Mapped from Open Food Facts categories (Proteins, Dairy, Produce, Frozen, Beverages, Dry Goods)
- **Image URL** - From Open Food Facts, with Unsplash fallback if none available

### Components

- `components/Inventory/InventoryPage.jsx` - Main inventory tab with product table
- `components/Inventory/ProductForm.jsx` - Add/edit product modal with barcode scanner and auto-fill
- `components/BarcodeScanner/BarcodeScanner.jsx` - Customer-facing barcode scanner for cart
- `services/barcode_service.py` - Open Food Facts API integration and similar product search
- `services/image_service.py` - Unsplash API integration for fallback product images
