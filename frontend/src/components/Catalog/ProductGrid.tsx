import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { api } from '../../services/api';
import ProductCard from './ProductCard';
import { Package } from 'lucide-react';
import { ProductGridSkeleton } from '../UI/Skeleton';
import type { Product } from '../../types';

// Detect touch device to disable stagger animations that block touch events
const isTouchDevice = (): boolean => {
  if (typeof window === 'undefined') return false;
  return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
};

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.03,
      duration: 0.2
    }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.2 }
  }
};

interface SelectedCategory {
  name: string;
  subcategory?: string;
}

interface ProductGridProps {
  searchQuery: string;
  selectedCategory: SelectedCategory | string | null;
}

export default function ProductGrid({ searchQuery, selectedCategory }: ProductGridProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const isTouch = useMemo(() => isTouchDevice(), []);

  useEffect(() => {
    loadProducts();
  }, [searchQuery, selectedCategory]);

  const loadProducts = async () => {
    try {
      setLoading(true);
      setError(null);
      const categoryObj = typeof selectedCategory === 'object' ? selectedCategory : null;
      const data = await api.getProducts({
        search: searchQuery || undefined,
        category: categoryObj?.name || undefined,
        subcategory: categoryObj?.subcategory || undefined
      });
      setProducts(data);
    } catch (err) {
      setError('Failed to load products. Make sure the backend is running.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <ProductGridSkeleton count={8} />;
  }

  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg p-4 text-red-700 dark:text-red-300">
        {error}
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-gray-500 dark:text-gray-400">
        <Package className="w-16 h-16 mb-4 opacity-50" />
        <p className="text-lg font-medium">No products found</p>
        <p className="text-sm mt-1">Try adjusting your search or filters</p>
      </div>
    );
  }

  // On touch devices, skip stagger animation entirely to prevent touch event blocking
  if (isTouch) {
    return (
      <div>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          {products.length} product{products.length !== 1 ? 's' : ''} found
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {products.map(product => (
            <div key={product.id}>
              <ProductCard product={product} />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
        {products.length} product{products.length !== 1 ? 's' : ''} found
      </p>
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
      >
        {products.map(product => (
          <motion.div key={product.id} variants={itemVariants}>
            <ProductCard product={product} />
          </motion.div>
        ))}
      </motion.div>
    </div>
  );
}
