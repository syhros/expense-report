import React from 'react';
import { Link } from 'react-router-dom';
import Card from '../shared/Card';

interface Order {
  id: string;
  supplier: string;
  status: string;
  cost: string;
  transactionId?: string;
}

interface RecentOrdersProps {
  orders: Order[];
}

const RecentOrders: React.FC<RecentOrdersProps> = ({ orders }) => {
  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'delivered':
      case 'fully received':
      case 'collected':
        return 'bg-green-900 text-green-300';
      case 'in transit':
        return 'bg-blue-900 text-blue-300';
      case 'processing':
        return 'bg-yellow-900 text-yellow-300';
      default:
        return 'bg-gray-700 text-gray-300';
    }
  };

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-white">Recent Orders</h3>
      </div>
      
      <div className="space-y-4">
        {orders.map((order) => (
          <div key={order.id} className="flex items-center justify-between py-3 border-b border-gray-700 last:border-b-0">
            <div className="flex items-center space-x-3">
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              <div>
                {order.transactionId ? (
                  <Link 
                    to={`/transactions`}
                    className="text-blue-400 hover:text-blue-300 font-medium text-sm transition-colors"
                  >
                    {order.id}
                  </Link>
                ) : (
                  <p className="text-blue-400 font-medium text-sm">{order.id}</p>
                )}
                <p className="text-gray-400 text-sm">{order.supplier}</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
                {order.status}
              </span>
              <p className="text-white font-medium">{order.cost}</p>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
};

export default RecentOrders;