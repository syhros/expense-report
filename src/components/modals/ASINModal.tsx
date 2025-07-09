import React, { useState, useEffect } from 'react';
import { X, Package, FileText, Calendar, Tag, Image, Scale, Weight, Barcode } from 'lucide-react';
import { createASIN, updateASIN, getTransactionItems } from '../../services/database';
import { ASIN, TransactionItem } from '../../types/database';
import { formatCurrency } from '../../utils/formatters';

interface ASINModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  asin?: ASIN | null;
}

const ASINModal: React.FC<ASINModalProps> = ({ 
  isOpen, 
  onClose, 
  onSuccess, 
  asin 
}) => {
  const [formData, setFormData] = useState({
    asin: '',
    title: '',
    brand: '',
    image_url: '',
    type: 'Single',
    pack: 1,
    category: 'Stock',
    weight: 0,
    weight_unit: 'g'
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [metrics, setMetrics] = useState({
    averageCOG: 0,
    totalUnits: 0,
    adjustedQuantity: 0,
    shipped: 0,
    stored: 0,
    averageFee: 0,
    averageSellPrice: 0,
    averageProfit: 0
  });

  useEffect(() => {
    if (asin) {
      setFormData({
        asin: asin.asin || '',
        title: asin.title || '',
        brand: asin.brand || '',
        image_url: asin.image_url || '',
        type: asin.type || 'Single',
        pack: asin.pack || 1,
        category: asin.category || 'Stock',
        weight: asin.weight || 0,
        weight_unit: asin.weight_unit || 'g'
      });
      loadMetrics(asin.asin);
    } else {
      setFormData({
        asin: '',
        title: '',
        brand: '',
        image_url: '',
        type: 'Single',
        pack: 1,
        category: 'Stock',
        weight: 0,
        weight_unit: 'g'
      });
      setMetrics({
        averageCOG: 0,
        totalUnits: 0,
        adjustedQuantity: 0,
        shipped: 0,
        stored: 0,
        averageFee: 0,
        averageSellPrice: 0,
        averageProfit: 0
      });
    }
    setError(null);
  }, [asin, isOpen]);

  const loadMetrics = async (asinCode: string) => {
    try {
      const transactionItems = await getTransactionItems();
      const asinItems = transactionItems.filter(item => item.asin === asinCode);
      
      const totalCost = asinItems.reduce((sum, item) => sum + (item.buy_price * item.quantity), 0);
      const totalQuantity = asinItems.reduce((sum, item) => sum + item.quantity, 0);
      const totalFees = asinItems.reduce((sum, item) => sum + ((item.est_fees || 0) * item.quantity), 0);
      const totalRevenue = asinItems.reduce((sum, item) => sum + (item.sell_price * item.quantity), 0);
      
      const averageCOG = totalQuantity > 0 ? totalCost / totalQuantity : 0;
      const averageFee = totalQuantity > 0 ? totalFees / totalQuantity : 0;
      const averageSellPrice = totalQuantity > 0 ? totalRevenue / totalQuantity : 0;
      const averageProfit = averageSellPrice - averageCOG - averageFee;
      
      const adjustedQuantity = formData.pack > 1 ? Math.floor(totalQuantity / formData.pack) : totalQuantity;
      const shipped = asin?.shipped || 0;
      const stored = adjustedQuantity - shipped;

      setMetrics({
        averageCOG,
        totalUnits: totalQuantity,
        adjustedQuantity,
        shipped,
        stored,
        averageFee,
        averageSellPrice,
        averageProfit
      });
    } catch (err) {
      console.error('Failed to load metrics:', err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (asin) {
        await updateASIN(asin.id, formData);
      } else {
        await createASIN(formData);
      }
      onSuccess();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save ASIN');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    const newFormData = { 
      ...formData, 
      [name]: name === 'pack' ? parseInt(value) || 1 : 
               name === 'weight' ? parseFloat(value) || 0 : value 
    };
    setFormData(newFormData);

    // Recalculate metrics when pack size changes
    if (name === 'pack' && asin) {
      const adjustedQuantity = parseInt(value) > 1 ? Math.floor(metrics.totalUnits / parseInt(value)) : metrics.totalUnits;
      setMetrics(prev => ({
        ...prev,
        adjustedQuantity,
        stored: adjustedQuantity - prev.shipped
      }));
    }
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800/90 backdrop-blur-xl border border-gray-600/30 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700/50">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-600/80 backdrop-blur-sm rounded-xl">
              <Package className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-white">
                {asin ? 'Edit ASIN' : 'Add ASIN'}
              </h2>
              <p className="text-sm text-gray-400">
                {formData.category && formData.asin && formData.brand ? 
                  `[${formData.category}] - [${formData.asin}] - [${formData.brand || 'No Brand'}]` : 
                  'New ASIN'
                }
              </p>
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

          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Left Column - Product Information */}
              <div className="space-y-6">
                <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-600/30 rounded-xl p-6">
                  <div className="flex items-center space-x-2 mb-4">
                    <Package className="h-5 w-5 text-blue-400" />
                    <h3 className="text-lg font-semibold text-white">Product Information</h3>
                  </div>
                  
                  <div className="space-y-4">
                    {/* Category - Moved to top */}
                    <div className="relative">
                      <div className="relative border-2 border-blue-500/50 rounded-xl bg-gray-800/50 backdrop-blur-sm">
                        <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
                          <Tag className="h-5 w-5 text-blue-400" />
                        </div>
                        <select
                          id="category"
                          name="category"
                          value={formData.category}
                          onChange={handleChange}
                          className="w-full pl-12 pr-4 py-4 bg-transparent text-white focus:outline-none appearance-none"
                        >
                          <option value="Stock" className="bg-gray-800 text-white">Stock</option>
                          <option value="Other" className="bg-gray-800 text-white">Other</option>
                        </select>
                        <label
                          htmlFor="category"
                          className="absolute left-10 -top-2.5 bg-gray-800 px-2 text-sm font-medium text-blue-400"
                        >
                          Category
                        </label>
                      </div>
                    </div>

                    {/* ASIN */}
                    <div className="relative">
                      <div className="relative border-2 border-blue-500/50 rounded-xl bg-gray-800/50 backdrop-blur-sm">
                        <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
                          <Tag className="h-5 w-5 text-blue-400" />
                        </div>
                        <input
                          type="text"
                          id="asin"
                          name="asin"
                          value={formData.asin}
                          onChange={handleChange}
                          required
                          className="w-full pl-12 pr-4 py-4 bg-transparent text-white placeholder-transparent focus:outline-none"
                          placeholder="ASIN"
                        />
                        <label
                          htmlFor="asin"
                          className="absolute left-10 -top-2.5 bg-gray-800 px-2 text-sm font-medium text-blue-400"
                        >
                          ASIN
                        </label>
                      </div>
                    </div>

                    {/* Brand */}
                    <div className="relative">
                      <div className="relative border-2 border-blue-500/50 rounded-xl bg-gray-800/50 backdrop-blur-sm">
                        <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
                          <Tag className="h-5 w-5 text-blue-400" />
                        </div>
                        <input
                          type="text"
                          id="brand"
                          name="brand"
                          value={formData.brand}
                          onChange={handleChange}
                          className="w-full pl-12 pr-4 py-4 bg-transparent text-white placeholder-transparent focus:outline-none"
                          placeholder="Brand"
                        />
                        <label
                          htmlFor="brand"
                          className="absolute left-10 -top-2.5 bg-gray-800 px-2 text-sm font-medium text-blue-400"
                        >
                          Brand
                        </label>
                      </div>
                    </div>

                    {/* Image URL */}
                    <div className="relative">
                      <div className="relative border-2 border-blue-500/50 rounded-xl bg-gray-800/50 backdrop-blur-sm">
                        <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
                          <Image className="h-5 w-5 text-blue-400" />
                        </div>
                        <input
                          type="url"
                          id="image_url"
                          name="image_url"
                          value={formData.image_url}
                          onChange={handleChange}
                          className="w-full pl-12 pr-4 py-4 bg-transparent text-white placeholder-transparent focus:outline-none"
                          placeholder="Image URL"
                        />
                        <label
                          htmlFor="image_url"
                          className="absolute left-10 -top-2.5 bg-gray-800 px-2 text-sm font-medium text-blue-400"
                        >
                          Image URL
                        </label>
                      </div>
                    </div>

                    {/* Title */}
                    <div className="relative">
                      <div className="relative border-2 border-blue-500/50 rounded-xl bg-gray-800/50 backdrop-blur-sm">
                        <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
                          <FileText className="h-5 w-5 text-blue-400" />
                        </div>
                        <input
                          type="text"
                          id="title"
                          name="title"
                          value={formData.title}
                          onChange={handleChange}
                          className="w-full pl-12 pr-4 py-4 bg-transparent text-white placeholder-transparent focus:outline-none"
                          placeholder="Title"
                        />
                        <label
                          htmlFor="title"
                          className="absolute left-10 -top-2.5 bg-gray-800 px-2 text-sm font-medium text-blue-400"
                        >
                          Title
                        </label>
                      </div>
                    </div>

                    <div className="flex space-x-4">
  <div className="flex-1 relative">
    <div className="relative border-2 border-blue-500/50 rounded-xl bg-gray-800/50 backdrop-blur-sm">
      <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
        <Scale className="h-5 w-5 text-blue-400" /> {/* Changed icon to Scale */}
      </div>
      <input
        type="number" // Changed type to number for better input handling
        id="weight"
        name="weight"
        value={formData.weight}
        onChange={handleChange}
        className="w-full pl-12 pr-4 py-4 bg-transparent text-white placeholder-transparent focus:outline-none"
        placeholder="0"
        step="0.001" // Allow decimal values for weight
        min="0"
      />
      <label
        htmlFor="weight"
        className="absolute left-10 -top-2.5 bg-gray-800 px-2 text-sm font-medium text-blue-400"
      >
        Weight
      </label>
    </div>
  </div>

  <div className="w-24 relative"> {/* Adjust width as needed */}
    <div className="relative border-2 border-blue-500/50 rounded-xl bg-gray-800/50 backdrop-blur-sm">
      <select
        id="weight_unit"
        name="weight_unit"
        value={formData.weight_unit}
        onChange={handleChange}
        className="w-full px-3 py-4 bg-transparent text-white focus:outline-none appearance-none text-center"
      >
        <option value="g" className="bg-gray-800 text-white">g</option>
        <option value="kg" className="bg-gray-800 text-white">kg</option>
      </select>
      <label
        htmlFor="weight_unit"
        className="absolute left-2 -top-2.5 bg-gray-800 px-1 text-xs font-medium text-blue-400"
      >
        Unit
      </label>
    </div>
  </div>
</div>

                    {/* Type and Pack Size */}
                    <div className="flex space-x-4">
                      <div className="flex-1 relative">
                        <div className="relative border-2 border-blue-500/50 rounded-xl bg-gray-800/50 backdrop-blur-sm">
                          <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
                            <Package className="h-5 w-5 text-blue-400" />
                          </div>
                          <select
                            id="type"
                            name="type"
                            value={formData.type}
                            onChange={handleChange}
                            className="w-full pl-12 pr-4 py-4 bg-transparent text-white focus:outline-none appearance-none"
                          >
                            <option value="Single" className="bg-gray-800 text-white">Single</option>
                            <option value="Bundle" className="bg-gray-800 text-white">Bundle</option>
                          </select>
                          <label
                            htmlFor="type"
                            className="absolute left-10 -top-2.5 bg-gray-800 px-2 text-sm font-medium text-blue-400"
                          >
                            Type
                          </label>
                        </div>
                      </div>
                      
                      {formData.type === 'Bundle' && (
                        <div className="w-24 relative">
                          <div className="relative border-2 border-blue-500/50 rounded-xl bg-gray-800/50 backdrop-blur-sm">
                            <input
                              type="number"
                              id="pack"
                              name="pack"
                              value={formData.pack}
                              onChange={handleChange}
                              min="1"
                              className="w-full px-3 py-4 bg-transparent text-white placeholder-transparent focus:outline-none text-center"
                              placeholder="Size"
                            />
                            <label
                              htmlFor="pack"
                              className="absolute left-2 -top-2.5 bg-gray-800 px-1 text-xs font-medium text-blue-400"
                            >
                              Size
                            </label>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                {/* Notes Section */}
                <div className="bg-blue-900/20 backdrop-blur-sm border border-blue-600/30 rounded-xl p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-white">Notes</h3>
                    <button type="button" className="text-blue-400 hover:text-blue-300 text-sm flex items-center space-x-1 transition-colors duration-300">
                      <FileText className="h-4 w-4" />
                      <span>Edit</span>
                    </button>
                  </div>
                  <p className="text-blue-300 text-sm">
                    No notes added yet. Click Edit to add notes.
                  </p>
                </div>

                {/* Metadata */}
                <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-600/30 rounded-xl p-6">
                  <div className="flex items-center space-x-2 mb-4">
                    <Calendar className="h-5 w-5 text-gray-400" />
                    <h3 className="text-lg font-semibold text-white">Metadata</h3>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Created:</span>
                      <span className="text-white">
                        {asin ? formatDateTime(asin.created_at) : 'New'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Last Updated:</span>
                      <span className="text-white">
                        {asin ? formatDateTime(asin.updated_at) : 'New'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column */}
              <div className="space-y-6">
                {/* Summary - Enhanced with new metrics */}
                <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-600/30 rounded-xl p-6">
                  <div className="text-center mb-4">
                    <h3 className="text-lg font-semibold text-white">Summary</h3>
                  </div>
                  
                  {/* Row 1: Average COG | Total Units */}
                  <div className="grid grid-cols-2 gap-6 mb-4">
                    <div className="text-center bg-green-600/20 border border-green-600/30 rounded-xl p-2">
                      <p className="text-3xl font-bold text-green-400 mb-1">{formatCurrency(metrics.averageCOG)}</p>
                      <p className="text-green-400 text-sm">Average COG</p>
                    </div>
                    <div className="text-center bg-gray-600/30 border border-gray-600/40 rounded-xl p-2">
                      <p className="text-3xl font-bold text-white mb-1">{metrics.adjustedQuantity}</p>
                      <p className="text-white text-sm">Total Units</p>
                    </div>
                  </div>

                  {/* Row 2: New metrics */}
                  <div className="grid grid-cols-3 gap-4 mb-4">
                    <div className="text-center bg-red-600/20 border border-red-600/30 rounded-xl p-2">
                      <p className="text-2xl font-bold text-red-400">{formatCurrency(metrics.averageFee)}</p>
                      <p className="text-red-400 text-sm">Avg. Fee</p>
                    </div>
                    <div className="text-center bg-blue-600/20 border border-blue-600/30 rounded-xl p-2">
                      <p className="text-2xl font-bold text-blue-400">{formatCurrency(metrics.averageSellPrice)}</p>
                      <p className="text-blue-400 text-sm">Avg. Sell Price</p>
                    </div>
                    <div className={`text-center border rounded-xl p-2 ${
                      metrics.averageProfit >= 0 
                        ? 'bg-green-600/20 border-green-600/30' 
                        : 'bg-red-600/20 border-red-600/30'
                    }`}>
                      <p className={`text-2xl font-bold ${
                        metrics.averageProfit >= 0 ? 'text-green-400' : 'text-red-400'
                      }`}>
                        {formatCurrency(metrics.averageProfit)}
                      </p>
                      <p className={`text-sm ${
                        metrics.averageProfit >= 0 ? 'text-green-400' : 'text-red-400'
                      }`}>
                        Avg. Profit
                      </p>
                    </div>
                  </div>
                  
                  {/* Row 3: Inv | Shipped | Pack Size */}
                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-center bg-orange-600/20 border border-orange-600/30 rounded-xl p-2 mb-1">
                      <p className="text-2xl font-bold text-orange-400">{metrics.stored}</p>
                      <p className="text-orange-400 text-sm">Inv</p>
                    </div>
                    <div className="text-center bg-purple-600/20 border border-purple-600/30 rounded-xl p-2 mb-1">
                      <p className="text-2xl font-bold text-purple-400">{metrics.shipped}</p>
                      <p className="text-purple-400 text-sm">Shipped</p>
                    </div>
                    <div className="text-center bg-blue-600/20 border border-blue-600/30 rounded-xl p-2 mb-1">
                      <p className="text-2xl font-bold text-blue-400">{formData.pack}</p>
                      <p className="text-blue-400 text-sm">Pack Size</p>
                    </div>
                  </div>
                </div>
                
                {/* FNSKU */}
                <div className="relative">
                  <div className="relative border-2 border-blue-500/50 rounded-xl bg-gray-800/50 backdrop-blur-sm">
                    <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
                      <Barcode className="h-5 w-5 text-blue-400" />
                    </div>
                    <input
                      type="text"
                      id="fnsku"
                      name="fnsku"
                      value={formData.fnsku}
                      onChange={handleChange}
                      className="w-full pl-12 pr-4 py-4 bg-transparent text-white placeholder-transparent focus:outline-none"
                      placeholder="FNSKU"
                    />
                    <label
                      htmlFor="fnsku"
                      className="absolute left-10 -top-2.5 bg-gray-800 px-2 text-sm font-medium text-blue-400"
                    >
                      FNSKU
                    </label>
                  </div>
                </div>

                {/* Image Preview */}
                <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-600/30 rounded-xl p-6">
                  <h3 className="text-lg font-semibold text-white mb-4">Image</h3>
                  <div className="border-2 border-dashed border-gray-600/50 rounded-xl p-4 text-center h-full flex items-center justify-center">
                    {formData.image_url ? (
                      <img 
                        src={formData.image_url} 
                        alt="Product preview" 
                        className="max-w-full max-h-full object-contain rounded-xl"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                          e.currentTarget.nextElementSibling!.style.display = 'flex';
                        }}
                      />
                    ) : (
                      <div className="text-gray-400 flex flex-col items-center">
                        <FileText className="h-16 w-16 mb-2" />
                        <p>No Image URL</p>
                      </div>
                    )}
                    <div style={{ display: 'none' }} className="text-gray-400 flex flex-col items-center">
                      <FileText className="h-16 w-16 mb-2" />
                      <p>Invalid Image URL</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end space-x-3 mt-6 pt-4 border-t border-gray-700/50">
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-3 text-gray-400 hover:text-white transition-all duration-300 hover:scale-102"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || !formData.asin.trim()}
                className="bg-blue-600/80 backdrop-blur-sm hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white px-6 py-3 rounded-xl transition-all duration-300 hover:scale-102 flex items-center space-x-2"
              >
                {loading ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                ) : (
                  <span>{asin ? 'Update' : 'Create'} ASIN</span>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ASINModal;