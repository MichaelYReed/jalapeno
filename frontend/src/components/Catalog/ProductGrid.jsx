import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { api } from '../../services/api';
import ProductCard from './ProductCard';
import { Package } from 'lucide-react';
import { ProductGridSkeleton } from '../UI/Skeleton';

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05
    }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 }
};

export default function ProductGrid({ searchQuery, selectedCategory }) {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadProducts();
  }, [searchQuery, selectedCategory]);

  const loadProducts = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.getProducts({
        search: searchQuery || undefined,
        category: selectedCategory?.name || undefined,
        subcategory: selectedCategory?.subcategory || undefined
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
