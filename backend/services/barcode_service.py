"""Barcode lookup service with Open Food Facts fallback"""
import httpx
from sqlalchemy.orm import Session
from sqlalchemy import or_
from database import Product

OPEN_FOOD_FACTS_URL = "https://world.openfoodfacts.org/api/v0/product/{barcode}.json"


async def lookup_external_barcode(barcode: str) -> dict | None:
    """Look up barcode in Open Food Facts to get product name"""
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            response = await client.get(OPEN_FOOD_FACTS_URL.format(barcode=barcode))
            if response.status_code == 200:
                data = response.json()
                if data.get("status") == 1:
                    product = data.get("product", {})
                    return {
                        "name": product.get("product_name") or product.get("product_name_en"),
                        "brand": product.get("brands"),
                        "category": product.get("categories_tags", [])[:1] if product.get("categories_tags") else []
                    }
    except Exception:
        pass
    return None


def search_similar_products(name: str, db: Session, limit: int = 5) -> list:
    """Search local products by name similarity"""
    if not name:
        return []

    # Split name into words and search for any match
    # Filter out short words, common words, and numeric-only words (like "365")
    stop_words = {'the', 'and', 'for', 'with', 'from'}
    words = [w for w in name.lower().split() if len(w) > 2 and w not in stop_words and not w.strip(',-').isdigit()]
    if not words:
        return []

    # Build OR conditions for each word (use first 5 significant words)
    conditions = [Product.name.ilike(f"%{word}%") for word in words[:5]]

    products = db.query(Product).filter(or_(*conditions)).limit(limit).all()
    return products
