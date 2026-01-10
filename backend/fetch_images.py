"""
Fetch product images from Unsplash API and update seed_products.json
"""
import json
import time
import requests

UNSPLASH_ACCESS_KEY = "xaqZd4jBjV5BNd6npPFL-ENIwEI06NA6RJPa6W0d-lc"
SEED_FILE = "data/seed_products.json"

def search_unsplash(query: str) -> str | None:
    """Search Unsplash for an image matching the query"""
    url = "https://api.unsplash.com/search/photos"
    params = {
        "query": query,
        "per_page": 1,
        "orientation": "squarish"
    }
    headers = {
        "Authorization": f"Client-ID {UNSPLASH_ACCESS_KEY}"
    }

    try:
        response = requests.get(url, params=params, headers=headers)
        response.raise_for_status()
        data = response.json()

        if data["results"]:
            # Use small size (400px) for faster loading
            return data["results"][0]["urls"]["small"]
        return None
    except Exception as e:
        print(f"  Error searching for '{query}': {e}")
        return None

def get_search_term(product: dict) -> str:
    """Generate a good search term for the product"""
    name = product["name"]
    subcategory = product.get("subcategory", "")

    # For better results, simplify some product names
    search_term = name.lower()

    # Add "food" context for better results on generic terms
    food_context_words = ["fresh", "raw", "cooked", "food"]
    if not any(word in search_term for word in food_context_words):
        if subcategory:
            search_term = f"{subcategory} {name}"
        else:
            search_term = f"{name} food"

    return search_term

def main():
    # Load seed data
    print(f"Loading {SEED_FILE}...")
    with open(SEED_FILE, "r") as f:
        data = json.load(f)

    products = data["products"]
    total = len(products)
    print(f"Found {total} products\n")

    # Fetch images for each product
    skipped = 0
    for i, product in enumerate(products, 1):
        name = product["name"]

        # Skip products that already have images
        if product.get("image_url"):
            print(f"[{i}/{total}] {name} - already has image, skipping")
            skipped += 1
            continue

        search_term = get_search_term(product)

        print(f"[{i}/{total}] {name}")
        print(f"  Searching: '{search_term}'")

        image_url = search_unsplash(search_term)

        if image_url:
            product["image_url"] = image_url
            print(f"  Found image!")
        else:
            print(f"  No image found, trying simpler search...")
            # Try with just the product name
            image_url = search_unsplash(name)
            if image_url:
                product["image_url"] = image_url
                print(f"  Found image with simpler search!")
            else:
                print(f"  WARNING: No image found")

        # Rate limiting - Unsplash allows 50 req/hour, so ~1.2 sec between requests
        # Using 0.5 sec should be safe for 78 products
        time.sleep(0.5)

    # Save updated data
    print(f"\nSaving updated {SEED_FILE}...")
    with open(SEED_FILE, "w") as f:
        json.dump(data, f, indent=2)

    # Summary
    with_images = sum(1 for p in products if p.get("image_url"))
    without_images = total - with_images
    print(f"\nDone! {with_images}/{total} products now have images.")
    if skipped:
        print(f"Skipped {skipped} products that already had images.")
    if without_images:
        print(f"{without_images} products still need images - run again after rate limit resets (~1 hour).")

if __name__ == "__main__":
    main()
