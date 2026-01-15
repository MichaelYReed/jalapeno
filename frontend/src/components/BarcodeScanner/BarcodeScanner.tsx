import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Camera, AlertCircle, ShoppingCart, Loader2, RotateCcw, Plus, Minus } from 'lucide-react';
import Quagga from '@ericblade/quagga2';
import { api } from '../../services/api';
import { useCart } from '../../context/CartContext';
import type { Product } from '../../types';

interface BarcodeScannerProps {
  isOpen: boolean;
  onClose: () => void;
}

interface BarcodeResult {
  found?: boolean;
  external_name?: string;
  similar_products?: Product[];
}

export default function BarcodeScanner({ isOpen, onClose }: BarcodeScannerProps) {
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scannedProduct, setScannedProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [scannedBarcode, setScannedBarcode] = useState<string | null>(null);
  const [similarProducts, setSimilarProducts] = useState<Product[] | null>(null);
  const [externalName, setExternalName] = useState<string | null>(null);
  const scannerRef = useRef<HTMLDivElement>(null);
  const isProcessingRef = useRef(false);
  const { addItem } = useCart();

  const stopScanner = useCallback(() => {
    Quagga.stop();
    setScanning(false);
  }, []);

  const lookupBarcode = useCallback(async (barcode: string) => {
    setLoading(true);
    setSimilarProducts(null);
    setExternalName(null);
    try {
      const result: Product | BarcodeResult | null = await api.getProductByBarcode(barcode);
      if (result) {
        const barcodeResult = result as BarcodeResult;
        if (barcodeResult.found === false && barcodeResult.similar_products) {
          // Fallback match - show similar products
          setExternalName(barcodeResult.external_name || null);
          setSimilarProducts(barcodeResult.similar_products);
        } else {
          // Direct match
          setScannedProduct(result as Product);
          setQuantity(1);
        }
      } else {
        setError(`No product found for barcode: ${barcode}`);
      }
    } catch (err) {
      console.error('Barcode lookup error:', err);
      setError('Failed to lookup product. Please check your connection.');
    } finally {
      setLoading(false);
    }
  }, []);

  const startScanner = useCallback(() => {
    if (!scannerRef.current) return;

    setError(null);
    setScannedProduct(null);
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
          "code_93_reader",
        ],
      },
      locate: true,
    }, (err) => {
      if (err) {
        console.error('Quagga init error:', err);
        if (err.name === 'NotAllowedError') {
          setError('Camera permission denied. Please allow camera access.');
        } else if (err.name === 'NotFoundError') {
          setError('No camera found on this device.');
        } else {
          setError('Failed to start camera: ' + err.message);
        }
        return;
      }

      Quagga.start();
      setScanning(true);
    });

    Quagga.onDetected((result) => {
      if (isProcessingRef.current) return;

      const code = result.codeResult.code;
      if (!code) return;

      // Check confidence - only accept high-confidence reads
      const errors = result.codeResult.decodedCodes
        .filter((x: { error?: number }) => x.error !== undefined)
        .map((x: { error: number }) => x.error);
      const avgError = errors.reduce((a: number, b: number) => a + b, 0) / errors.length;

      if (avgError > 0.1) {
        console.log('Low confidence scan, ignoring:', code, 'error:', avgError);
        return;
      }

      isProcessingRef.current = true;
      console.log('Barcode detected:', code);

      stopScanner();
      setScannedBarcode(code);
      lookupBarcode(code);
    });

  }, [stopScanner, lookupBarcode]);

  const handleAddToCart = () => {
    if (scannedProduct) {
      addItem(scannedProduct, quantity);
      onClose();
    }
  };

  const handleScanAnother = () => {
    setScannedProduct(null);
    setError(null);
    setQuantity(1);
    setSimilarProducts(null);
    setExternalName(null);
    setTimeout(() => startScanner(), 100);
  };

  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => startScanner(), 300);
      return () => clearTimeout(timer);
    } else {
      stopScanner();
      setScannedProduct(null);
      setError(null);
      setQuantity(1);
      setScannedBarcode(null);
      isProcessingRef.current = false;
    }
  }, [isOpen, startScanner, stopScanner]);

  useEffect(() => {
    return () => {
      Quagga.stop();
      Quagga.offDetected();
    };
  }, []);

  const getCategoryEmoji = (category: string): string => {
    const emojis: Record<string, string> = {
      'Proteins': '🥩',
      'Produce': '🥬',
      'Dairy': '🧀',
      'Dry Goods': '🌾',
      'Beverages': '🥤',
      'Frozen': '❄️',
      'Supplies': '📦'
    };
    return emojis[category] || '📦';
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black z-50 flex flex-col"
        >
          {/* Header */}
          <div className="p-4 flex items-center justify-between">
            <h2 className="text-white text-lg font-semibold flex items-center gap-2">
              <Camera className="w-5 h-5" />
              Scan Barcode
            </h2>
            <button
              onClick={onClose}
              className="p-2 bg-white/20 hover:bg-white/30 rounded-full transition-colors"
            >
              <X className="w-6 h-6 text-white" />
            </button>
          </div>

          {/* Scanner View */}
          <div className="flex-1 flex flex-col items-center justify-center px-4">
            {!scannedProduct && !loading && !error && !similarProducts && (
              <>
                <div
                  ref={scannerRef}
                  className="w-full max-w-lg aspect-[4/3] rounded-lg overflow-hidden bg-black relative"
                >
                  {/* Scanning overlay guide */}
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="w-4/5 h-24 border-2 border-white/50 rounded-lg" />
                  </div>
                </div>
                {scanning && (
                  <p className="text-white/70 mt-4 text-center">
                    Position the barcode within the frame
                  </p>
                )}
              </>
            )}

            {/* Loading State */}
            {loading && (
              <div className="flex flex-col items-center gap-4">
                <Loader2 className="w-12 h-12 text-white animate-spin" />
                <p className="text-white">Looking up product...</p>
              </div>
            )}

            {/* Error State */}
            {error && !loading && (
              <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-6 max-w-md mx-auto">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-6 h-6 text-red-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-white">{error}</p>
                    {scannedBarcode && (
                      <p className="text-white/70 text-sm mt-1 font-mono">Barcode: {scannedBarcode}</p>
                    )}
                    <button
                      onClick={handleScanAnother}
                      className="mt-4 flex items-center gap-2 text-white bg-white/20 hover:bg-white/30 px-4 py-2 rounded-lg transition-colors"
                    >
                      <RotateCcw className="w-4 h-4" />
                      Try Again
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Similar Products Fallback */}
            {similarProducts && !loading && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white dark:bg-slate-800 rounded-xl p-6 max-w-md mx-auto w-full shadow-xl"
              >
                <p className="text-gray-600 dark:text-gray-400 text-sm mb-2">
                  Looking for "{externalName}"?
                </p>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                  Similar products in stock:
                </h3>
                <div className="space-y-3 max-h-80 overflow-y-auto">
                  {similarProducts.map((product) => (
                    <button
                      key={product.id}
                      onClick={() => {
                        setScannedProduct(product);
                        setSimilarProducts(null);
                        setQuantity(1);
                      }}
                      className="w-full flex items-center gap-3 p-3 bg-gray-50 dark:bg-slate-700 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-600 transition-colors text-left"
                    >
                      {product.image_url ? (
                        <img src={product.image_url} alt="" className="w-12 h-12 object-cover rounded" />
                      ) : (
                        <div className="w-12 h-12 bg-gray-200 dark:bg-slate-600 rounded flex items-center justify-center text-xl">
                          {getCategoryEmoji(product.category)}
                        </div>
                      )}
                      <div className="flex-1">
                        <p className="font-medium text-gray-900 dark:text-gray-100">{product.name}</p>
                        <p className="text-sm text-green-600 dark:text-green-400">
                          ${product.price.toFixed(2)} / {product.unit}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
                <button
                  onClick={handleScanAnother}
                  className="w-full mt-4 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 py-2 flex items-center justify-center gap-2 transition-colors"
                >
                  <Camera className="w-4 h-4" />
                  Scan Another
                </button>
              </motion.div>
            )}

            {/* Product Found */}
            {scannedProduct && !loading && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white dark:bg-slate-800 rounded-xl p-6 max-w-md mx-auto w-full shadow-xl"
              >
                {/* Product Image */}
                <div className="aspect-video bg-gray-100 dark:bg-slate-700 rounded-lg overflow-hidden mb-4">
                  {scannedProduct.image_url ? (
                    <img
                      src={scannedProduct.image_url}
                      alt={scannedProduct.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-6xl">
                      {getCategoryEmoji(scannedProduct.category)}
                    </div>
                  )}
                </div>

                {/* Product Info */}
                <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                  {scannedProduct.name}
                </h3>
                <p className="text-gray-600 dark:text-gray-400 mt-1 text-sm">
                  {scannedProduct.description}
                </p>
                <div className="flex items-baseline gap-2 mt-3">
                  <span className="text-2xl font-bold text-green-600 dark:text-green-400">
                    ${scannedProduct.price.toFixed(2)}
                  </span>
                  <span className="text-gray-500 dark:text-gray-400">
                    / {scannedProduct.unit}
                  </span>
                </div>

                {/* Quantity & Actions */}
                <div className="flex items-center gap-3 mt-4">
                  <div className="flex items-center border border-gray-300 dark:border-slate-600 rounded-lg">
                    <button
                      onClick={() => setQuantity(Math.max(1, quantity - 1))}
                      className="p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-l-lg transition-colors"
                    >
                      <Minus className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                    </button>
                    <span className="w-12 text-center py-2 text-gray-900 dark:text-gray-100">
                      {quantity}
                    </span>
                    <button
                      onClick={() => setQuantity(quantity + 1)}
                      className="p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-r-lg transition-colors"
                    >
                      <Plus className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                    </button>
                  </div>
                  <button
                    onClick={handleAddToCart}
                    className="flex-1 bg-green-500 hover:bg-green-600 text-white py-3 px-4 rounded-lg flex items-center justify-center gap-2 font-semibold transition-colors"
                  >
                    <ShoppingCart className="w-5 h-5" />
                    Add to Cart
                  </button>
                </div>

                {/* Scan Another */}
                <button
                  onClick={handleScanAnother}
                  className="w-full mt-3 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 py-2 flex items-center justify-center gap-2 transition-colors"
                >
                  <Camera className="w-4 h-4" />
                  Scan Another
                </button>
              </motion.div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
