"""Script to seed the database with initial product data"""
import json
import os
import sys

# Add the parent directory to the path so we can import from the backend
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from database import init_db, SessionLocal, Product


def seed_products():
    """Load products from JSON and insert into database"""
    init_db()

    db = SessionLocal()

    # Check if products already exist
    existing_count = db.query(Product).count()
    if existing_count > 0:
        print(f"Database already has {existing_count} products. Skipping seed.")
        db.close()
        return

    # Load seed data
    seed_file = os.path.join(os.path.dirname(__file__), "data", "seed_products.json")
    with open(seed_file, "r") as f:
        data = json.load(f)

    # Insert products
    for product_data in data["products"]:
        product = Product(
            name=product_data["name"],
            description=product_data.get("description"),
            category=product_data["category"],
            subcategory=product_data.get("subcategory"),
            unit=product_data["unit"],
            price=product_data["price"],
            image_url=product_data.get("image_url"),
            in_stock=1
        )
        db.add(product)

    db.commit()
    print(f"Successfully seeded {len(data['products'])} products!")
    db.close()


if __name__ == "__main__":
    seed_products()
