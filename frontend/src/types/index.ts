// Product types
export interface Product {
  id: number;
  name: string;
  description: string;
  category: string;
  subcategory?: string;
  unit: string;
  price: number;
  image_url?: string;
  in_stock: number;
  is_food: number;
  barcode?: string;
}

// Cart types
export interface CartItem {
  product: Product;
  quantity: number;
}

// Order types
export type OrderStatus = 'pending' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled';

export interface OrderItem {
  id: number;
  order_id?: number;
  product_id: number;
  product?: Product;
  quantity: number;
  unit_price: number;
}

export interface Order {
  id: number;
  status: OrderStatus;
  total: number;
  created_at: string;
  items: OrderItem[];
}

// Chat types
export interface ChatSuggestion {
  product: Product;
  suggested_quantity: number;
}

export interface ChatMessage {
  id?: number;
  role: 'user' | 'assistant';
  content: string;
  isVoice?: boolean;
  isStreaming?: boolean;
  suggestions?: ChatSuggestion[];
  needsClarification?: boolean;
}

// Auth types
export interface User {
  name: string;
  company: string;
}

// Toast types
export type ToastType = 'info' | 'success' | 'error' | 'warning';

export interface Toast {
  id: number;
  message: string;
  type: ToastType;
}

// Category types
export interface Category {
  name: string;
  subcategories: string[];
}

// Nutrition types
export interface NutritionData {
  calories?: number;
  protein?: number;
  carbohydrates?: number;
  fat?: number;
  fiber?: number;
  sugar?: number;
  sodium?: number;
  cholesterol?: number;
  saturated_fat?: number;
  serving_size?: string;
  serving_size_unit?: string;
}

// API response types
export interface ProductCreateData {
  name: string;
  description: string;
  category: string;
  subcategory?: string;
  unit: string;
  price: number;
  image_url?: string;
  in_stock?: number;
  is_food?: number;
  barcode?: string;
}

export interface OrderCreateItem {
  product_id: number;
  quantity: number;
}
