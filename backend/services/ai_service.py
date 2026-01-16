import os
import json
import re
import base64
from openai import OpenAI
from typing import List, Optional, AsyncGenerator
from sqlalchemy.orm import Session

from database import Product
from services.cache import cache_get, cache_set, CACHE_TTL_AI_CONTEXT

# Lazy client initialization
_client = None

def get_client():
    global _client
    if _client is None:
        api_key = os.getenv("OPENAI_API_KEY")
        if not api_key:
            raise ValueError("OPENAI_API_KEY environment variable is not set")
        _client = OpenAI(api_key=api_key)
    return _client

SYSTEM_PROMPT = """You are a helpful food ordering assistant for a food distribution company.
Your job is to help customers order food products by understanding their natural language requests.

When a user asks for products, you should:
1. Identify the products they want
2. Determine the quantities they need
3. Handle ambiguous requests by asking clarifying questions

You have access to a product catalog. When matching products, consider:
- Common food names and their variations (e.g., "chicken breast" = "boneless chicken breast")
- Standard quantities (e.g., "a dozen" = 12, "a case" = product-specific)
- Units of measurement (lb, gallon, each, case, etc.)

Always respond in JSON format with the following structure:
{
    "message": "Your friendly response to the user",
    "product_matches": [
        {
            "search_term": "what the user asked for",
            "suggested_quantity": number,
            "confidence": 0.0-1.0
        }
    ],
    "needs_clarification": true/false,
    "clarification_question": "optional question if needs_clarification is true"
}

Be friendly, helpful, and efficient. If you're not sure about something, ask!"""

SYSTEM_PROMPT_STREAMING = """You are a helpful food ordering assistant for a food distribution company.
Your job is to help customers order food products by understanding their natural language requests.

CRITICAL: You have TWO different marker formats. Using the wrong one will break the system:

1. [[product:ProductName:quantity]] - Shows a suggestion card. Use for browsing/recommendations.
   Example: "I'd recommend [[product:Roma Tomatoes:2]] for your recipe! Should I add this to your cart?"

2. [[add-to-cart:ProductName:quantity]] - ACTUALLY ADDS to cart. Use for confirmed additions.
   Example: "Done! I've added [[add-to-cart:Roma Tomatoes:2]] to your cart!"

WORKFLOW:
- DIRECT COMMAND (e.g., "Add 12 limes to my cart", "Put 5 lbs of beef in cart"):
  -> User wants it added NOW. Use [[add-to-cart:...]] immediately.
  -> Say "Done! I've added [[add-to-cart:Limes:12]] to your cart!"

- BROWSING/QUESTION (e.g., "I need limes", "What beef do you have?"):
  -> User is exploring. Use [[product:...]] and ask "Should I add to cart?"

- CONFIRMATION (e.g., "yes", "add them", "go ahead"):
  -> User confirmed a previous suggestion. Use [[add-to-cart:...]]

WARNING: If you say "I've added" but use [[product:...]], the item will NOT be added!
You MUST use [[add-to-cart:...]] when actually adding items.

Rules:
- ProductName must closely match catalog names
- quantity must be a number

Be friendly and conversational. Ask clarifying questions when needed."""


def get_product_catalog_context(db: Session) -> str:
    """Get a summary of available products for the AI context (cached)"""
    # Try cache first
    cache_key = "ai:catalog_context"
    cached = cache_get(cache_key)
    if cached is not None:
        return cached

    # Build catalog context from database
    products = db.query(Product).all()
    catalog = []
    for p in products:
        catalog.append(f"- {p.name} ({p.category}/{p.subcategory}): ${p.price}/{p.unit}")
    result = "Available products:\n" + "\n".join(catalog)

    # Cache result
    cache_set(cache_key, result, CACHE_TTL_AI_CONTEXT)

    return result


async def process_chat_message(
    message: str,
    conversation_history: List[dict],
    db: Session
) -> dict:
    """Process a chat message and return product suggestions"""

    catalog_context = get_product_catalog_context(db)

    messages = [
        {"role": "system", "content": SYSTEM_PROMPT + "\n\n" + catalog_context}
    ]

    # Add conversation history
    for msg in conversation_history:
        messages.append({"role": msg["role"], "content": msg["content"]})

    # Add current message
    messages.append({"role": "user", "content": message})

    try:
        response = get_client().chat.completions.create(
            model="gpt-4o-mini",
            messages=messages,
            temperature=0.7,
            response_format={"type": "json_object"}
        )

        result = json.loads(response.choices[0].message.content)

        # Match products from database
        suggestions = []
        for match in result.get("product_matches", []):
            search_term = match.get("search_term", "")
            products = db.query(Product).filter(
                Product.name.ilike(f"%{search_term}%")
            ).all()

            for product in products[:3]:  # Limit to top 3 matches per search term
                suggestions.append({
                    "product": {
                        "id": product.id,
                        "name": product.name,
                        "description": product.description,
                        "category": product.category,
                        "subcategory": product.subcategory,
                        "unit": product.unit,
                        "price": product.price,
                        "image_url": product.image_url,
                        "in_stock": product.in_stock
                    },
                    "suggested_quantity": match.get("suggested_quantity", 1),
                    "confidence": match.get("confidence", 0.8)
                })

        return {
            "message": result.get("message", "I found some products for you."),
            "suggestions": suggestions,
            "needs_clarification": result.get("needs_clarification", False),
            "clarification_question": result.get("clarification_question")
        }

    except Exception as e:
        return {
            "message": f"I'm sorry, I had trouble processing that request. Could you try rephrasing?",
            "suggestions": [],
            "needs_clarification": True,
            "error": str(e)
        }


def product_to_dict(product: Product) -> dict:
    """Convert a Product model to dictionary"""
    return {
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


def parse_product_markers(text: str, db: Session) -> tuple[str, list, list]:
    """Extract product markers and return clean text + suggestions + cart additions"""
    # Non-greedy patterns to handle product names with colons
    suggestion_pattern = r'\[\[product:(.+?):(\d+)\]\]'
    cart_pattern = r'\[\[add-to-cart:(.+?):(\d+)\]\]'
    suggestions = []
    cart_additions = []

    def replace_suggestion(match):
        name, qty = match.group(1), int(match.group(2))
        product = db.query(Product).filter(
            Product.name.ilike(f"%{name}%")
        ).first()
        if product:
            suggestions.append({
                "product": product_to_dict(product),
                "suggested_quantity": qty,
                "confidence": 0.9
            })
            return product.name
        return name

    def replace_cart_add(match):
        name, qty = match.group(1), int(match.group(2))
        product = db.query(Product).filter(
            Product.name.ilike(f"%{name}%")
        ).first()
        if product:
            cart_additions.append({
                "product": product_to_dict(product),
                "quantity": qty
            })
            return product.name
        return name

    # Process both patterns
    text = re.sub(suggestion_pattern, replace_suggestion, text)
    text = re.sub(cart_pattern, replace_cart_add, text)

    return text, suggestions, cart_additions


async def process_chat_message_stream(
    message: str,
    conversation_history: List[dict],
    db: Session
) -> AsyncGenerator[dict, None]:
    """Stream chat response with inline product markers"""

    catalog_context = get_product_catalog_context(db)

    messages = [
        {"role": "system", "content": SYSTEM_PROMPT_STREAMING + "\n\n" + catalog_context}
    ]

    # Add conversation history
    for msg in conversation_history:
        messages.append({"role": msg["role"], "content": msg["content"]})

    # Add current message
    messages.append({"role": "user", "content": message})

    try:
        # Buffer for handling markers that span chunks
        buffer = ""
        all_suggestions = []
        all_cart_additions = []

        stream = get_client().chat.completions.create(
            model="gpt-4o-mini",
            messages=messages,
            temperature=0.7,
            stream=True,
            timeout=60.0  # 60 second timeout for streaming
        )

        for chunk in stream:
            delta = chunk.choices[0].delta
            if delta.content:
                buffer += delta.content

                # Process complete markers while keeping incomplete ones in buffer
                while "[[" in buffer and "]]" in buffer:
                    start = buffer.find("[[")
                    end = buffer.find("]]") + 2

                    # Yield text before marker
                    if start > 0:
                        yield {"type": "text", "content": buffer[:start]}

                    # Parse the marker
                    marker = buffer[start:end]
                    clean, suggestions, cart_additions = parse_product_markers(marker, db)
                    all_suggestions.extend(suggestions)
                    all_cart_additions.extend(cart_additions)

                    # Yield cleaned product name
                    yield {"type": "text", "content": clean}

                    buffer = buffer[end:]

                # Yield text that's definitely not part of a marker
                # Keep potential incomplete marker in buffer
                if "[[" in buffer:
                    safe_end = buffer.rfind("[[")
                    if safe_end > 0:
                        yield {"type": "text", "content": buffer[:safe_end]}
                        buffer = buffer[safe_end:]
                else:
                    # No potential marker, yield everything
                    if buffer:
                        yield {"type": "text", "content": buffer}
                        buffer = ""

        # Yield any remaining buffer
        if buffer:
            clean, suggestions, cart_additions = parse_product_markers(buffer, db)
            all_suggestions.extend(suggestions)
            all_cart_additions.extend(cart_additions)
            if clean:
                yield {"type": "text", "content": clean}

        # Send suggestions at the end
        if all_suggestions:
            yield {"type": "suggestions", "suggestions": all_suggestions}

        # Send cart additions at the end
        if all_cart_additions:
            yield {"type": "cart_add", "items": all_cart_additions}

        yield {"type": "done"}

    except Exception as e:
        yield {"type": "error", "message": str(e)}
        yield {"type": "done"}


async def transcribe_audio(audio_base64: str) -> str:
    """Transcribe audio using OpenAI Whisper"""
    try:
        # Decode base64 audio
        audio_bytes = base64.b64decode(audio_base64)

        # Create a temporary file-like object
        import io
        audio_file = io.BytesIO(audio_bytes)
        audio_file.name = "audio.webm"

        response = get_client().audio.transcriptions.create(
            model="whisper-1",
            file=audio_file,
            response_format="text"
        )

        return response

    except Exception as e:
        raise Exception(f"Transcription failed: {str(e)}")
