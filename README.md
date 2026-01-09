# Jalapeño

AI-powered food ordering application with natural language processing and voice ordering capabilities.

## Features

- **Product Catalog** - Browse 78 food products across 7 categories (Proteins, Produce, Dairy, Dry Goods, Beverages, Frozen, Supplies)
- **Smart Search** - Filter products by category, subcategory, or search by name
- **Shopping Cart** - Add items, adjust quantities, and place orders
- **AI Chat Assistant** - Order using natural language (e.g., "I need 5 pounds of chicken breast and a dozen eggs")
- **Voice Ordering** - Speak your order using the microphone button
- **Order History** - View past orders and their status

## Tech Stack

**Backend:**
- Python 3.12
- FastAPI
- SQLAlchemy + SQLite
- OpenAI API (GPT-4o-mini for chat, Whisper for voice)

**Frontend:**
- React 18
- Vite
- Tailwind CSS
- Lucide React (icons)

## Setup

### Prerequisites
- Python 3.11 or 3.12
- Node.js 18+
- OpenAI API key

### Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv

# Activate virtual environment
# Windows:
.\venv\Scripts\activate
# macOS/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Create .env file with your OpenAI API key
echo "OPENAI_API_KEY=your_key_here" > .env

# Seed the database
python seed_db.py

# Start the server
uvicorn main:app --reload
```

Backend runs at http://localhost:8000

### Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Start dev server
npm run dev
```

Frontend runs at http://localhost:5173

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/products` | GET | List products (with search, category filters) |
| `/api/products/{id}` | GET | Get product details |
| `/api/categories` | GET | List categories and subcategories |
| `/api/orders` | GET | List all orders |
| `/api/orders` | POST | Create new order |
| `/api/chat` | POST | Send message to AI assistant |
| `/api/voice` | POST | Process voice input |

API documentation available at http://localhost:8000/docs

## Project Structure

```
├── backend/
│   ├── main.py              # FastAPI entry point
│   ├── database.py          # SQLAlchemy models
│   ├── models.py            # Pydantic schemas
│   ├── seed_db.py           # Database seeder
│   ├── routers/
│   │   ├── catalog.py       # Product endpoints
│   │   ├── orders.py        # Order endpoints
│   │   └── ai_assistant.py  # AI chat/voice endpoints
│   ├── services/
│   │   └── ai_service.py    # OpenAI integration
│   └── data/
│       └── seed_products.json
│
└── frontend/
    ├── src/
    │   ├── App.jsx
    │   ├── components/
    │   │   ├── Catalog/     # ProductGrid, ProductCard, CategorySidebar
    │   │   ├── Cart/        # CartDrawer
    │   │   ├── AIAssistant/ # Chat, VoiceInput
    │   │   └── Orders/      # OrderHistory
    │   ├── context/
    │   │   └── CartContext.jsx
    │   └── services/
    │       └── api.js
    └── index.html
```

## Usage Examples

### AI Chat
- "I need 5 pounds of chicken breast and a dozen eggs"
- "What dairy products do you have?"
- "Can I get a case of olive oil and some garlic?"
- "I'm looking for pasta and tomato sauce for Italian night"

### Voice Ordering
1. Click the microphone button
2. Speak your order
3. Click again to stop recording
4. AI will process and suggest matching products

## License

MIT
