from sqlalchemy import create_engine, Column, Integer, String, Float, DateTime, ForeignKey, Text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, relationship
from datetime import datetime
import os
import json

def get_database_url():
    """Get database URL from environment variables.

    Supports:
    - DATABASE_URL: Direct connection string
    - DB_SECRET: JSON secret from AWS Aurora (Copilot format)
    - Falls back to SQLite for local development
    """
    # Check for direct DATABASE_URL first
    if os.environ.get("DATABASE_URL"):
        return os.environ.get("DATABASE_URL")

    # Check for Aurora secret (JSON format from Copilot)
    db_secret = os.environ.get("DB_SECRET")
    if db_secret:
        try:
            secret = json.loads(db_secret)
            return f"postgresql://{secret['username']}:{secret['password']}@{secret['host']}:{secret['port']}/{secret['dbname']}"
        except (json.JSONDecodeError, KeyError) as e:
            print(f"Warning: Failed to parse DB_SECRET: {e}")

    # Default to SQLite for local development
    return "sqlite:///./data/food_ordering.db"

DATABASE_URL = get_database_url()

# Configure engine based on database type
if DATABASE_URL.startswith("sqlite"):
    engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
else:
    # PostgreSQL and other databases
    engine = create_engine(DATABASE_URL, pool_pre_ping=True)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


class Product(Base):
    __tablename__ = "products"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(200), nullable=False, index=True)
    description = Column(Text)
    category = Column(String(100), nullable=False, index=True)
    subcategory = Column(String(100))
    unit = Column(String(50), nullable=False)  # e.g., "lb", "each", "case", "gallon"
    price = Column(Float, nullable=False)
    image_url = Column(String(500))
    in_stock = Column(Integer, default=1)
    is_food = Column(Integer, default=1)  # 1 = food item with nutrition, 0 = non-food (supplies)


class Order(Base):
    __tablename__ = "orders"

    id = Column(Integer, primary_key=True, index=True)
    total = Column(Float, nullable=False)
    status = Column(String(50), default="pending")  # pending, confirmed, shipped, delivered
    created_at = Column(DateTime, default=datetime.utcnow)

    items = relationship("OrderItem", back_populates="order")


class OrderItem(Base):
    __tablename__ = "order_items"

    id = Column(Integer, primary_key=True, index=True)
    order_id = Column(Integer, ForeignKey("orders.id"), nullable=False)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    quantity = Column(Float, nullable=False)
    unit_price = Column(Float, nullable=False)

    order = relationship("Order", back_populates="items")
    product = relationship("Product")


class NutritionCache(Base):
    """Cache for USDA nutrition data to avoid repeated API calls"""
    __tablename__ = "nutrition_cache"

    id = Column(Integer, primary_key=True, index=True)
    product_name = Column(String(200), nullable=False, unique=True, index=True)
    fdc_id = Column(Integer)  # USDA FoodData Central ID
    nutrition_data = Column(Text)  # JSON string of nutrition info
    fetched_at = Column(DateTime, default=datetime.utcnow)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    # Only create data directory for SQLite
    if DATABASE_URL.startswith("sqlite"):
        os.makedirs("data", exist_ok=True)
    Base.metadata.create_all(bind=engine)

    # Run migrations for existing databases
    _run_migrations()


def _run_migrations():
    """Add missing columns to existing tables and fix data issues"""
    from sqlalchemy import text

    with engine.connect() as conn:
        # Check if is_food column exists, add if missing
        if DATABASE_URL.startswith("postgresql"):
            result = conn.execute(text("""
                SELECT column_name FROM information_schema.columns
                WHERE table_name = 'products' AND column_name = 'is_food'
            """))
            if not result.fetchone():
                conn.execute(text("ALTER TABLE products ADD COLUMN is_food INTEGER DEFAULT 1"))
                conn.commit()
                print("Added is_food column to products table")

            # Fix mismatched product images
            image_fixes = [
                ("Tilapia Fillet", "https://images.unsplash.com/photo-1713759980610-5a3b72d7f9d8?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=400"),
                ("Russet Potatoes", "https://images.unsplash.com/photo-1518977676601-b53f82aba655?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=400"),
                ("Baby Spinach", "https://images.unsplash.com/photo-1519995672084-d21490e86ba6?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=400"),
            ]
            for name, url in image_fixes:
                conn.execute(text("UPDATE products SET image_url = :url WHERE name = :name"), {"url": url, "name": name})
            conn.commit()
            print("Fixed product images")
