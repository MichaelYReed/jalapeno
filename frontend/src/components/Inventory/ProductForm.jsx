import { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { X, Camera, Loader2, AlertCircle } from 'lucide-react';
import Quagga from '@ericblade/quagga2';

const UNITS = ['lb', 'each', 'oz', 'bag', 'box', 'bottle', 'can', 'bunch', 'pack', 'dozen', 'gallon', 'pint'];

export default function ProductForm({ product, categories, onSave, onClose }) {
  const isEdit = !!product;
  const [formData, setFormData] = useState({
    name: product?.name || '',
    description: product?.description || '',
    category: product?.category || '',
    subcategory: product?.subcategory || '',
    unit: product?.unit || 'each',
    price: product?.price?.toString() || '',
    image_url: product?.image_url || '',
    in_stock: product?.in_stock ?? 1,
    is_food: product?.is_food ?? 1,
    barcode: product?.barcode || ''
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [lookingUp, setLookingUp] = useState(false);
  const scannerRef = useRef(null);
  const isProcessingRef = useRef(false);

  const selectedCategory = categories.find(c => c.name === formData.category);
  const subcategories = selectedCategory?.subcategories || [];

  const stopScanner = useCallback(() => {
    Quagga.stop();
    setScanning(false);
  }, []);

  const initScanner = useCallback(() => {
    if (!scannerRef.current) return;

    isProcessingRef.current = false;

    Quagga.init({
      inputStream: {
        name: "Live",
        type: "LiveStream",
        target: scannerRef.current,
        constraints: {
          facingMode: "environment",
          width: { min: 640, ideal: 1280, max: 1920 },
          height: { min: 480, ideal: 720, max: 1080 },
        },
      },
      locator: {
        patchSize: "medium",
        halfSample: true,
      },
      numOfWorkers: navigator.hardwareConcurrency || 4,
      decoder: {
        readers: [
          "ean_reader",
          "ean_8_reader",
          "upc_reader",
          "upc_e_reader",
          "code_128_reader",
          "code_39_reader",
        ],
      },
      locate: true,
    }, (err) => {
      if (err) {
        console.error('Quagga init error:', err);
        setError('Failed to start camera: ' + err.message);
        setScanning(false);
        return;
      }

      Quagga.start();
    });

    Quagga.onDetected((result) => {
      if (isProcessingRef.current) return;

      const code = result.codeResult.code;
      if (!code) return;

      const errors = result.codeResult.decodedCodes
        .filter(x => x.error !== undefined)
        .map(x => x.error);
      const avgError = errors.reduce((a, b) => a + b, 0) / errors.length;

      if (avgError > 0.1) {
        return;
      }

      isProcessingRef.current = true;
      stopScanner();
      handleBarcodeScanned(code);
    });
  }, [stopScanner]);

  // Initialize scanner when scanning becomes true
  useEffect(() => {
    if (scanning && scannerRef.current) {
      const timer = setTimeout(() => initScanner(), 100);
      return () => clearTimeout(timer);
    }
  }, [scanning, initScanner]);

  const startScanner = () => {
    setScanning(true);
  };

  const handleBarcodeScanned = async (barcode) => {
    setFormData(prev => ({ ...prev, barcode }));
    setLookingUp(true);

    try {
      // Try to lookup in Open Food Facts to pre-fill form
      const response = await fetch(`https://world.openfoodfacts.org/api/v0/product/${barcode}.json`);
      const data = await response.json();

      if (data.status === 1 && data.product) {
        const p = data.product;
        setFormData(prev => ({
          ...prev,
          name: p.product_name || p.product_name_en || prev.name,
          description: p.generic_name || prev.description,
          image_url: p.image_url || p.image_front_url || prev.image_url,
        }));
      }
    } catch (err) {
      console.error('Failed to lookup barcode:', err);
    } finally {
      setLookingUp(false);
    }
  };

  useEffect(() => {
    return () => {
      Quagga.stop();
      Quagga.offDetected();
    };
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (!formData.name.trim()) {
      setError('Product name is required');
      return;
    }
    if (!formData.category) {
      setError('Category is required');
      return;
    }
    if (!formData.price || isNaN(parseFloat(formData.price)) || parseFloat(formData.price) <= 0) {
      setError('Valid price is required');
      return;
    }

    setSaving(true);
    try {
      const submitData = {
        ...formData,
        price: parseFloat(formData.price),
        in_stock: formData.in_stock ? 1 : 0,
        is_food: formData.is_food ? 1 : 0,
      };

      // Remove empty optional fields
      if (!submitData.description) delete submitData.description;
      if (!submitData.subcategory) delete submitData.subcategory;
      if (!submitData.image_url) delete submitData.image_url;
      if (!submitData.barcode) delete submitData.barcode;

      await onSave(submitData, isEdit);
    } catch (err) {
      setError(err.message || 'Failed to save product');
    } finally {
      setSaving(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.95, y: 20 }}
        className="bg-white dark:bg-slate-800 rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-xl"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
            {isEdit ? 'Edit Product' : 'Add Product'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Error */}
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
              <p className="text-red-700 dark:text-red-400">{error}</p>
            </div>
          )}

          {/* Barcode Scanner */}
          {!isEdit && (
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Barcode
              </label>
              {scanning ? (
                <div className="space-y-2">
                  <div
                    ref={scannerRef}
                    className="w-full aspect-video rounded-lg overflow-hidden bg-black relative"
                  >
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <div className="w-4/5 h-20 border-2 border-amber-400/50 rounded-lg" />
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={stopScanner}
                    className="w-full py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                  >
                    Cancel Scan
                  </button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={formData.barcode}
                    onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                    placeholder="Enter or scan barcode"
                    className="flex-1 px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 dark:text-gray-100 focus:ring-2 focus:ring-amber-500 outline-none transition-colors"
                  />
                  <button
                    type="button"
                    onClick={startScanner}
                    className="px-4 py-2 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 rounded-lg hover:bg-amber-200 dark:hover:bg-amber-900/50 transition-colors flex items-center gap-2"
                  >
                    <Camera className="w-5 h-5" />
                    Scan
                  </button>
                </div>
              )}
              {lookingUp && (
                <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="text-sm">Looking up product info...</span>
                </div>
              )}
            </div>
          )}

          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Name *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 dark:text-gray-100 focus:ring-2 focus:ring-amber-500 outline-none transition-colors"
              placeholder="Product name"
              required
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={2}
              className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 dark:text-gray-100 focus:ring-2 focus:ring-amber-500 outline-none transition-colors resize-none"
              placeholder="Optional description"
            />
          </div>

          {/* Category & Subcategory */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Category *
              </label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value, subcategory: '' })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 dark:text-gray-100 focus:ring-2 focus:ring-amber-500 outline-none transition-colors"
                required
              >
                <option value="">Select category</option>
                {categories.map(cat => (
                  <option key={cat.name} value={cat.name}>{cat.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Subcategory
              </label>
              <select
                value={formData.subcategory}
                onChange={(e) => setFormData({ ...formData, subcategory: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 dark:text-gray-100 focus:ring-2 focus:ring-amber-500 outline-none transition-colors"
                disabled={!formData.category || subcategories.length === 0}
              >
                <option value="">None</option>
                {subcategories.map(sub => (
                  <option key={sub} value={sub}>{sub}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Price & Unit */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Price *
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                  className="w-full pl-8 pr-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 dark:text-gray-100 focus:ring-2 focus:ring-amber-500 outline-none transition-colors"
                  placeholder="0.00"
                  required
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Unit *
              </label>
              <select
                value={formData.unit}
                onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 dark:text-gray-100 focus:ring-2 focus:ring-amber-500 outline-none transition-colors"
                required
              >
                {UNITS.map(unit => (
                  <option key={unit} value={unit}>{unit}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Image URL */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Image URL
            </label>
            <input
              type="url"
              value={formData.image_url}
              onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 dark:text-gray-100 focus:ring-2 focus:ring-amber-500 outline-none transition-colors"
              placeholder="https://..."
            />
            {formData.image_url && (
              <div className="mt-2">
                <img
                  src={formData.image_url}
                  alt="Preview"
                  className="w-20 h-20 object-cover rounded-lg"
                  onError={(e) => e.target.style.display = 'none'}
                />
              </div>
            )}
          </div>

          {/* Stock & Food Item */}
          <div className="flex items-center gap-6">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.in_stock === 1}
                onChange={(e) => setFormData({ ...formData, in_stock: e.target.checked ? 1 : 0 })}
                className="w-5 h-5 rounded border-gray-300 text-amber-500 focus:ring-amber-500"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">In Stock</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.is_food === 1}
                onChange={(e) => setFormData({ ...formData, is_food: e.target.checked ? 1 : 0 })}
                className="w-5 h-5 rounded border-gray-300 text-amber-500 focus:ring-amber-500"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">Food Item (has nutrition data)</span>
            </label>
          </div>

          {/* Actions */}
          <div className="flex gap-3 justify-end pt-4 border-t border-gray-200 dark:border-slate-700">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2 bg-amber-500 hover:bg-amber-600 disabled:bg-amber-300 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
            >
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              {isEdit ? 'Save Changes' : 'Add Product'}
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}
