import React from 'react';
import { SupplierMetrics } from '../../types/database';
import { formatCurrency, formatRelativeDate } from '../../utils/formatters';

interface TopSuppliersProps {
  suppliers: SupplierMetrics[];
}

const TopSuppliers: React.FC<TopSuppliersProps> = ({ suppliers }) => {
  const totalOrders = suppliers.reduce((sum, s) => sum + s.orderCount, 0);
  const totalSpend = suppliers.reduce((sum, s) => sum + s.totalSpend, 0);
  const totalProfit = suppliers.reduce((sum, s) => sum + s.estimatedProfit, 0);

  return (
    <div className="space-y-4 ">
      {suppliers.length === 0 ? (
        <div className="text-center py-8 text-gray-400">
          <p>No suppliers found</p>
          <p className="text-sm">Add suppliers to see metrics here</p>
        </div>
      ) : (
        suppliers.map((supplierMetric) => (
          <div key={supplierMetric.supplier.id} className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-blue-600/80 backdrop-blur-sm rounded flex items-center justify-center text-white text-sm font-medium">
                {supplierMetric.supplier.name.charAt(0)}
              </div>
              <div>
                <p className="text-white font-medium">{supplierMetric.supplier.name}</p>
                <p className="text-gray-400 text-sm">
                  {supplierMetric.orderCount} orders • Last order: {formatRelativeDate(supplierMetric.lastOrderDate)}
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-white font-medium">{supplierMetric.orderCount}</p>
              <div className="w-24 bg-gray-700/50 backdrop-blur-sm rounded-xl h-1 mt-1">
                <div 
                  className="bg-blue-500 h-1 rounded-full"
                  style={{ width: `${Math.min((supplierMetric.orderCount / Math.max(totalOrders, 1)) * 100, 100)}%` }}
                ></div>
              </div>
            </div>
          </div>
        ))
      )}
      
      <div className="border-t border-gray-700/50 pt-4 mt-6">
        <div className="flex justify-between text-center">
          <div>
            <p className="text-2xl font-bold text-white">{totalOrders}</p>
            <p className="text-gray-400 text-sm">Total Orders</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-white">{formatCurrency(totalSpend)}</p>
            <p className="text-gray-400 text-sm">Total Spend</p>
          </div>
          <div>
            <p className={`text-2xl font-bold ${totalProfit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {formatCurrency(totalProfit)}
            </p>
            <p className="text-gray-400 text-sm">Total Profit</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TopSuppliers;