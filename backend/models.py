from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime


# Product schemas
class ProductBase(BaseModel):
    name: str
    description: Optional[str] = None
    category: str
    subcategory: Optional[str] = None
    unit: str
    price: float
    image_url: Optional[str] = None


class ProductCreate(ProductBase):
    pass


class ProductResponse(ProductBase):
    id: int
    in_stock: int

    class Config:
        from_attributes = True


# Order schemas
class OrderItemCreate(BaseModel):
    product_id: int
    quantity: float


class OrderItemResponse(BaseModel):
    id: int
    product_id: int
    quantity: float
    unit_price: float
    product: Optional[ProductResponse] = None

    class Config:
        from_attributes = True


class OrderCreate(BaseModel):
    items: List[OrderItemCreate]


class OrderResponse(BaseModel):
    id: int
    total: float
    status: str
    created_at: datetime
    items: List[OrderItemResponse]

    class Config:
        from_attributes = True


# AI Assistant schemas
class ChatMessage(BaseModel):
    role: str  # "user" or "assistant"
    content: str


class ChatRequest(BaseModel):
    message: str
    conversation_history: Optional[List[ChatMessage]] = []


class ProductSuggestion(BaseModel):
    product: ProductResponse
    suggested_quantity: float
    confidence: float  # 0-1 how confident the AI is about this match


class ChatResponse(BaseModel):
    message: str
    suggestions: List[ProductSuggestion]
    needs_clarification: bool


class VoiceRequest(BaseModel):
    audio_base64: str  # Base64 encoded audio data
