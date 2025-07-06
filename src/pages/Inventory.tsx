import React, { useState } from 'react';
import { Search, Filter, Warehouse, Box, Package } from 'lucide-react';
import Card from '../components/shared/Card';
import InventoryItemModal from '../components/modals/InventoryItemModal';
import { useASINsWithMetrics } from '../hooks/useData';
import { formatCurrency } from '../utils/formatters';

type FilterCategory = 'all' | 'shipped-stock' | 'ordered' | 'in-warehouse';

const Inventory: React.FC = () => {
  const { asins, loading, error, refetch } = useASINsWithMetrics();
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterCategory>('all');
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);

  // Calculate additional metrics for each ASIN
  const asinsWithMetrics = asins.map(asin => {
    // Calculate ordered quantity (total quantity minus completed quantity)
    const orderedQuantity = asin.totalQuantity - asin.adjustedQuantity;
    
    // Calculate inventory (completed items minus shipped)
    const inventoryQuantity = Math.max(0, asin.adjustedQuantity - asin.shipped);
    
    return {
      ...asin,
      orderedQuantity,
      inventoryQuantity
    };
  });

  // Filter ASINs based on search term and category
  const filteredAsins = asinsWithMetrics.filter(asin => {
    const matchesSearch = asin.asin.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (asin.title && asin.title.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (asin.brand && asin.brand.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesFilter = (() => {
      switch (activeFilter) {
        case 'shipped-stock':
          return asin.shipped > 0;
        case 'ordered':
          return asin.orderedQuantity > 0;
        case 'in-warehouse':
          return asin.inventoryQuantity > 0;
        default:
          return true;
      }
    })();

    return matchesSearch && matchesFilter;
  });

  // Calculate total stock level
  const totalStockLevel = asins.reduce((sum, asin) => sum + asin.adjustedQuantity, 0);
  const shippedStockCount = asins.filter(asin => asin.shipped > 0).length;
  const orderedCount = asinsWithMetrics.filter(asin => asin.orderedQuantity > 0).length;
  const inWarehouseCount = asinsWithMetrics.filter(asin => asin.inventoryQuantity > 0).length;

  // Get the selected item details
  const selectedItem = selectedItemId ? asinsWithMetrics.find(asin => asin.id === selectedItemId) || null : null;
  
  // Handle opening the modal when clicking on an item
  const handleItemClick = (asin: ASINWithMetrics) => {
    setSelectedItemId(asin.id);
    setShowModal(true);
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
          <div className="grid grid-cols-4 gap-6 flex-1 max-w-4xl">
            <div 
              className={getFilterButtonClass('all')}
              onClick={() => setActiveFilter('all')}
            >
              <div className="text-center">
                <div className="p-2 bg-blue-600/80 backdrop-blur-sm rounded-lg w-fit mx-auto mb-2">
                  <Box className="h-5 w-5 text-white" />
                </div>
                <p className="text-sm font-medium">All Stock</p>
                <p className="text-2xl font-bold mt-1">{asins.length}</p>
              </div>
            </div>

            <div 
              className={getFilterButtonClass('shipped-stock')}
              onClick={() => setActiveFilter('shipped-stock')}
            >
              <div className="text-center">
                <div className="p-2 bg-green-600/80 backdrop-blur-sm rounded-lg w-fit mx-auto mb-2">
                  <span className="text-white text-lg">📦</span>
                </div>
                <p className="text-sm font-medium">Shipped Stock</p>
                <p className="text-2xl font-bold mt-1">{shippedStockCount}</p>
              </div>
            </div>

            <div 
              className={getFilterButtonClass('ordered')}
              onClick={() => setActiveFilter('ordered')}
            >
              <div className="text-center">
                <div className="p-2 bg-orange-600/80 backdrop-blur-sm rounded-lg w-fit mx-auto mb-2">
                  <span className="text-white text-lg">🛒</span>
                </div>
                <p className="text-sm font-medium">Ordered</p>
                <p className="text-2xl font-bold mt-1">{orderedCount}</p>
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
            return (
              <Card 
                key={asin.id} 
                className={`overflow-hidden hover:bg-white/15 transition-all duration-300 group cursor-pointer ${
                  selectedItemId === asin.id ? 'ring-2 ring-blue-500' : ''
                }`}
              >
                {/* Product Image */}
                <div 
                  className="aspect-square bg-gray-700/50 backdrop-blur-sm relative overflow-hidden cursor-pointer"
                  onClick={() => handleItemClick(asin)}
                >
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
                      asin.orderedQuantity > 0
                        ? 'bg-orange-600/80 text-orange-100' 
                        : asin.inventoryQuantity > 0 
                          ? 'bg-green-600/80 text-green-100' 
                          : asin.shipped > 0
                            ? 'bg-blue-600/80 text-blue-100'
                            : 'bg-red-600/80 text-red-100'
                    }`}>
                      {asin.orderedQuantity > 0 
                        ? `${asin.orderedQuantity} ordered` 
                        : asin.inventoryQuantity > 0 
                          ? `${asin.inventoryQuantity} in stock` 
                          : asin.shipped > 0
                            ? '📦 All Sent'
                            : '🚫 Out of Stock'}
                    </div>
                  </div>
                </div>

                {/* Product Details */}
                <div className="p-4 cursor-pointer" onClick={() => handleItemClick(asin)}>
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
                      <p className={`font-semibold ${asin.averageProfit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {formatCurrency(asin.averageProfit)}
                      </p>
                    </div>
                  </div>

                  {/* Stock Information */}
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="bg-orange-900/30 backdrop-blur-sm rounded-lg p-2">
                      <p className="text-xs text-orange-400">Ordered</p>
                      <p className="text-sm font-semibold text-orange-300">{asin.orderedQuantity}</p>
                    </div>
                    <div className="bg-green-900/30 backdrop-blur-sm rounded-lg p-2">
                      <p className="text-xs text-green-400">Stored</p>
                      <p className="text-sm font-semibold text-green-300">{asin.inventoryQuantity}</p>
                    </div>
                    <div className="bg-blue-900/30 backdrop-blur-sm rounded-lg p-2">
                      <p className="text-xs text-blue-400">Shipped</p>
                      <p className="text-sm font-semibold text-blue-300">{asin.shipped}</p>
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

                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Inventory Item Modal */}
      <InventoryItemModal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false);
          setSelectedItemId(null);
        }}
        onSuccess={refetch}
        item={selectedItem}
      />
    </div>
  );
};

export default Inventory;