from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import or_
from typing import Optional, List

from database import get_db, Product
from models import ProductResponse, NutritionResponse
from services.nutrition_service import get_nutrition_for_product
from services.cache import (
    cache_get, cache_set, cache_key_hash,
    CACHE_TTL_PRODUCTS, CACHE_TTL_PRODUCT_DETAIL, CACHE_TTL_CATEGORIES
)

router = APIRouter()


@router.get("/products", response_model=List[ProductResponse])
async def get_products(
    search: Optional[str] = Query(None, description="Search products by name or description"),
    category: Optional[str] = Query(None, description="Filter by category"),
    subcategory: Optional[str] = Query(None, description="Filter by subcategory"),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=100),
    db: Session = Depends(get_db)
):
    """Get all products with optional filtering"""
    # Try cache first
    cache_key = f"catalog:products:{cache_key_hash(search, category, subcategory, skip, limit)}"
    cached = cache_get(cache_key)
    if cached is not None:
        return cached

    # Query database
    query = db.query(Product)

    if search:
        search_term = f"%{search}%"
        query = query.filter(
            or_(
                Product.name.ilike(search_term),
                Product.description.ilike(search_term)
            )
        )

    if category:
        query = query.filter(Product.category == category)

    if subcategory:
        query = query.filter(Product.subcategory == subcategory)

    # Sort by category, then subcategory, then name for consistent ordering
    query = query.order_by(Product.category, Product.subcategory, Product.name)

    products = query.offset(skip).limit(limit).all()

    # Convert to dict for caching
    result = [
        {
            "id": p.id,
            "name": p.name,
            "description": p.description,
            "category": p.category,
            "subcategory": p.subcategory,
            "unit": p.unit,
            "price": p.price,
            "image_url": p.image_url,
            "in_stock": p.in_stock
        }
        for p in products
    ]

    # Cache result
    cache_set(cache_key, result, CACHE_TTL_PRODUCTS)

    return result


@router.get("/products/{product_id}", response_model=ProductResponse)
async def get_product(product_id: int, db: Session = Depends(get_db)):
    """Get a specific product by ID"""
    # Try cache first
    cache_key = f"catalog:product:{product_id}"
    cached = cache_get(cache_key)
    if cached is not None:
        return cached

    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    # Convert to dict for caching
    result = {
        "id": product.id,
        "name": product.name,
        "description": product.description,
        "category": product.category,
        "subcategory": product.subcategory,
        "unit": product.unit,
        "price": product.price,
        "image_url": product.image_url,
        "in_stock": product.in_stock
    }

    # Cache result
    cache_set(cache_key, result, CACHE_TTL_PRODUCT_DETAIL)

    return result


@router.get("/products/{product_id}/nutrition", response_model=NutritionResponse)
async def get_product_nutrition(product_id: int, db: Session = Depends(get_db)):
    """Get nutrition data for a specific product from USDA FoodData Central"""
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    # Check if this is a non-food item (is_food = 0)
    if not product.is_food:
        return NutritionResponse(
            error="This is a non-food item without nutritional data",
            is_non_food=True,
            cached=False
        )

    nutrition = await get_nutrition_for_product(product.name)
    return NutritionResponse(**nutrition)


@router.get("/categories")
async def get_categories(db: Session = Depends(get_db)):
    """Get all categories with their subcategories"""
    # Try cache first
    cache_key = "catalog:categories"
    cached = cache_get(cache_key)
    if cached is not None:
        return cached

    products = db.query(Product.category, Product.subcategory).distinct().all()

    categories = {}
    for category, subcategory in products:
        if category not in categories:
            categories[category] = []
        if subcategory and subcategory not in categories[category]:
            categories[category].append(subcategory)

    result = [
        {"name": cat, "subcategories": sorted(subs)}
        for cat, subs in sorted(categories.items())
    ]

    # Cache result
    cache_set(cache_key, result, CACHE_TTL_CATEGORIES)

    return result


@router.get("/products/search/autocomplete")
async def autocomplete(
    q: str = Query(..., min_length=1, description="Search query"),
    limit: int = Query(10, ge=1, le=20),
    db: Session = Depends(get_db)
):
    """Get autocomplete suggestions for product search"""
    search_term = f"%{q}%"
    products = db.query(Product).filter(
        Product.name.ilike(search_term)
    ).limit(limit).all()

    return [{"id": p.id, "name": p.name, "category": p.category} for p in products]
