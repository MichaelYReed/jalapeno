# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Jalapeño is a B2B food ordering application for restaurant supply, featuring AI-powered natural language chat, voice ordering, and customer order guides. Built with Python/FastAPI backend (PostgreSQL, SQLite fallback) and React/TypeScript/Vite frontend. Production deployment uses AWS ECS Fargate via AWS Copilot.

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
- **models.py** - Pydantic schemas for request/response validation (includes Field constraints: price > 0, quantity > 0)
- **routers/** - API endpoints split by domain (catalog, orders, ai_assistant)
- **services/ai_service.py** - OpenAI integration with lazy client initialization via `get_client()`
- **services/nutrition_service.py** - USDA FoodData Central API integration with caching and query optimization

The AI service uses GPT-4o-mini for chat and Whisper for voice transcription. Chat supports both regular JSON responses and streaming via Server-Sent Events (SSE).

### Frontend

The frontend is built with React and TypeScript, using Vite for bundling.

- **src/types/index.ts** - Shared TypeScript interfaces (Product, Order, CartItem, User, etc.)
- **App.tsx** - Main component with tab navigation (Catalog, Order Guide, AI Assistant, Orders, Inventory)
- **context/AuthContext.tsx** - Simple customer authentication (name + company, persisted to localStorage)
- **context/CartContext.tsx** - Global cart state using React Context + useReducer
- **context/FavoritesContext.tsx** - Order guide favorites (product IDs persisted to localStorage)
- **context/ToastContext.tsx** - Toast notification system with success/error/info/warning methods
- **context/ThemeContext.tsx** - Dark/light mode toggle
- **services/api.ts** - API client for all backend calls
- **services/notificationService.ts** - Browser push notifications with mobile fallback
- **components/** - Organized by feature (Catalog, Cart, AIAssistant, Orders, Inventory, OrderGuide, BarcodeScanner, Auth, UI)

Vite config proxies `/api` to `localhost:8000` for seamless backend communication.

### B2B Features

**Customer Login** - Simple authentication for B2B context:
- Login with name and company (no password - demo simplicity)
- Persisted to localStorage, shown in header
- Logout button in header

**Order Guide** - B2B industry-standard favorites list:
- Heart icon on product cards to add/remove favorites
- Dedicated "Order Guide" tab (pink-styled) shows favorited products
- Quick "Add to Cart" for individual items or all at once
- Favorites persisted to localStorage

### UI Patterns

- **Toast notifications** - Success/error feedback via `useToast()` hook, slides in from bottom-right
- **Loading skeletons** - Pulsing placeholder cards/rows while data loads (replaces spinners)
- **Empty states** - Icon + message when no products match filters
- **Keyboard shortcuts** - Escape key closes all modals (ProductForm, delete confirmation, etc.)
- **Dark mode** - Full support via ThemeContext, all components have `dark:` Tailwind variants
- **Mobile scroll hints** - "Swipe to see more" text + fade gradient on horizontally scrollable tables

### Order Status Tracking

Mock order status tracking shows visual timeline progression after placing an order:

- **Status flow**: Pending (0s) → Confirmed (5s) → Shipped (15s) → Delivered (30s)
- **Order Status Modal**: Appears after clicking "Place Order" with live-updating timeline
- **OrderTimeline component**: Visual progress bar with checkmarks and timestamps
- **Implementation**:
  - `orderStatusService.js` - Manages status progression timers, localStorage timestamps, dispatches `orderStatusChange` events
  - `OrderStatusModal.jsx` - Modal with success message, timeline, and action buttons
  - `OrderTimeline.jsx` - Reusable timeline component used in modal and OrderHistory
- **Cross-component communication**: Uses custom window events (`orderStatusChange`, `navigateToTab`)

### Delivery Notifications

Mock delivery confirmation notifications appear 30 seconds after placing an order (when status becomes "Delivered"):

- **Desktop**: Browser push notification via Web Notifications API
- **Mobile fallback**: In-app toast notification + device vibration
- **Implementation**: `notificationService.js` dispatches custom event, `App.jsx` listens and shows toast

The system requests notification permission on first order, then uses push notifications if granted, otherwise falls back to in-app toast.

### AI Assistant

The AI chat uses streaming responses via Server-Sent Events (SSE) for real-time typing effect:

- **Streaming**: Text appears word-by-word as the AI generates it
- **Product markers**: AI uses inline markers to suggest/add products:
  - `[[product:Name:qty]]` - Shows product suggestion card (user can click to add)
  - `[[add-to-cart:Name:qty]]` - Adds item directly to cart (after user confirms)

**Conversation flow:**
1. User asks for products → AI responds with `[[product:...]]` markers and asks "Add to cart?"
2. User confirms ("yes", "add them") → AI uses `[[add-to-cart:...]]` to add items directly
3. Toast notification confirms items added to cart

**Implementation files:**
- `backend/services/ai_service.py` - Streaming function with marker parsing
- `frontend/src/services/api.js` - `chatStream()` with SSE parsing and callbacks
- `frontend/src/components/AIAssistant/Chat.jsx` - Streaming display with product cards

### Database

- **database.py** - SQLAlchemy with environment-based DATABASE_URL
- Supports PostgreSQL (production/Docker) and SQLite (local development fallback)
- `DATABASE_URL` or `DB_SECRET` (AWS Secrets Manager JSON) controls which database is used
- **seed_db.py** - Auto-seeds 78 products on startup if empty, or updates missing images/flags for existing products
- Products have `is_food` flag: 1 = food item (has nutrition data), 0 = non-food supplies (no nutrition lookup)

### Redis Caching

The app uses Redis for API response caching via `services/cache.py`:

- **Graceful degradation**: App continues working if Redis is unavailable (cache operations silently fail)
- **Cached endpoints**: Product lists (5 min TTL), product details (1 hour), categories (1 hour)
- **Local development**: Optionally run Redis via Docker (`docker run -p 6379:6379 redis`)
- **Production**: Uses Redis Cloud (free tier) connected via `REDIS_URL` environment variable
- **AWS Setup**: Store Redis URL in SSM with tags `copilot-application=jalapeno` and `copilot-environment=prod`

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
| `frontend/vite.config.ts` | Dev server proxy configuration |
| `frontend/src/types/index.ts` | Shared TypeScript interfaces |
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
| `/api/products/search/autocomplete` | GET | Autocomplete suggestions for product search |
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
| `/api/chat` | POST | AI chat for natural language ordering (JSON response) |
| `/api/chat/stream` | POST | AI chat with streaming SSE response |
| `/api/chat/suggestions` | GET | Get example chat prompts |
| `/api/voice` | POST | Voice-to-order via Whisper transcription |
| `/health` | GET | Health check endpoint for AWS ALB |

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `OPENAI_API_KEY` | OpenAI API key for chat and voice | Yes |
| `USDA_API_KEY` | USDA FoodData Central API key for nutrition data | Yes |
| `UNSPLASH_ACCESS_KEY` | Unsplash API key for product image search | Optional |
| `REDIS_URL` | Redis connection URL for caching (e.g., `redis://...`) | Optional |
| `DATABASE_URL` | PostgreSQL connection string | Production only |
| `DB_SECRET` | AWS Secrets Manager JSON (alternative to DATABASE_URL) | AWS only |
| `VITE_API_URL` | Backend API URL for frontend builds | Production only |

Local development uses SQLite by default if `DATABASE_URL` is not set. Get USDA API key at https://fdc.nal.usda.gov/api-key-signup.html. Get Unsplash API key at https://unsplash.com/developers. For Redis, use Redis Cloud (https://redis.com/try-free/) or Upstash (https://upstash.com/).

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
- `/copilot/jalapeno/prod/secrets/UNSPLASH_ACCESS_KEY` (optional, for barcode image fallback)

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

**API behavior**: The `/api/products/barcode/{barcode}` endpoint always returns HTTP 200 to avoid CloudFront's 404 → index.html error page behavior. Response format:
- Direct match: `{id, name, price, ...}` (product fields)
- Fallback: `{found: false, external_name: "...", similar_products: [...]}`

**Similar products search**: Filters out numeric-only words (like "365") and uses first 5 significant words from product name to find matches in local database.

**Scanner state management**: The BarcodeScanner component properly cleans up Quagga event handlers (`Quagga.offDetected()`) and resets all state (including `loading`, `similarProducts`, `externalName`) when closing to ensure reliable re-scanning.

When scanning a barcode for inventory, the app auto-fills:
- **Name** - Product name from Open Food Facts
- **Description** - Generic name, or brand + quantity if no generic name
- **Category** - Mapped from Open Food Facts categories (Proteins, Dairy, Produce, Frozen, Beverages, Dry Goods)
- **Image URL** - From Open Food Facts, with Unsplash fallback if none available

### Components

- `components/Inventory/InventoryPage.tsx` - Main inventory tab with product table
- `components/Inventory/ProductForm.tsx` - Add/edit product modal with barcode scanner and auto-fill
- `components/OrderGuide/OrderGuide.tsx` - Order guide (favorites) tab with quick cart actions
- `components/Auth/LoginPage.tsx` - Customer login form
- `components/BarcodeScanner/BarcodeScanner.tsx` - Customer-facing barcode scanner for cart
- `services/barcode_service.py` - Open Food Facts API integration and similar product search
- `services/image_service.py` - Unsplash API integration for fallback product images
