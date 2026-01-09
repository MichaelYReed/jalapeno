const API_BASE = '/api';

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
