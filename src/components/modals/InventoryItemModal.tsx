import React, { useState, useEffect } from 'react';
import { X, Package, ShoppingCart, Truck, Warehouse, ExternalLink, Loader2 } from 'lucide-react';
import { ASINWithMetrics } from '../../types/database';
import { updateASIN } from '../../services/database';
import { formatCurrency } from '../../utils/formatters';

interface InventoryItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  item: ASINWithMetrics | null;
}

const InventoryItemModal: React.FC<InventoryItemModalProps> = ({ 
  isOpen, 
  onClose, 
  onSuccess, 
  item 
}) => {
  const [shippedAmount, setShippedAmount] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (item) {
      setShippedAmount(item.shipped || 0);
    }
    setError(null);
    setSuccess(null);
  }, [item, isOpen]);

  const handleSave = async () => {
    if (!item) return;
    
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      await updateASIN(item.id, { shipped: shippedAmount });
      setSuccess('Shipped quantity updated successfully');
      onSuccess();
      
      // Close modal after a short delay to show success message
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update shipped quantity');
    } finally {
      setLoading(false);
    }
  };

  const handleShippedChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value);
    setShippedAmount(isNaN(value) ? 0 : Math.max(0, value));
  };

  // Calculate inventory metrics
  const orderedQuantity = item ? (item.totalQuantity - item.adjustedQuantity) : 0;
  const inventoryQuantity = item ? Math.max(0, item.adjustedQuantity - (item.shipped || 0)) : 0;

  // Determine stock status
  const getStockStatus = () => {
    if (!item) return { text: 'Unknown', className: 'bg-gray-600/30 text-gray-300' };
    
    if (orderedQuantity > 0) {
      return { text: 'Ordered', className: 'bg-orange-600/30 text-orange-300' };
    } else if (inventoryQuantity > 0) {
      return { text: 'In Stock', className: 'bg-green-600/30 text-green-300' };
    } else if (item.shipped > 0) {
      return { text: 'All Sent', className: 'bg-blue-600/30 text-blue-300' };
    } else {
      return { text: 'Out of Stock', className: 'bg-red-600/30 text-red-300' };
    }
  };

  const stockStatus = getStockStatus();

  if (!isOpen || !item) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800/90 backdrop-blur-xl border border-gray-600/30 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700/50">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-600/80 backdrop-blur-sm rounded-xl">
              <Package className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-white">Inventory Item Details</h2>
              <p className="text-sm text-gray-400">{item.asin}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors duration-300 hover:scale-102"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {error && (
            <div className="bg-red-900/50 backdrop-blur-sm border border-red-700/50 rounded-xl p-4 text-red-300 text-sm mb-6">
              {error}
            </div>
          )}

          {success && (
            <div className="bg-green-900/50 backdrop-blur-sm border border-green-700/50 rounded-xl p-4 text-green-300 text-sm mb-6">
              {success}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Left Column - Product Information */}
            <div className="space-y-6">
              {/* Product Image */}
              <div className="bg-gray-700/50 backdrop-blur-sm border border-gray-600/30 rounded-xl p-4 flex items-center justify-center h-64">
                {item.image_url ? (
                  <img
                    src={item.image_url}
                    alt={item.title || 'Product'}
                    className="max-h-full max-w-full object-contain rounded-lg"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                      e.currentTarget.nextElementSibling!.style.display = 'flex';
                    }}
                  />
                ) : null}
                <div className={`w-full h-full flex items-center justify-center ${item.image_url ? 'hidden' : 'flex'}`}>
                  <Package className="h-16 w-16 text-gray-500" />
                </div>
              </div>

              {/* Product Details */}
              <div className="bg-gray-700/50 backdrop-blur-sm border border-gray-600/30 rounded-xl p-4">
                <h3 className="text-lg font-semibold text-white mb-3">Product Details</h3>
                
                <div className="space-y-3">
                  <div>
                    <p className="text-gray-400 text-sm">Title</p>
                    <p className="text-white">{item.title || 'No title'}</p>
                  </div>
                  
                  <div>
                    <p className="text-gray-400 text-sm">ASIN</p>
                    <div className="flex items-center space-x-2">
                      <p className="text-blue-400 font-mono">{item.asin}</p>
                      <a 
                        href={`https://www.amazon.co.uk/dp/${item.asin}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-400 hover:text-blue-300 transition-colors"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    </div>
                  </div>
                  
                  <div>
                    <p className="text-gray-400 text-sm">Brand</p>
                    <p className="text-white">{item.brand || 'No brand'}</p>
                  </div>
                  
                  <div>
                    <p className="text-gray-400 text-sm">Type</p>
                    <p className="text-white">{item.type || 'Single'} {item.type === 'Bundle' && item.pack > 1 ? `(Pack of ${item.pack})` : ''}</p>
                  </div>
                  
                  <div>
                    <p className="text-gray-400 text-sm">Weight</p>
                    <p className="text-white">
                      {item.weight && item.weight > 0 
                        ? `${item.weight}${item.weight_unit || 'g'}` 
                        : 'Not specified'
                      }
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column - Inventory and Financial Information */}
            <div className="space-y-6">
              {/* Stock Status */}
              <div className={`${stockStatus.className} border rounded-xl p-4`}>
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-white">Stock Status</h3>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${stockStatus.className}`}>
                    {stockStatus.text}
                  </span>
                </div>
                
                <div className="grid grid-cols-2 gap-4 mt-4">
                  <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg p-3 text-center">
                    <div className="flex items-center justify-center space-x-2 mb-1">
                      <ShoppingCart className="h-4 w-4 text-orange-400" />
                      <p className="text-orange-400 text-sm">Ordered</p>
                    </div>
                    <p className="text-xl font-bold text-white">{orderedQuantity}</p>
                  </div>
                  
                  <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg p-3 text-center">
                    <div className="flex items-center justify-center space-x-2 mb-1">
                      <Warehouse className="h-4 w-4 text-green-400" />
                      <p className="text-green-400 text-sm">Warehouse</p>
                    </div>
                    <p className="text-xl font-bold text-white">{inventoryQuantity}</p>
                  </div>
                </div>
              </div>

              {/* Financial Information */}
              <div className="bg-gray-700/50 backdrop-blur-sm border border-gray-600/30 rounded-xl p-4">
                <h3 className="text-lg font-semibold text-white mb-3">Financial Information</h3>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg p-3">
                    <p className="text-gray-400 text-sm">Average COG</p>
                    <p className="text-xl font-bold text-white">{formatCurrency(item.averageBuyPrice)}</p>
                  </div>
                  
                  <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg p-3">
                    <p className="text-gray-400 text-sm">Average Profit</p>
                    <p className={`text-xl font-bold ${item.averageProfit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {formatCurrency(item.averageProfit)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Shipped Quantity Editor */}
              <div className="bg-blue-900/20 backdrop-blur-sm border border-blue-600/30 rounded-xl p-4">
                <h3 className="text-lg font-semibold text-white mb-3">Update Shipped Quantity</h3>
                
                <div className="mb-4">
                  <div className="flex items-center space-x-2 mb-2">
                    <Truck className="h-4 w-4 text-blue-400" />
                    <label className="text-blue-400 text-sm">Shipped Quantity</label>
                  </div>
                  
                  <input
                    type="number"
                    value={shippedAmount}
                    onChange={handleShippedChange}
                    min="0"
                    className="w-full bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-300"
                  />
                  
                  <p className="text-xs text-gray-400 mt-1">
                    Enter the total number of units that have been shipped to Amazon
                  </p>
                </div>
                
                <button
                  onClick={handleSave}
                  disabled={loading || shippedAmount === item.shipped}
                  className="w-full bg-blue-600/80 backdrop-blur-sm hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white px-4 py-2 rounded-xl transition-all duration-300 hover:scale-102 flex items-center justify-center space-x-2"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Updating...</span>
                    </>
                  ) : (
                    <span>Update Shipped Quantity</span>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InventoryItemModal;