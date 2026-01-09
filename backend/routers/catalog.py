from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import or_
from typing import Optional, List

from database import get_db, Product
from models import ProductResponse

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

    products = query.offset(skip).limit(limit).all()
    return products


@router.get("/products/{product_id}", response_model=ProductResponse)
async def get_product(product_id: int, db: Session = Depends(get_db)):
    """Get a specific product by ID"""
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    return product


@router.get("/categories")
async def get_categories(db: Session = Depends(get_db)):
    """Get all categories with their subcategories"""
    products = db.query(Product.category, Product.subcategory).distinct().all()

    categories = {}
    for category, subcategory in products:
        if category not in categories:
            categories[category] = []
        if subcategory and subcategory not in categories[category]:
            categories[category].append(subcategory)

    return [
        {"name": cat, "subcategories": sorted(subs)}
        for cat, subs in sorted(categories.items())
    ]


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
