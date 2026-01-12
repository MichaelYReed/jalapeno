"""Service for fetching nutrition data from USDA FoodData Central API"""
import os
import json
import re
import httpx
from datetime import datetime, timedelta
from typing import Optional, List
from database import SessionLocal, NutritionCache


USDA_API_BASE = "https://api.nal.usda.gov/fdc/v1"
CACHE_DURATION_DAYS = 30

# Special query mappings for products that need specific search terms
# These override the normal query simplification
SPECIAL_QUERY_MAPPINGS = {
    "yellow onions": "onion raw",
    "garlic bulbs": "garlic raw",
    "lemons": "lemon raw",
    "limes": "lime raw",
    "strawberries": "strawberries raw",
    "butter unsalted": "butter without salt",
    "butter salted": "butter salted",
    "jasmine rice": "rice white cooked",
    "pepsi": "cola carbonated",
    "coffee beans dark roast": "coffee brewed",
    "coffee beans medium roast": "coffee brewed",
    "chocolate ice cream": "ice cream chocolate",
    "pork chops": "pork chop raw",
    "fresh basil": "basil fresh",
    "kosher salt": "salt table",
    "extra virgin olive oil": "olive oil",
    # Additional mappings for remaining unmatched items
    "apples gala": "apple raw",
    "whole milk": "milk whole 3.25%",
    "2% milk": "milk reduced fat",
    "granulated sugar": "sugar granulated",
    "vegetable oil": "vegetable oil",
}

# Words to remove from search queries to simplify them
WORDS_TO_REMOVE = [
    "fresh", "frozen", "canned", "dried", "raw", "cooked", "organic",
    "premium", "usda", "choice", "select", "prime", "natural", "whole",
    "sliced", "diced", "chopped", "minced", "ground", "shredded", "grated",
    "boneless", "skinless", "bone-in", "skin-on", "large", "small", "medium",
    "baby", "mini", "jumbo", "extra", "virgin", "pure", "100%", "case",
    "block", "roll", "bag", "box", "can", "jar", "bottle", "pack"
]


def get_api_key() -> Optional[str]:
    """Get USDA API key from environment"""
    return os.environ.get("USDA_API_KEY")


def simplify_query(product_name: str) -> List[str]:
    """
    Generate a list of progressively simpler search queries.
    Returns multiple variations to try in order.
    """
    queries = []
    name = product_name.lower().strip()

    # Check for special mapping first - these are known problematic searches
    if name in SPECIAL_QUERY_MAPPINGS:
        queries.append(SPECIAL_QUERY_MAPPINGS[name])
        # Also add the original name as fallback
        queries.append(name)

    # Query 1: Original name (but clean up special characters)
    clean_name = re.sub(r'[^\w\s]', ' ', name)  # Remove special chars
    clean_name = re.sub(r'\s+', ' ', clean_name).strip()  # Normalize spaces
    queries.append(clean_name)

    # Query 2: Remove numbers and sizes (like "80/20", "21/25", "32oz")
    no_numbers = re.sub(r'\d+[/]?\d*\s*(oz|lb|ml|g|kg|ct|count|pack)?\b', '', name)
    no_numbers = re.sub(r'\d+', '', no_numbers)  # Remove remaining numbers
    no_numbers = re.sub(r'[^\w\s]', ' ', no_numbers)
    no_numbers = re.sub(r'\s+', ' ', no_numbers).strip()
    if no_numbers and no_numbers != clean_name:
        queries.append(no_numbers)

    # Query 3: Remove descriptor words
    simplified = no_numbers
    for word in WORDS_TO_REMOVE:
        simplified = re.sub(r'\b' + word + r'\b', '', simplified, flags=re.IGNORECASE)
    simplified = re.sub(r'\s+', ' ', simplified).strip()
    if simplified and simplified not in queries:
        queries.append(simplified)

    # Query 4: Just the core food words (first 1-2 significant words)
    words = simplified.split()
    if len(words) >= 2:
        core = ' '.join(words[:2])
        if core not in queries:
            queries.append(core)
    if len(words) >= 1:
        single = words[0]
        if single not in queries and len(single) > 2:
            queries.append(single)

    # Remove empty strings and duplicates while preserving order
    seen = set()
    unique_queries = []
    for q in queries:
        if q and q not in seen:
            seen.add(q)
            unique_queries.append(q)

    return unique_queries


async def search_food(query: str, include_branded: bool = False) -> Optional[dict]:
    """
    Search USDA FoodData Central for a food item.

    Args:
        query: The search term
        include_branded: If True, also search branded food products

    Returns:
        The best matching food item, or None if no match found
    """
    api_key = get_api_key()
    if not api_key:
        print("USDA API key not configured")
        return None

    # Define which data types to search
    # Foundation and SR Legacy have the best generic nutrition data
    # Survey (FNDDS) has good data for common foods
    # Branded adds commercial products but can be noisy
    data_types = ["Foundation", "SR Legacy", "Survey (FNDDS)"]
    if include_branded:
        data_types.append("Branded")

    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(
                f"{USDA_API_BASE}/foods/search",
                params={
                    "api_key": api_key,
                    "query": query,
                    "pageSize": 5,  # Get top 5 results to find best match
                    "dataType": data_types
                },
                timeout=10.0
            )
            response.raise_for_status()
            data = response.json()

            if data.get("foods") and len(data["foods"]) > 0:
                # Return the first (best) match
                # USDA API already ranks by relevance
                best_match = data["foods"][0]
                print(f"  USDA match for '{query}': {best_match.get('description', 'Unknown')}")
                return best_match
            else:
                print(f"  No USDA results for '{query}'")
            return None
        except Exception as e:
            print(f"USDA API search error for '{query}': {e}")
            return None


def extract_nutrients(food_data: dict) -> dict:
    """Extract relevant nutrients from USDA food data"""
    nutrients_map = {
        "Energy": ("calories", "kcal"),
        "Energy (Atwater General Factors)": ("calories", "kcal"),
        "Energy (Atwater Specific Factors)": ("calories", "kcal"),
        "Total lipid (fat)": ("total_fat", "g"),
        "Fatty acids, total saturated": ("saturated_fat", "g"),
        "Fatty acids, total trans": ("trans_fat", "g"),
        "Cholesterol": ("cholesterol", "mg"),
        "Sodium, Na": ("sodium", "mg"),
        "Carbohydrate, by difference": ("total_carbs", "g"),
        "Fiber, total dietary": ("dietary_fiber", "g"),
        "Sugars, total including NLEA": ("total_sugars", "g"),
        "Total Sugars": ("total_sugars", "g"),
        "Protein": ("protein", "g"),
        "Vitamin D (D2 + D3)": ("vitamin_d", "mcg"),
        "Calcium, Ca": ("calcium", "mg"),
        "Iron, Fe": ("iron", "mg"),
        "Potassium, K": ("potassium", "mg"),
    }

    # Daily values for percentage calculation (FDA reference)
    daily_values = {
        "total_fat": 78,
        "saturated_fat": 20,
        "cholesterol": 300,
        "sodium": 2300,
        "total_carbs": 275,
        "dietary_fiber": 28,
        "protein": 50,
        "vitamin_d": 20,
        "calcium": 1300,
        "iron": 18,
        "potassium": 4700,
    }

    result = {
        "fdc_id": food_data.get("fdcId"),
        "description": food_data.get("description", ""),
        "serving_size": "100g",  # USDA data is typically per 100g
        "calories": None,
        "nutrients": []
    }

    food_nutrients = food_data.get("foodNutrients", [])

    for nutrient in food_nutrients:
        nutrient_name = nutrient.get("nutrientName", "")

        if nutrient_name in nutrients_map:
            key, unit = nutrients_map[nutrient_name]
            amount = nutrient.get("value", 0)

            if key == "calories":
                result["calories"] = amount
            else:
                daily_value = None
                if key in daily_values and daily_values[key] > 0:
                    daily_value = round((amount / daily_values[key]) * 100, 1)

                result["nutrients"].append({
                    "name": key.replace("_", " ").title(),
                    "amount": round(amount, 1),
                    "unit": unit,
                    "daily_value": daily_value
                })

    return result


def get_cached_nutrition(product_name: str) -> Optional[dict]:
    """Get cached nutrition data if available and not expired"""
    db = SessionLocal()
    try:
        cache = db.query(NutritionCache).filter(
            NutritionCache.product_name == product_name.lower()
        ).first()

        if cache:
            # Check if cache is still valid
            if cache.fetched_at > datetime.utcnow() - timedelta(days=CACHE_DURATION_DAYS):
                return json.loads(cache.nutrition_data) if cache.nutrition_data else None
    finally:
        db.close()
    return None


def save_nutrition_cache(product_name: str, fdc_id: Optional[int], nutrition_data: dict):
    """Save nutrition data to cache"""
    db = SessionLocal()
    try:
        existing = db.query(NutritionCache).filter(
            NutritionCache.product_name == product_name.lower()
        ).first()

        if existing:
            existing.fdc_id = fdc_id
            existing.nutrition_data = json.dumps(nutrition_data)
            existing.fetched_at = datetime.utcnow()
        else:
            cache = NutritionCache(
                product_name=product_name.lower(),
                fdc_id=fdc_id,
                nutrition_data=json.dumps(nutrition_data),
                fetched_at=datetime.utcnow()
            )
            db.add(cache)

        db.commit()
    finally:
        db.close()


async def get_nutrition_for_product(product_name: str) -> dict:
    """
    Get nutrition data for a product, using cache if available.

    This function:
    1. Checks the cache for previously fetched data
    2. Tries multiple simplified search queries
    3. Falls back to branded food search if needed

    Note: Non-food items should be filtered out before calling this function
    by checking the product's is_food field in the database.
    """
    print(f"\n--- Fetching nutrition for: {product_name} ---")

    # Step 1: Check cache first
    cached = get_cached_nutrition(product_name)
    if cached:
        print(f"  Found in cache")
        cached["cached"] = True
        return cached

    # Step 2: Generate simplified search queries
    queries = simplify_query(product_name)
    print(f"  Will try queries: {queries}")

    # Step 3: Try each query until we get a match
    food_data = None
    successful_query = None

    for query in queries:
        print(f"  Trying query: '{query}'")
        food_data = await search_food(query, include_branded=False)
        if food_data:
            successful_query = query
            break

    # Step 4: If no match, try with branded foods included
    if not food_data and queries:
        print(f"  No match found, trying with branded foods...")
        for query in queries[:2]:  # Only try first 2 queries with branded
            food_data = await search_food(query, include_branded=True)
            if food_data:
                successful_query = query + " (branded)"
                break

    # Step 5: If still no match, return error
    if not food_data:
        print(f"  No nutrition data found for any query variation")
        # Cache the "not found" result to avoid repeated API calls
        not_found_result = {
            "error": "No nutrition data found for this product",
            "queries_tried": queries,
            "cached": False
        }
        save_nutrition_cache(product_name, None, not_found_result)
        return not_found_result

    # Step 6: Extract nutrients from the matched food
    print(f"  Success! Matched with query: '{successful_query}'")
    nutrition = extract_nutrients(food_data)
    nutrition["cached"] = False
    nutrition["matched_query"] = successful_query
    nutrition["usda_description"] = food_data.get("description", "")

    # Step 7: Save to cache
    save_nutrition_cache(product_name, nutrition.get("fdc_id"), nutrition)

    return nutrition
