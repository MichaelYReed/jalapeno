const API_BASE = import.meta.env.VITE_API_URL || '/api';

export const api = {
  // Products
  async getProducts({ search, category, subcategory } = {}) {
    const params = new URLSearchParams();
    if (search) params.append('search', search);
    if (category) params.append('category', category);
    if (subcategory) params.append('subcategory', subcategory);

    const response = await fetch(`${API_BASE}/products?${params}`);
    if (!response.ok) throw new Error('Failed to fetch products');
    return response.json();
  },

  async getProduct(id) {
    const response = await fetch(`${API_BASE}/products/${id}`);
    if (!response.ok) throw new Error('Failed to fetch product');
    return response.json();
  },

  async getNutrition(productId) {
    const response = await fetch(`${API_BASE}/products/${productId}/nutrition`);
    if (!response.ok) throw new Error('Failed to fetch nutrition');
    return response.json();
  },

  async getProductByBarcode(barcode) {
    const response = await fetch(`${API_BASE}/products/barcode/${encodeURIComponent(barcode)}`);
    if (response.status === 404) return null;
    if (!response.ok) throw new Error('Failed to lookup barcode');
    return response.json();
  },

  async createProduct(productData) {
    const response = await fetch(`${API_BASE}/products`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(productData)
    });
    if (!response.ok) throw new Error('Failed to create product');
    return response.json();
  },

  async updateProduct(id, productData) {
    const response = await fetch(`${API_BASE}/products/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(productData)
    });
    if (!response.ok) throw new Error('Failed to update product');
    return response.json();
  },

  async deleteProduct(id) {
    const response = await fetch(`${API_BASE}/products/${id}`, {
      method: 'DELETE'
    });
    if (!response.ok) throw new Error('Failed to delete product');
    return true;
  },

  async searchProductImage(query) {
    try {
      const response = await fetch(`${API_BASE}/images/search?q=${encodeURIComponent(query)}`);
      if (!response.ok) return null;
      const data = await response.json();
      return data.image_url;
    } catch {
      return null;
    }
  },

  async getCategories() {
    const response = await fetch(`${API_BASE}/categories`);
    if (!response.ok) throw new Error('Failed to fetch categories');
    return response.json();
  },

  async autocomplete(query) {
    const response = await fetch(`${API_BASE}/products/search/autocomplete?q=${encodeURIComponent(query)}`);
    if (!response.ok) throw new Error('Failed to fetch suggestions');
    return response.json();
  },

  // Orders
  async createOrder(items) {
    const response = await fetch(`${API_BASE}/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items })
    });
    if (!response.ok) throw new Error('Failed to create order');
    return response.json();
  },

  async getOrders() {
    const response = await fetch(`${API_BASE}/orders`);
    if (!response.ok) throw new Error('Failed to fetch orders');
    return response.json();
  },

  async getOrder(id) {
    const response = await fetch(`${API_BASE}/orders/${id}`);
    if (!response.ok) throw new Error('Failed to fetch order');
    return response.json();
  },

  // AI Assistant
  async chat(message, conversationHistory = []) {
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

  async chatStream(message, conversationHistory = [], onChunk, onSuggestions, onCartAdd, onDone, onError) {
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

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      // Process complete SSE messages
      const lines = buffer.split('\n');
      buffer = lines.pop(); // Keep incomplete line in buffer

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
          } catch (e) {
            console.warn('Failed to parse SSE data:', line);
          }
        }
      }
    }
  },

  async voiceOrder(audioBase64) {
    const response = await fetch(`${API_BASE}/voice`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ audio_base64: audioBase64 })
    });
    if (!response.ok) throw new Error('Failed to process voice');
    return response.json();
  },

  async getChatSuggestions() {
    const response = await fetch(`${API_BASE}/chat/suggestions`);
    if (!response.ok) throw new Error('Failed to fetch suggestions');
    return response.json();
  }
};
