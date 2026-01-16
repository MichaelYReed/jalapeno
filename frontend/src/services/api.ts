import type { Product, Order, OrderStatus, Category, NutritionData, ProductCreateData, OrderCreateItem, ChatSuggestion } from '../types';

const API_BASE = import.meta.env.VITE_API_URL || '/api';

interface ProductFilters {
  search?: string;
  category?: string;
  subcategory?: string;
}

interface ChatStreamCallbacks {
  onChunk?: (content: string) => void;
  onSuggestions?: (suggestions: ChatSuggestion[]) => void;
  onCartAdd?: (items: Array<{ product: Product; quantity: number }>) => void;
  onDone?: () => void;
  onError?: (message: string) => void;
}

interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
}

export const api = {
  // Products
  async getProducts(filters: ProductFilters = {}): Promise<Product[]> {
    const params = new URLSearchParams();
    if (filters.search) params.append('search', filters.search);
    if (filters.category) params.append('category', filters.category);
    if (filters.subcategory) params.append('subcategory', filters.subcategory);

    const response = await fetch(`${API_BASE}/products?${params}`);
    if (!response.ok) throw new Error('Failed to fetch products');
    return response.json();
  },

  async getProduct(id: number): Promise<Product> {
    const response = await fetch(`${API_BASE}/products/${id}`);
    if (!response.ok) throw new Error('Failed to fetch product');
    return response.json();
  },

  async getNutrition(productId: number): Promise<NutritionData> {
    const response = await fetch(`${API_BASE}/products/${productId}/nutrition`);
    if (!response.ok) throw new Error('Failed to fetch nutrition');
    return response.json();
  },

  async getProductByBarcode(barcode: string): Promise<Product | null> {
    const response = await fetch(`${API_BASE}/products/barcode/${encodeURIComponent(barcode)}`);
    if (response.status === 404) return null;
    if (!response.ok) throw new Error('Failed to lookup barcode');
    return response.json();
  },

  async createProduct(productData: ProductCreateData): Promise<Product> {
    const response = await fetch(`${API_BASE}/products`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(productData)
    });
    if (!response.ok) throw new Error('Failed to create product');
    return response.json();
  },

  async updateProduct(id: number, productData: Partial<ProductCreateData>): Promise<Product> {
    const response = await fetch(`${API_BASE}/products/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(productData)
    });
    if (!response.ok) throw new Error('Failed to update product');
    return response.json();
  },

  async deleteProduct(id: number): Promise<boolean> {
    const response = await fetch(`${API_BASE}/products/${id}`, {
      method: 'DELETE'
    });
    if (!response.ok) throw new Error('Failed to delete product');
    return true;
  },

  async searchProductImage(query: string): Promise<string | null> {
    try {
      const response = await fetch(`${API_BASE}/images/search?q=${encodeURIComponent(query)}`);
      if (!response.ok) return null;
      const data = await response.json();
      return data.image_url;
    } catch {
      return null;
    }
  },

  async getCategories(): Promise<Category[]> {
    const response = await fetch(`${API_BASE}/categories`);
    if (!response.ok) throw new Error('Failed to fetch categories');
    return response.json();
  },

  async autocomplete(query: string): Promise<Product[]> {
    const response = await fetch(`${API_BASE}/products/search/autocomplete?q=${encodeURIComponent(query)}`);
    if (!response.ok) throw new Error('Failed to fetch suggestions');
    return response.json();
  },

  // Orders
  async createOrder(items: OrderCreateItem[]): Promise<Order> {
    const response = await fetch(`${API_BASE}/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items })
    });
    if (!response.ok) throw new Error('Failed to create order');
    return response.json();
  },

  async getOrders(): Promise<Order[]> {
    const response = await fetch(`${API_BASE}/orders`);
    if (!response.ok) throw new Error('Failed to fetch orders');
    return response.json();
  },

  async getOrder(id: number): Promise<Order> {
    const response = await fetch(`${API_BASE}/orders/${id}`);
    if (!response.ok) throw new Error('Failed to fetch order');
    return response.json();
  },

  async updateOrderStatus(orderId: number, status: OrderStatus): Promise<Order> {
    const response = await fetch(`${API_BASE}/orders/${orderId}/status?status=${status}`, {
      method: 'PATCH'
    });
    if (!response.ok) throw new Error('Failed to update order status');
    return response.json();
  },

  // AI Assistant
  async chat(message: string, conversationHistory: ConversationMessage[] = []): Promise<{ response: string; suggestions?: ChatSuggestion[] }> {
    const response = await fetch(`${API_BASE}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message,
        conversation_history: conversationHistory
      })
    });
    if (!response.ok) throw new Error('Failed to send message');
    return response.json();
  },

  async chatStream(
    message: string,
    conversationHistory: ConversationMessage[] = [],
    onChunk?: ChatStreamCallbacks['onChunk'],
    onSuggestions?: ChatStreamCallbacks['onSuggestions'],
    onCartAdd?: ChatStreamCallbacks['onCartAdd'],
    onDone?: ChatStreamCallbacks['onDone'],
    onError?: ChatStreamCallbacks['onError']
  ): Promise<void> {
    const response = await fetch(`${API_BASE}/chat/stream`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message,
        conversation_history: conversationHistory
      })
    });

    if (!response.ok) {
      throw new Error('Failed to start stream');
    }

    const reader = response.body!.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      // Process complete SSE messages
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const data = JSON.parse(line.slice(6));
            if (data.type === 'text') {
              onChunk?.(data.content);
            } else if (data.type === 'suggestions') {
              onSuggestions?.(data.suggestions);
            } else if (data.type === 'cart_add') {
              onCartAdd?.(data.items);
            } else if (data.type === 'done') {
              onDone?.();
            } else if (data.type === 'error') {
              onError?.(data.message);
            }
          } catch {
            console.warn('Failed to parse SSE data:', line);
          }
        }
      }
    }
  },

  async voiceTranscribe(audioBase64: string): Promise<{ transcribed_text: string }> {
    const response = await fetch(`${API_BASE}/voice/transcribe`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ audio_base64: audioBase64 })
    });
    if (!response.ok) throw new Error('Failed to transcribe voice');
    return response.json();
  },

  async voiceOrder(audioBase64: string, conversationHistory: { role: string; content: string }[] = []): Promise<{ transcription: string; response: string; suggestions?: ChatSuggestion[] }> {
    const response = await fetch(`${API_BASE}/voice`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        audio_base64: audioBase64,
        conversation_history: conversationHistory
      })
    });
    if (!response.ok) throw new Error('Failed to process voice');
    return response.json();
  },

  async getChatSuggestions(): Promise<string[]> {
    const response = await fetch(`${API_BASE}/chat/suggestions`);
    if (!response.ok) throw new Error('Failed to fetch suggestions');
    return response.json();
  }
};
