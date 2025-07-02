import React, { useState } from 'react';
import { Plus, Search, Filter, Warehouse, Box, Package } from 'lucide-react';
import Card from '../components/shared/Card';
import { useASINsWithMetrics } from '../hooks/useData';
import { updateASIN } from '../services/database';
import { formatCurrency } from '../utils/formatters';

type FilterCategory = 'all' | 'in-stock' | 'low-stock' | 'out-of-stock' | 'in-warehouse';

const Inventory: React.FC = () => {
  const { asins, loading, error, refetch } = useASINsWithMetrics();
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterCategory>('all');
  const [selectedItem, setSelectedItem] = useState<string | null>(null);
  const [shipAmount, setShipAmount] = useState<number>(0);

  // Filter ASINs based on search term and category
  const filteredAsins = asins.filter(asin => {
    const matchesSearch = asin.asin.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (asin.title && asin.title.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (asin.brand && asin.brand.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesFilter = (() => {
      switch (activeFilter) {
        case 'in-stock':
          return asin.adjustedQuantity > 5;
        case 'low-stock':
          return asin.adjustedQuantity > 0 && asin.adjustedQuantity <= 5;
        case 'out-of-stock':
          return asin.adjustedQuantity === 0;
        case 'in-warehouse':
          return asin.stored > 0;
        default:
          return true;
      }
    })();

    return matchesSearch && matchesFilter;
  });

  // Calculate total stock level
  const totalStockLevel = asins.reduce((sum, asin) => sum + asin.adjustedQuantity, 0);
  const inStockCount = asins.filter(asin => asin.adjustedQuantity > 5).length;
  const lowStockCount = asins.filter(asin => asin.adjustedQuantity > 0 && asin.adjustedQuantity <= 5).length;
  const outOfStockCount = asins.filter(asin => asin.adjustedQuantity === 0).length;
  const inWarehouseCount = asins.filter(asin => asin.stored > 0).length;

  const handleItemClick = (asinId: string) => {
    setSelectedItem(asinId);
    setShipAmount(0);
  };

  const handleShipUpdate = async () => {
    if (selectedItem && shipAmount > 0) {
      try {
        const asin = asins.find(a => a.id === selectedItem);
        if (asin) {
          await updateASIN(asin.id, { shipped: asin.shipped + shipAmount });
          refetch();
          setSelectedItem(null);
          setShipAmount(0);
        }
      } catch (err) {
        console.error('Failed to update shipped amount:', err);
      }
    }
  };

  const getFilterButtonClass = (filter: FilterCategory) => {
    const baseClass = "px-4 py-2 rounded-xl text-sm font-medium transition-all duration-300 hover:scale-102 cursor-pointer";
    const activeClass = "bg-blue-600/80 backdrop-blur-sm text-white shadow-lg";
    const inactiveClass = "bg-white/10 backdrop-blur-sm text-gray-300 hover:bg-white/20 hover:text-white";
    
    return `${baseClass} ${activeFilter === filter ? activeClass : inactiveClass}`;
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white">Inventory</h1>
            <p className="text-gray-400 mt-1">Track stock levels, reorder points, and inventory turnover</p>
          </div>
          <div className="flex items-center space-x-3">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Search inventory..."
                className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl pl-10 pr-4 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300"
              />
            </div>
            <button className="bg-white/10 backdrop-blur-sm hover:bg-white/20 text-white px-4 py-2 rounded-xl transition-all duration-300 hover:scale-102 flex items-center space-x-2">
              <Filter className="h-4 w-4" />
              <span>Filter</span>
            </button>
          </div>
        </div>
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white">Inventory</h1>
            <p className="text-gray-400 mt-1">Track stock levels, reorder points, and inventory turnover</p>
          </div>
          <div className="flex items-center space-x-3">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Search inventory..."
                className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl pl-10 pr-4 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300"
              />
            </div>
            <button className="bg-white/10 backdrop-blur-sm hover:bg-white/20 text-white px-4 py-2 rounded-xl transition-all duration-300 hover:scale-102 flex items-center space-x-2">
              <Filter className="h-4 w-4" />
              <span>Filter</span>
            </button>
          </div>
        </div>
        <Card className="p-6">
          <div className="text-center text-red-400">
            <p>Error loading inventory: {error}</p>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Inventory</h1>
          <p className="text-gray-400 mt-1">Track stock levels, reorder points, and inventory turnover</p>
        </div>
        <div className="flex items-center space-x-3">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Search inventory..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl pl-10 pr-4 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300"
            />
          </div>
        </div>
      </div>

      {/* Stock Level Summary with Clickable Categories */}
      <div className="bg-white/5 backdrop-blur-xl border-2 border-white/20 rounded-2xl p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-blue-600/80 backdrop-blur-sm rounded-xl">
              <Warehouse className="h-6 w-6 text-white" />
            </div>
            <div>
              <p className="text-sm font-medium text-white-400">Total stock level:</p>
              <p className="text-3xl font-bold text-white mt-1">{totalStockLevel.toLocaleString()}</p>
            </div>
          </div>
          
          {/* Clickable Summary Statistics */}
          <div className="grid grid-cols-5 gap-6 flex-1 max-w-5xl">
            <div 
              className={getFilterButtonClass('all')}
              onClick={() => setActiveFilter('all')}
            >
              <div className="text-center">
                <div className="p-2 bg-blue-600/80 backdrop-blur-sm rounded-lg w-fit mx-auto mb-2">
                  <Box className="h-5 w-5 text-white" />
                </div>
                <p className="text-sm font-medium">Total ASINs</p>
                <p className="text-2xl font-bold mt-1">{asins.length}</p>
              </div>
            </div>

            <div 
              className={getFilterButtonClass('in-stock')}
              onClick={() => setActiveFilter('in-stock')}
            >
              <div className="text-center">
                <div className="p-2 bg-green-600/80 backdrop-blur-sm rounded-lg w-fit mx-auto mb-2">
                  <span className="text-white text-lg">✅</span>
                </div>
                <p className="text-sm font-medium">In Stock</p>
                <p className="text-2xl font-bold mt-1">{inStockCount}</p>
              </div>
            </div>

            <div 
              className={getFilterButtonClass('low-stock')}
              onClick={() => setActiveFilter('low-stock')}
            >
              <div className="text-center">
                <div className="p-2 bg-yellow-600/80 backdrop-blur-sm rounded-lg w-fit mx-auto mb-2">
                  <span className="text-white text-lg">⚠️</span>
                </div>
                <p className="text-sm font-medium">Low Stock</p>
                <p className="text-2xl font-bold mt-1">{lowStockCount}</p>
              </div>
            </div>

            <div 
              className={getFilterButtonClass('out-of-stock')}
              onClick={() => setActiveFilter('out-of-stock')}
            >
              <div className="text-center">
                <div className="p-2 bg-red-600/80 backdrop-blur-sm rounded-lg w-fit mx-auto mb-2">
                  <span className="text-white text-lg">🚫</span>
                </div>
                <p className="text-sm font-medium">Out of Stock</p>
                <p className="text-2xl font-bold mt-1">{outOfStockCount}</p>
              </div>
            </div>

            <div 
              className={getFilterButtonClass('in-warehouse')}
              onClick={() => setActiveFilter('in-warehouse')}
            >
              <div className="text-center">
                <div className="p-2 bg-purple-600/80 backdrop-blur-sm rounded-lg w-fit mx-auto mb-2">
                  <Warehouse className="h-5 w-5 text-white" />
                </div>
                <p className="text-sm font-medium">In Warehouse</p>
                <p className="text-2xl font-bold mt-1">{inWarehouseCount}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Inventory Grid */}
      {filteredAsins.length === 0 ? (
        <Card className="p-8">
          <div className="text-center py-16">
            <div className="mx-auto w-24 h-24 bg-gray-700/50 backdrop-blur-sm rounded-full flex items-center justify-center mb-6">
              <Warehouse className="h-12 w-12 text-gray-500" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">
              {searchTerm || activeFilter !== 'all' ? 'No matching inventory items' : 'No inventory items'}
            </h3>
            <p className="text-gray-400 mb-4 max-w-md mx-auto">
              {searchTerm || activeFilter !== 'all'
                ? 'Try adjusting your search terms or filters to see more items.'
                : 'Inventory items will automatically appear here based on the ASINs you add to the ASIN page.'
              }
            </p>
            {(searchTerm || activeFilter !== 'all') && (
              <button
                onClick={() => {
                  setSearchTerm('');
                  setActiveFilter('all');
                }}
                className="bg-blue-600/80 backdrop-blur-sm hover:bg-blue-700 text-white px-4 py-2 rounded-xl transition-all duration-300 hover:scale-102"
              >
                Clear Filters
              </button>
            )}
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6">
          {filteredAsins.map((asin) => {
            // Calculate average profit for this ASIN
            const averageProfit = asin.averageBuyPrice > 0 ? 
              (asin.averageBuyPrice * 0.3) : 0; // Mock calculation - would need real data
            
            return (
              <Card 
                key={asin.id} 
                className={`overflow-hidden hover:bg-white/15 transition-all duration-300 group cursor-pointer ${
                  selectedItem === asin.id ? 'ring-2 ring-blue-500' : ''
                }`}
                onClick={() => handleItemClick(asin.id)}
              >
                {/* Product Image */}
                <div className="aspect-square bg-gray-700/50 backdrop-blur-sm relative overflow-hidden">
                  {asin.image_url ? (
                    <img
                      src={asin.image_url}
                      alt={asin.title || 'Product'}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                        e.currentTarget.nextElementSibling!.style.display = 'flex';
                      }}
                    />
                  ) : null}
                  <div className={`absolute inset-0 flex items-center justify-center ${asin.image_url ? 'hidden' : 'flex'}`}>
                    <Warehouse className="h-16 w-16 text-gray-500" />
                  </div>
                  
                  {/* Stock Level Badge */}
                  <div className="absolute top-3 right-3">
                    <div className={`px-2 py-1 rounded-full text-xs font-medium backdrop-blur-sm ${
                      asin.adjustedQuantity > 10 
                        ? 'bg-green-600/80 text-green-100' 
                        : asin.adjustedQuantity > 0 
                          ? 'bg-yellow-600/80 text-yellow-100' 
                          : 'bg-red-600/80 text-red-100'
                    }`}>
                      {asin.adjustedQuantity} units
                    </div>
                  </div>
                </div>

                {/* Product Details */}
                <div className="p-4">
                  {/* Title and ASIN */}
                  <div className="mb-3">
                    <h3 className="text-white font-medium text-sm leading-tight mb-1 line-clamp-2">
                      {asin.title || 'No title'}
                    </h3>
                    <a 
                      href={`https://www.amazon.co.uk/dp/${asin.asin}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-400 hover:text-blue-300 text-xs font-mono transition-colors duration-300"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {asin.asin}
                    </a>
                  </div>

                  {/* COG and Avg Profit */}
                  <div className="grid grid-cols-2 gap-2 mb-3">
                    <div>
                      <p className="text-gray-400 text-xs">Average COG</p>
                      <p className="text-white font-semibold">{formatCurrency(asin.averageBuyPrice)}</p>
                    </div>
                    <div>
                      <p className="text-gray-400 text-xs">Avg. Profit</p>
                      <p className={`font-semibold ${averageProfit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {formatCurrency(averageProfit)}
                      </p>
                    </div>
                  </div>

                  {/* Stock Information */}
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg p-2">
                      <p className="text-xs text-gray-400">Total</p>
                      <p className="text-sm font-semibold text-white">{asin.adjustedQuantity}</p>
                    </div>
                    <div className="bg-blue-900/30 backdrop-blur-sm rounded-lg p-2">
                      <p className="text-xs text-blue-400">Shipped</p>
                      <p className="text-sm font-semibold text-blue-300">{asin.shipped}</p>
                    </div>
                    <div className="bg-green-900/30 backdrop-blur-sm rounded-lg p-2">
                      <p className="text-xs text-green-400">Inv</p>
                      <p className="text-sm font-semibold text-green-300">{asin.stored}</p>
                    </div>
                  </div>

                  {/* Bundle Indicator */}
                  {asin.type === 'Bundle' && (
                    <div className="mt-3 flex items-center justify-center">
                      <div className="bg-purple-900/30 backdrop-blur-sm border border-purple-600/30 rounded-full px-2 py-1">
                        <p className="text-purple-300 text-xs font-medium">
                          Bundle • Pack of {asin.pack}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Low Stock Warning */}
                  {asin.adjustedQuantity <= 5 && asin.adjustedQuantity > 0 && (
                    <div className="mt-3 bg-yellow-900/30 backdrop-blur-sm border border-yellow-600/30 rounded-lg p-2">
                      <p className="text-yellow-300 text-xs text-center font-medium">
                        ⚠️ Low Stock
                      </p>
                    </div>
                  )}

                  {/* Out of Stock Warning */}
                  {asin.adjustedQuantity === 0 && (
                    <div className="mt-3 bg-red-900/30 backdrop-blur-sm border border-red-600/30 rounded-lg p-2">
                      <p className="text-red-300 text-xs text-center font-medium">
                        🚫 Out of Stock
                      </p>
                    </div>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Ship Update Modal */}
      {selectedItem && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-gray-800/90 backdrop-blur-xl border border-gray-600/30 rounded-2xl p-6 w-96">
            <h3 className="text-lg font-semibold text-white mb-4">Update Shipped Quantity</h3>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-400 mb-2">
                Amount to Ship
              </label>
              <input
                type="number"
                value={shipAmount}
                onChange={(e) => setShipAmount(parseInt(e.target.value) || 0)}
                className="w-full bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-300"
                min="0"
                placeholder="Enter amount to ship"
              />
            </div>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  setSelectedItem(null);
                  setShipAmount(0);
                }}
                className="px-4 py-2 text-gray-400 hover:text-white transition-all duration-300 hover:scale-102"
              >
                Cancel
              </button>
              <button
                onClick={handleShipUpdate}
                className="bg-blue-600/80 backdrop-blur-sm hover:bg-blue-700 text-white px-4 py-2 rounded-xl transition-all duration-300 hover:scale-102"
              >
                Update
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Inventory;