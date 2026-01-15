import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { CartProvider, useCart } from './CartContext';

const wrapper = ({ children }) => <CartProvider>{children}</CartProvider>;

const mockProduct = {
  id: 1,
  name: 'Test Product',
  price: 10.00,
  unit: 'each',
  category: 'Produce',
};

const mockProduct2 = {
  id: 2,
  name: 'Another Product',
  price: 5.50,
  unit: 'lb',
  category: 'Dairy',
};

describe('CartContext', () => {
  describe('addItem', () => {
    it('adds a new item to the cart', () => {
      const { result } = renderHook(() => useCart(), { wrapper });

      act(() => {
        result.current.addItem(mockProduct, 2);
      });

      expect(result.current.items).toHaveLength(1);
      expect(result.current.items[0].product.name).toBe('Test Product');
      expect(result.current.items[0].quantity).toBe(2);
    });

    it('stacks quantity when adding the same item', () => {
      const { result } = renderHook(() => useCart(), { wrapper });

      act(() => {
        result.current.addItem(mockProduct, 2);
      });
      act(() => {
        result.current.addItem(mockProduct, 3);
      });

      expect(result.current.items).toHaveLength(1);
      expect(result.current.items[0].quantity).toBe(5);
    });
  });

  describe('updateQuantity', () => {
    it('updates the quantity of an existing item', () => {
      const { result } = renderHook(() => useCart(), { wrapper });

      act(() => {
        result.current.addItem(mockProduct, 2);
      });
      act(() => {
        result.current.updateQuantity(mockProduct.id, 5);
      });

      expect(result.current.items[0].quantity).toBe(5);
    });

    it('removes item when quantity is set to 0', () => {
      const { result } = renderHook(() => useCart(), { wrapper });

      act(() => {
        result.current.addItem(mockProduct, 2);
      });
      act(() => {
        result.current.updateQuantity(mockProduct.id, 0);
      });

      expect(result.current.items).toHaveLength(0);
    });
  });

  describe('getTotal', () => {
    it('calculates correct total for multiple items', () => {
      const { result } = renderHook(() => useCart(), { wrapper });

      act(() => {
        result.current.addItem(mockProduct, 2);  // $10.00 x 2 = $20.00
        result.current.addItem(mockProduct2, 3); // $5.50 x 3 = $16.50
      });

      // Total should be $36.50
      expect(result.current.getTotal()).toBe(36.50);
    });

    it('returns 0 for empty cart', () => {
      const { result } = renderHook(() => useCart(), { wrapper });

      expect(result.current.getTotal()).toBe(0);
    });
  });

  describe('getItemCount', () => {
    it('returns total quantity of all items', () => {
      const { result } = renderHook(() => useCart(), { wrapper });

      act(() => {
        result.current.addItem(mockProduct, 2);
        result.current.addItem(mockProduct2, 3);
      });

      expect(result.current.getItemCount()).toBe(5);
    });
  });
});
