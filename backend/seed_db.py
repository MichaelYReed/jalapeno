"""Script to seed the database with initial product data"""
import json
import os
import sys

# Add the parent directory to the path so we can import from the backend
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from database import init_db, SessionLocal, Product


def seed_products():
    """Load products from JSON and insert into database, or update images for existing products"""
    init_db()

    db = SessionLocal()

    # Load seed data
    seed_file = os.path.join(os.path.dirname(__file__), "data", "seed_products.json")
    with open(seed_file, "r") as f:
        data = json.load(f)

    # Check if products already exist
    existing_count = db.query(Product).count()
    if existing_count > 0:
        # Update image_urls and is_food for existing products
        updated_images = 0
        updated_is_food = 0
        for product_data in data["products"]:
            existing = db.query(Product).filter(Product.name == product_data["name"]).first()
            if existing:
                # Update image if missing
                if product_data.get("image_url") and not existing.image_url:
                    existing.image_url = product_data["image_url"]
                    updated_images += 1
                # Update is_food flag
                is_food_value = product_data.get("is_food", 1)
                if existing.is_food != is_food_value:
                    existing.is_food = is_food_value
                    updated_is_food += 1
        if updated_images > 0 or updated_is_food > 0:
            db.commit()
            print(f"Updated {updated_images} product images, {updated_is_food} is_food flags.")
        else:
            print(f"Database already has {existing_count} products, all up to date.")
        db.close()
        return

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
            in_stock=1,
            is_food=product_data.get("is_food", 1)
        )
        db.add(product)

    db.commit()
    print(f"Successfully seeded {len(data['products'])} products!")
    db.close()


if __name__ == "__main__":
    seed_products()
