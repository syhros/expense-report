import React, { useState } from 'react';
import { Plus, MoreVertical } from 'lucide-react';
import Card from '../components/shared/Card';
import SupplierModal from '../components/modals/SupplierModal';
import { useSupplierMetrics } from '../hooks/useData';
import { formatCurrency, formatPercentage, formatRelativeDate } from '../utils/formatters';

const Suppliers: React.FC = () => {
  const { supplierMetrics, loading, error, refetch } = useSupplierMetrics();
  const [showSupplierModal, setShowSupplierModal] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState(null);

  const handleAddSupplier = () => {
    setEditingSupplier(null);
    setShowSupplierModal(true);
  };

  const handleEditSupplier = (supplier: any) => {
    setEditingSupplier(supplier);
    setShowSupplierModal(true);
  };

  const handleModalSuccess = () => {
    refetch();
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white">Suppliers</h1>
            <p className="text-gray-400 mt-1">Manage your supplier relationships and track performance metrics</p>
          </div>
          <button 
            onClick={handleAddSupplier}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors flex items-center space-x-2"
          >
            <Plus className="h-4 w-4" />
            <span>Add Supplier</span>
          </button>
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
            <h1 className="text-3xl font-bold text-white">Suppliers</h1>
            <p className="text-gray-400 mt-1">Manage your supplier relationships and track performance metrics</p>
          </div>
          <button 
            onClick={handleAddSupplier}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors flex items-center space-x-2"
          >
            <Plus className="h-4 w-4" />
            <span>Add Supplier</span>
          </button>
        </div>
        <Card className="p-6">
          <div className="text-center text-red-400">
            <p>Error loading suppliers: {error}</p>
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
          <h1 className="text-3xl font-bold text-white">Suppliers</h1>
          <p className="text-gray-400 mt-1">Manage your supplier relationships and track performance metrics</p>
        </div>
        <button 
          onClick={handleAddSupplier}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors flex items-center space-x-2"
        >
          <Plus className="h-4 w-4" />
          <span>Add Supplier</span>
        </button>
      </div>

      {/* Supplier Cards Grid */}
      {supplierMetrics.length === 0 ? (
        <Card className="p-12">
          <div className="text-center text-gray-400">
            <p className="text-lg mb-2">No suppliers found</p>
            <p className="text-sm">Add your first supplier to start tracking performance metrics</p>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {supplierMetrics.map((supplierMetric) => (
            <Card key={supplierMetric.supplier.id} className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-2xl font-bold text-white text-center flex-1">{supplierMetric.supplier.name}</h3>
                <button 
                  onClick={() => handleEditSupplier(supplierMetric.supplier)}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <MoreVertical className="h-5 w-5" />
                </button>
              </div>
              
              <div className="space-y-4">
                {/* Total Spend Box - Top */}
                <div className="bg-orange-600/20 border border-orange-600/30 rounded-lg p-4 mx-2">
                  <div className="text-center">
                    <p className="text-orange-400 text-sm font-medium">Total Spend</p>
                    <p className="text-xl font-bold text-orange-300 mt-1">{formatCurrency(supplierMetric.totalSpend)}</p>
                  </div>
                </div>
                
                {/* Bottom Row - Orders, Est. Profit, ROI */}
                <div className="grid grid-cols-3 gap-2 mx-2">
                  {/* Orders Box */}
                  <div className="bg-blue-600/20 border border-blue-600/30 rounded-lg p-3">
                    <div className="text-center">
                      <p className="text-blue-400 text-xs font-medium">Orders</p>
                      <p className="text-lg font-bold text-blue-300 mt-1">{supplierMetric.orderCount}</p>
                    </div>
                  </div>
                  
                  {/* Est. Profit Box */}
                  <div className={`${supplierMetric.estimatedProfit >= 0 ? 'bg-green-600/20 border-green-600/30' : 'bg-red-600/20 border-red-600/30'} border rounded-lg p-3`}>
                    <div className="text-center">
                      <p className={`${supplierMetric.estimatedProfit >= 0 ? 'text-green-400' : 'text-red-400'} text-xs font-medium`}>Est. Profit</p>
                      <p className={`text-lg font-bold ${supplierMetric.estimatedProfit >= 0 ? 'text-green-300' : 'text-red-300'} mt-1`}>
                        {formatCurrency(supplierMetric.estimatedProfit)}
                      </p>
                    </div>
                  </div>
                  
                  {/* ROI Box */}
                  <div className="bg-purple-600/20 border border-purple-600/30 rounded-lg p-3">
                    <div className="text-center">
                      <p className="text-purple-400 text-xs font-medium">ROI</p>
                      <p className="text-lg font-bold text-purple-300 mt-1">{formatPercentage(supplierMetric.roi)}</p>
                    </div>
                  </div>
                </div>
                
                {/* Additional Details Row */}
                <div className="pt-4 border-t border-gray-700 mx-2">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-400">
                      Avg Order: <span className="text-white font-medium">{formatCurrency(supplierMetric.averageOrderValue)}</span>
                    </span>
                    <span className="text-gray-400">
                      Last Order: <span className="text-white font-medium">{formatRelativeDate(supplierMetric.lastOrderDate)}</span>
                    </span>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Supplier Modal */}
      <SupplierModal
        isOpen={showSupplierModal}
        onClose={() => setShowSupplierModal(false)}
        onSuccess={handleModalSuccess}
        supplier={editingSupplier}
      />
    </div>
  );
};

export default Suppliers;