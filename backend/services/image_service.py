"""Unsplash image search service for product images"""
import httpx

UNSPLASH_ACCESS_KEY = "xaqZd4jBjV5BNd6npPFL-ENIwEI06NA6RJPa6W0d-lc"


async def search_unsplash_image(query: str) -> str | None:
    """Search Unsplash for an image matching the query"""
    url = "https://api.unsplash.com/search/photos"
    params = {
        "query": f"{query} food",
        "per_page": 1,
        "orientation": "squarish"
    }
    headers = {"Authorization": f"Client-ID {UNSPLASH_ACCESS_KEY}"}

    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            response = await client.get(url, params=params, headers=headers)
            if response.status_code == 200:
                data = response.json()
                if data.get("results"):
                    return data["results"][0]["urls"]["small"]
    except Exception:
        pass
    return None
