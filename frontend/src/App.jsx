import { useState } from 'react';
import { ShoppingCart, MessageSquare, Package, Menu, X } from 'lucide-react';
import ProductGrid from './components/Catalog/ProductGrid';
import CategorySidebar from './components/Catalog/CategorySidebar';
import CartDrawer from './components/Cart/CartDrawer';
import Chat from './components/AIAssistant/Chat';
import OrderHistory from './components/Orders/OrderHistory';
import { useCart } from './context/CartContext';

function App() {
  const [activeTab, setActiveTab] = useState('catalog');
  const [cartOpen, setCartOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { getItemCount } = useCart();

  const itemCount = getItemCount();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="lg:hidden p-2 hover:bg-gray-100 rounded-lg"
              >
                <Menu className="w-6 h-6" />
              </button>
              <h1 className="text-2xl font-bold text-primary-600">
                Jalapeño
              </h1>
            </div>

            {/* Navigation */}
            <nav className="hidden md:flex items-center gap-2">
              <button
                onClick={() => setActiveTab('catalog')}
                className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-colors ${
                  activeTab === 'catalog'
                    ? 'bg-primary-100 text-primary-700'
                    : 'hover:bg-gray-100'
                }`}
              >
                <Package className="w-5 h-5" />
                Catalog
              </button>
              <button
                onClick={() => setActiveTab('assistant')}
                className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-colors ${
                  activeTab === 'assistant'
                    ? 'bg-primary-100 text-primary-700'
                    : 'hover:bg-gray-100'
                }`}
              >
                <MessageSquare className="w-5 h-5" />
                AI Assistant
              </button>
              <button
                onClick={() => setActiveTab('orders')}
                className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-colors ${
                  activeTab === 'orders'
                    ? 'bg-primary-100 text-primary-700'
                    : 'hover:bg-gray-100'
                }`}
              >
                <Package className="w-5 h-5" />
                Orders
              </button>
            </nav>

            {/* Cart Button */}
            <button
              onClick={() => setCartOpen(true)}
              className="relative p-2 hover:bg-gray-100 rounded-lg"
            >
              <ShoppingCart className="w-6 h-6" />
              {itemCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-primary-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center">
                  {itemCount}
                </span>
              )}
            </button>
          </div>

          {/* Mobile Navigation */}
          <nav className="md:hidden flex items-center gap-2 mt-4 overflow-x-auto pb-2">
            <button
              onClick={() => setActiveTab('catalog')}
              className={`px-4 py-2 rounded-lg flex items-center gap-2 whitespace-nowrap transition-colors ${
                activeTab === 'catalog'
                  ? 'bg-primary-100 text-primary-700'
                  : 'bg-gray-100'
              }`}
            >
              <Package className="w-4 h-4" />
              Catalog
            </button>
            <button
              onClick={() => setActiveTab('assistant')}
              className={`px-4 py-2 rounded-lg flex items-center gap-2 whitespace-nowrap transition-colors ${
                activeTab === 'assistant'
                  ? 'bg-primary-100 text-primary-700'
                  : 'bg-gray-100'
              }`}
            >
              <MessageSquare className="w-4 h-4" />
              AI Assistant
            </button>
            <button
              onClick={() => setActiveTab('orders')}
              className={`px-4 py-2 rounded-lg flex items-center gap-2 whitespace-nowrap transition-colors ${
                activeTab === 'orders'
                  ? 'bg-primary-100 text-primary-700'
                  : 'bg-gray-100'
              }`}
            >
              <Package className="w-4 h-4" />
              Orders
            </button>
          </nav>

          {/* Search Bar - Only show on catalog */}
          {activeTab === 'catalog' && (
            <div className="mt-4">
              <input
                type="text"
                placeholder="Search products..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
              />
            </div>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        {activeTab === 'catalog' && (
          <div className="flex gap-6">
            {/* Sidebar - Desktop */}
            <aside className="hidden lg:block w-64 flex-shrink-0">
              <CategorySidebar
                selectedCategory={selectedCategory}
                onSelectCategory={setSelectedCategory}
              />
            </aside>

            {/* Mobile Sidebar */}
            {sidebarOpen && (
              <div className="fixed inset-0 z-50 lg:hidden">
                <div
                  className="absolute inset-0 bg-black/50"
                  onClick={() => setSidebarOpen(false)}
                />
                <aside className="absolute left-0 top-0 h-full w-72 bg-white shadow-xl p-4">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="font-semibold text-lg">Categories</h2>
                    <button
                      onClick={() => setSidebarOpen(false)}
                      className="p-2 hover:bg-gray-100 rounded-lg"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                  <CategorySidebar
                    selectedCategory={selectedCategory}
                    onSelectCategory={(cat) => {
                      setSelectedCategory(cat);
                      setSidebarOpen(false);
                    }}
                  />
                </aside>
              </div>
            )}

            {/* Product Grid */}
            <div className="flex-1">
              <ProductGrid
                searchQuery={searchQuery}
                selectedCategory={selectedCategory}
              />
            </div>
          </div>
        )}

        {activeTab === 'assistant' && <Chat />}
        {activeTab === 'orders' && <OrderHistory />}
      </main>

      {/* Cart Drawer */}
      <CartDrawer open={cartOpen} onClose={() => setCartOpen(false)} />
    </div>
  );
}

export default App;
