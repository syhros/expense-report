import React, { useState, useEffect } from 'react';
import { X, Package, AlertCircle, ChevronDown } from 'lucide-react';
import { getASINByCode, findOrCreateASIN, updateASIN } from '../../services/database';
import { useASINs } from '../../hooks/useData';
import { ASIN, TransactionItemDisplay, Supplier } from '../../types/database';
import { formatCurrency } from '../../utils/formatters';

interface TransactionItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (item: Omit<TransactionItemDisplay, 'id' | 'created_at' | 'transaction_id'>) => void;
  item?: TransactionItemDisplay | null;
}

const TransactionItemModal: React.FC<TransactionItemModalProps> = ({ 
  isOpen, 
  onClose, 
  onSuccess, 
  item 
}) => {
  const { asins } = useASINs();
  const [formData, setFormData] = useState({
    asin: '',
    title: '',
    quantity: 1,
    buy_price: 0,
    sell_price: 0,
    est_fees: 0,
    category: 'Stock'
  });
  const [asinDetails, setAsinDetails] = useState<ASIN | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isIncomplete, setIsIncomplete] = useState(false);
  
  // Dropdown states
  const [showTitleDropdown, setShowTitleDropdown] = useState(false);
  const [filteredAsins, setFilteredAsins] = useState<ASIN[]>([]);

  useEffect(() => {
    if (item) {
      setFormData({
        asin: item.asin,
        title: item.asin_details?.title || '',
        quantity: item.quantity,
        buy_price: item.buy_price,
        sell_price: item.sell_price,
        est_fees: item.est_fees || 0,
        category: item.asin_details?.category || 'Stock'
      });
      setAsinDetails(item.asin_details || null);
    } else {
      setFormData({
        asin: '',
        title: '',
        quantity: 1,
        buy_price: 0,
        sell_price: 0,
        est_fees: 0,
        category: 'Stock'
      });
      setAsinDetails(null);
    }
    setError(null);
    setIsIncomplete(false);
  }, [item, isOpen]);

  useEffect(() => {
    if (formData.asin && formData.asin.length >= 10) {
      fetchASINDetails(formData.asin);
    } else {
      setAsinDetails(null);
      setIsIncomplete(false);
    }
  }, [formData.asin]);

  // Filter ASINs based on title search
  useEffect(() => {
    if (formData.title) {
      const filtered = asins.filter(asin => 
        asin.title && asin.title.toLowerCase().includes(formData.title.toLowerCase())
      );
      setFilteredAsins(filtered);
    } else {
      setFilteredAsins([]);
    }
  }, [formData.title, asins]);

  const fetchASINDetails = async (asinCode: string) => {
    try {
      const details = await getASINByCode(asinCode);
      if (details) {
        setAsinDetails(details);
        setFormData(prev => ({ 
          ...prev, 
          title: details.title || '',
          category: details.category || 'Stock'
        }));
        // Fixed ASIN completion check - check if all required fields have meaningful content
        const hasTitle = details.title && details.title.trim() !== '' && details.title.trim() !== 'No title';
        const hasBrand = details.brand && details.brand.trim() !== '' && details.brand.trim() !== 'No brand';
        const hasImage = details.image_url && details.image_url.trim() !== '' && details.image_url.trim() !== 'No image';
        
        const isComplete = hasTitle && hasBrand && hasImage;
        setIsIncomplete(!isComplete);
      } else {
        setAsinDetails(null);
        setIsIncomplete(true);
      }
    } catch (err) {
      console.error('Failed to fetch ASIN details:', err);
      setAsinDetails(null);
      setIsIncomplete(true);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      let finalAsinDetails = asinDetails;

      // If ASIN doesn't exist, create an incomplete one with the specified category
      if (isIncomplete && formData.asin) {
        finalAsinDetails = await findOrCreateASIN({
          asin: formData.asin,
          title: formData.title || '',
          brand: '',
          image_url: '',
          type: 'Single',
          pack: 1,
          category: formData.category
        });
      } else if (finalAsinDetails && finalAsinDetails.category !== formData.category) {
        // Update existing ASIN category if it has changed
        finalAsinDetails = await updateASIN(finalAsinDetails.id, {
          category: formData.category
        });
      }

      // Calculate total cost and profit
      const itemCost = formData.buy_price * formData.quantity;
      const totalRevenue = formData.sell_price * formData.quantity;
      const estimatedProfit = totalRevenue - itemCost - (formData.est_fees * formData.quantity);
      const roi = itemCost > 0 ? (estimatedProfit / itemCost) * 100 : 0;

      // Calculate display quantity (adjusted for bundles)
      const displayQuantity = finalAsinDetails?.type === 'Bundle' && finalAsinDetails.pack > 1 
        ? Math.floor(formData.quantity / finalAsinDetails.pack) 
        : formData.quantity;

      const itemData = {
        asin: formData.asin,
        quantity: formData.quantity,
        buy_price: formData.buy_price,
        sell_price: formData.sell_price,
        est_fees: formData.est_fees,
        asin_details: finalAsinDetails,
        totalCost: itemCost,
        estimatedProfit,
        roi,
        displayQuantity
      };

      onSuccess(itemData);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save item');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    // Handle numeric inputs with proper parsing and allow empty values
    if (name === 'quantity') {
      const numValue = value === '' ? '' : parseInt(value, 10);
      setFormData(prev => ({ 
        ...prev, 
        [name]: numValue === '' || isNaN(numValue as number) ? 1 : numValue
      }));
    } else if (name === 'buy_price' || name === 'sell_price' || name === 'est_fees') {
      const numValue = value === '' ? '' : parseFloat(value);
      setFormData(prev => ({ 
        ...prev, 
        [name]: numValue === '' || isNaN(numValue as number) ? 0 : numValue
      }));
    } else {
      setFormData(prev => ({ 
        ...prev, 
        [name]: value 
      }));
    }
  };

  const handleTitleSelect = (selectedAsin: ASIN) => {
    setFormData(prev => ({
      ...prev,
      asin: selectedAsin.asin,
      title: selectedAsin.title || '',
      category: selectedAsin.category || 'Stock'
    }));
    setAsinDetails(selectedAsin);
    setShowTitleDropdown(false);
    setIsIncomplete(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800/90 backdrop-blur-xl border border-gray-600/30 rounded-2xl shadow-2xl w-full max-w-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700/50">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-600/80 backdrop-blur-sm rounded-xl">
              <Package className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-white">
                {item ? 'Edit Item' : 'Add Item'}
              </h2>
              <p className="text-sm text-gray-400">
                {formData.asin ? formData.asin : 'New Item'}
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

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6">
          {error && (
            <div className="bg-red-900/50 backdrop-blur-sm border border-red-700/50 rounded-xl p-4 text-red-300 text-sm mb-6">
              {error}
            </div>
          )}

          {/* Input Fields with New Styling */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            {/* Title Field with Searchable Dropdown */}
            <div className="relative md:col-span-2">
              <div className="relative border-2 border-blue-500/50 rounded-xl bg-gray-800/50 backdrop-blur-sm">
                <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
                  <Package className="h-5 w-5 text-blue-400" />
                </div>
                <input
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={handleChange}
                  onFocus={() => setShowTitleDropdown(true)}
                  className="w-full pl-12 pr-10 py-4 bg-transparent text-white placeholder-transparent focus:outline-none"
                  placeholder="Title"
                />
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                  <ChevronDown className="h-5 w-5 text-blue-400" />
                </div>
                <label
                  htmlFor="title"
                  className="absolute left-10 -top-2.5 bg-gray-800 px-2 text-sm font-medium text-blue-400"
                >
                  Title
                </label>
              </div>
              
              {/* Dropdown */}
              {showTitleDropdown && filteredAsins.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-gray-800/90 backdrop-blur-xl border border-gray-600/30 rounded-xl shadow-lg z-10 max-h-48 overflow-y-auto">
                  {filteredAsins.map((asin) => (
                    <button
                      key={asin.id}
                      type="button"
                      onClick={() => handleTitleSelect(asin)}
                      className="w-full text-left px-4 py-3 hover:bg-white/10 transition-colors border-b border-gray-700/50 last:border-b-0"
                    >
                      <div className="text-white font-medium text-sm">{asin.title}</div>
                      <div className="text-gray-400 text-xs">
                        {asin.category || 'Stock'} - {asin.asin} - {asin.brand || 'No brand'}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="relative">
              <div className="relative border-2 border-blue-500/50 rounded-xl bg-gray-800/50 backdrop-blur-sm">
                <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
                  <Package className="h-5 w-5 text-blue-400" />
                </div>
                <input
                  type="text"
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

            <div className="relative">
              <div className="relative border-2 border-blue-500/50 rounded-xl bg-gray-800/50 backdrop-blur-sm">
                <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
                  <span className="text-blue-400 text-sm">#</span>
                </div>
                <input
                  type="number"
                  name="quantity"
                  value={formData.quantity || ''}
                  onChange={handleChange}
                  min="1"
                  required
                  className="w-full pl-8 pr-4 py-4 bg-transparent text-white placeholder-transparent focus:outline-none"
                  placeholder="Quantity"
                />
                <label
                  htmlFor="quantity"
                  className="absolute left-6 -top-2.5 bg-gray-800 px-2 text-sm font-medium text-blue-400"
                >
                  Quantity
                </label>
              </div>
            </div>

            <div className="relative">
              <div className="relative border-2 border-blue-500/50 rounded-xl bg-gray-800/50 backdrop-blur-sm">
                <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
                  <span className="text-blue-400">£</span>
                </div>
                <input
                  type="number"
                  name="buy_price"
                  value={formData.buy_price || ''}
                  onChange={handleChange}
                  step="0.01"
                  min="0"
                  required
                  className="w-full pl-8 pr-4 py-4 bg-transparent text-white placeholder-transparent focus:outline-none"
                  placeholder="Buy Price"
                />
                <label
                  htmlFor="buy_price"
                  className="absolute left-6 -top-2.5 bg-gray-800 px-2 text-sm font-medium text-blue-400"
                >
                  Buy Price
                </label>
              </div>
            </div>

            <div className="relative">
              <div className="relative border-2 border-blue-500/50 rounded-xl bg-gray-800/50 backdrop-blur-sm">
                <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
                  <span className="text-blue-400">£</span>
                </div>
                <input
                  type="number"
                  name="sell_price"
                  value={formData.sell_price || ''}
                  onChange={handleChange}
                  step="0.01"
                  min="0"
                  className="w-full pl-8 pr-4 py-4 bg-transparent text-white placeholder-transparent focus:outline-none"
                  placeholder="Sell Price"
                />
                <label
                  htmlFor="sell_price"
                  className="absolute left-6 -top-2.5 bg-gray-800 px-2 text-sm font-medium text-blue-400"
                >
                  Sell Price
                </label>
              </div>
            </div>

            <div className="relative">
              <div className="relative border-2 border-blue-500/50 rounded-xl bg-gray-800/50 backdrop-blur-sm">
                <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
                  <span className="text-blue-400">£</span>
                </div>
                <input
                  type="number"
                  name="est_fees"
                  value={formData.est_fees || ''}
                  onChange={handleChange}
                  step="0.01"
                  min="0"
                  className="w-full pl-8 pr-4 py-4 bg-transparent text-white placeholder-transparent focus:outline-none"
                  placeholder="Est. Fees"
                />
                <label
                  htmlFor="est_fees"
                  className="absolute left-6 -top-2.5 bg-gray-800 px-2 text-sm font-medium text-blue-400"
                >
                  Est. Fees
                </label>
              </div>
            </div>

            {/* Category Field */}
            <div className="relative">
              <div className="relative border-2 border-blue-500/50 rounded-xl bg-gray-800/50 backdrop-blur-sm">
                <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
                  <Package className="h-5 w-5 text-blue-400" />
                </div>
                <select
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
          </div>

          {/* ASIN Details */}
          <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-600/30 rounded-xl p-4 mb-6">
            <h3 className="text-sm font-medium text-gray-400 mb-3">Pull from ASINs page</h3>
            
            {isIncomplete && formData.asin && (
              <div className="bg-yellow-900/30 backdrop-blur-sm border border-yellow-600/50 rounded-xl p-3 mb-4 flex items-center space-x-2">
                <AlertCircle className="h-5 w-5 text-yellow-400 flex-shrink-0" />
                <p className="text-yellow-300 text-sm">
                  This ASIN will be created as incomplete and needs to be filled in on the ASINs page.
                </p>
              </div>
            )}

            <div className="flex items-center space-x-4">
              <div className="w-16 h-16 bg-gray-700/50 backdrop-blur-sm rounded border border-gray-600/30 flex items-center justify-center overflow-hidden flex-shrink-0">
                {asinDetails?.image_url ? (
                  <img
                    src={asinDetails.image_url}
                    alt={asinDetails.title || 'Product'}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                      e.currentTarget.nextElementSibling!.style.display = 'flex';
                    }}
                  />
                ) : null}
                <div className={`w-full h-full flex items-center justify-center ${asinDetails?.image_url ? 'hidden' : 'flex'}`}>
                  <Package className="h-8 w-8 text-gray-500" />
                </div>
              </div>
              
              <div className="flex-1">
                <p className="text-white font-medium">
                  {asinDetails?.title || formData.title || (isIncomplete ? 'Incomplete ASIN' : 'No ASIN details')}
                </p>
                <p className="text-gray-400 text-sm">
                  {asinDetails?.brand || 'No brand'} • {asinDetails?.type === 'Bundle' ? 'Bundle' : 'Single'}
                  {asinDetails?.type === 'Bundle' && asinDetails.pack > 1 && ` • ${asinDetails.asin}`}
                </p>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-3">
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
                <span>{item ? 'Update' : 'Add'} Item</span>
              )}
            </button>
          </div>
        </form>
      </div>
      
      {/* Click outside to close dropdown */}
      {showTitleDropdown && (
        <div 
          className="fixed inset-0 z-0" 
          onClick={() => setShowTitleDropdown(false)}
        />
      )}
    </div>
  );
};

export default TransactionItemModal;