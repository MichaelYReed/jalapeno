import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShoppingCart, MessageSquare, Package, Menu, X, Moon, Sun, Camera, PackageOpen } from 'lucide-react';
import ProductGrid from './components/Catalog/ProductGrid';
import CategorySidebar from './components/Catalog/CategorySidebar';
import CartDrawer from './components/Cart/CartDrawer';
import Chat from './components/AIAssistant/Chat';
import OrderHistory from './components/Orders/OrderHistory';
import BarcodeScanner from './components/BarcodeScanner/BarcodeScanner';
import InventoryPage from './components/Inventory/InventoryPage';
import ToastContainer from './components/UI/Toast';
import { useCart } from './context/CartContext';
import { useTheme } from './context/ThemeContext';
import { useToast } from './context/ToastContext';

function App() {
  const { isDark, toggleTheme } = useTheme();
  const [activeTab, setActiveTab] = useState('catalog');
  const [cartOpen, setCartOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);
  const { getItemCount } = useCart();
  const toast = useToast();

  const itemCount = getItemCount();

  // Lock body scroll when mobile sidebar is open
  useEffect(() => {
    if (sidebarOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [sidebarOpen]);

  // Listen for delivery notification events (fallback for mobile)
  useEffect(() => {
    const handleDeliveryNotification = (event) => {
      const { title, message } = event.detail;
      toast.success(`${title} ${message}`);
    };

    window.addEventListener('deliveryNotification', handleDeliveryNotification);
    return () => {
      window.removeEventListener('deliveryNotification', handleDeliveryNotification);
    };
  }, [toast]);

  return (
    <>
    <div className="min-h-screen bg-gray-50 dark:bg-slate-950 transition-colors">
      {/* Header */}
      <header className="bg-white dark:bg-slate-900 shadow-sm dark:shadow-slate-800/50 sticky top-0 z-40 transition-colors">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="lg:hidden p-2 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
              >
                <Menu className="w-6 h-6 dark:text-gray-200" />
              </button>
              <h1 className="text-2xl font-bold text-primary-600 dark:text-primary-400">
                Jalapeño
              </h1>
            </div>

            {/* Navigation */}
            <nav className="hidden md:flex items-center gap-2">
              <button
                onClick={() => setActiveTab('catalog')}
                className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-colors ${
                  activeTab === 'catalog'
                    ? 'bg-primary-100 text-primary-700 dark:bg-primary-900/50 dark:text-primary-300'
                    : 'hover:bg-gray-100 dark:hover:bg-slate-800 dark:text-gray-200'
                }`}
              >
                <Package className="w-5 h-5" />
                Catalog
              </button>
              <button
                onClick={() => setActiveTab('assistant')}
                className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-colors ${
                  activeTab === 'assistant'
                    ? 'bg-primary-100 text-primary-700 dark:bg-primary-900/50 dark:text-primary-300'
                    : 'hover:bg-gray-100 dark:hover:bg-slate-800 dark:text-gray-200'
                }`}
              >
                <MessageSquare className="w-5 h-5" />
                AI Assistant
              </button>
              <button
                onClick={() => setActiveTab('orders')}
                className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-colors ${
                  activeTab === 'orders'
                    ? 'bg-primary-100 text-primary-700 dark:bg-primary-900/50 dark:text-primary-300'
                    : 'hover:bg-gray-100 dark:hover:bg-slate-800 dark:text-gray-200'
                }`}
              >
                <Package className="w-5 h-5" />
                Orders
              </button>
              <button
                onClick={() => setActiveTab('inventory')}
                className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-colors ${
                  activeTab === 'inventory'
                    ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300'
                    : 'hover:bg-gray-100 dark:hover:bg-slate-800 dark:text-gray-200'
                }`}
              >
                <PackageOpen className="w-5 h-5" />
                Inventory
              </button>
            </nav>

            {/* Theme Toggle & Cart */}
            <div className="flex items-center gap-2">
              <button
                onClick={toggleTheme}
                className="p-2 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                aria-label="Toggle dark mode"
              >
                {isDark ? (
                  <Sun className="w-6 h-6 text-yellow-500" />
                ) : (
                  <Moon className="w-6 h-6 text-slate-600" />
                )}
              </button>
              <button
                onClick={() => setCartOpen(true)}
                className="relative p-2 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
              >
                <ShoppingCart className="w-6 h-6 dark:text-gray-200" />
                {itemCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-primary-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center">
                    {itemCount}
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* Mobile Navigation */}
          <nav className="md:hidden flex items-center gap-2 mt-4 overflow-x-auto pb-2">
            <button
              onClick={() => setActiveTab('catalog')}
              className={`px-4 py-2 rounded-lg flex items-center gap-2 whitespace-nowrap transition-colors ${
                activeTab === 'catalog'
                  ? 'bg-primary-100 text-primary-700 dark:bg-primary-900/50 dark:text-primary-300'
                  : 'bg-gray-100 dark:bg-slate-800 dark:text-gray-200'
              }`}
            >
              <Package className="w-4 h-4" />
              Catalog
            </button>
            <button
              onClick={() => setActiveTab('assistant')}
              className={`px-4 py-2 rounded-lg flex items-center gap-2 whitespace-nowrap transition-colors ${
                activeTab === 'assistant'
                  ? 'bg-primary-100 text-primary-700 dark:bg-primary-900/50 dark:text-primary-300'
                  : 'bg-gray-100 dark:bg-slate-800 dark:text-gray-200'
              }`}
            >
              <MessageSquare className="w-4 h-4" />
              AI Assistant
            </button>
            <button
              onClick={() => setActiveTab('orders')}
              className={`px-4 py-2 rounded-lg flex items-center gap-2 whitespace-nowrap transition-colors ${
                activeTab === 'orders'
                  ? 'bg-primary-100 text-primary-700 dark:bg-primary-900/50 dark:text-primary-300'
                  : 'bg-gray-100 dark:bg-slate-800 dark:text-gray-200'
              }`}
            >
              <Package className="w-4 h-4" />
              Orders
            </button>
            <button
              onClick={() => setActiveTab('inventory')}
              className={`px-4 py-2 rounded-lg flex items-center gap-2 whitespace-nowrap transition-colors ${
                activeTab === 'inventory'
                  ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300'
                  : 'bg-gray-100 dark:bg-slate-800 dark:text-gray-200'
              }`}
            >
              <PackageOpen className="w-4 h-4" />
              Inventory
            </button>
          </nav>

          {/* Search Bar - Only show on catalog */}
          {activeTab === 'catalog' && (
            <div className="mt-4 flex gap-2">
              <input
                type="text"
                placeholder="Search products..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 dark:text-gray-100 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:focus:border-primary-400 outline-none placeholder:text-gray-400 dark:placeholder:text-gray-500 transition-colors"
              />
              <button
                onClick={() => setScannerOpen(true)}
                className="p-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
                title="Scan barcode"
              >
                <Camera className="w-6 h-6 text-gray-600 dark:text-gray-300" />
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Mobile Sidebar */}
      <AnimatePresence>
        {sidebarOpen && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="absolute inset-0 bg-black/50"
              onClick={() => setSidebarOpen(false)}
            />
            <motion.aside
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'tween', duration: 0.3 }}
              className="absolute left-0 top-0 h-full w-72 bg-white dark:bg-slate-900 shadow-xl p-4 overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold text-lg dark:text-gray-100">Categories</h2>
                <button
                  onClick={() => setSidebarOpen(false)}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg"
                >
                  <X className="w-5 h-5 dark:text-gray-200" />
                </button>
              </div>
              <CategorySidebar
                selectedCategory={selectedCategory}
                onSelectCategory={(cat) => {
                  setSelectedCategory(cat);
                  setSidebarOpen(false);
                }}
              />
            </motion.aside>
          </div>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        <AnimatePresence mode="wait">
          {activeTab === 'catalog' && (
            <motion.div
              key="catalog"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="flex gap-6"
            >
              {/* Sidebar - Desktop */}
              <aside className="hidden lg:block w-64 flex-shrink-0">
                <CategorySidebar
                  selectedCategory={selectedCategory}
                  onSelectCategory={setSelectedCategory}
                />
              </aside>

              {/* Product Grid */}
              <div className="flex-1">
                <ProductGrid
                  searchQuery={searchQuery}
                  selectedCategory={selectedCategory}
                />
              </div>
            </motion.div>
          )}

          {activeTab === 'assistant' && (
            <motion.div
              key="assistant"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              <Chat />
            </motion.div>
          )}

          {activeTab === 'orders' && (
            <motion.div
              key="orders"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              <OrderHistory />
            </motion.div>
          )}

          {activeTab === 'inventory' && (
            <motion.div
              key="inventory"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              <InventoryPage />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Cart Drawer */}
      <CartDrawer open={cartOpen} onClose={() => setCartOpen(false)} />

      {/* Barcode Scanner */}
      <BarcodeScanner isOpen={scannerOpen} onClose={() => setScannerOpen(false)} />

      {/* Toast Notifications */}
      <ToastContainer />
    </div>
    </>
  );
}

export default App;
