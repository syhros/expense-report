import React from 'react';
import { Link } from 'react-router-dom';
import Card from '../shared/Card';

interface Transaction {
  id: string;
  supplier: string;
  status: string;
  cost: string;
  transactionId?: string;
}

interface RecentTransactionsProps {
  transactions: Transaction[];
}

const RecentTransactions: React.FC<RecentTransactionsProps> = ({ transactions }) => {
  const getStatusColor = (status: string) => {
    const isFinalized = ['fully received', 'collected', 'complete'].includes(status.toLowerCase());
    
    if (isFinalized) {
      return 'bg-green-900 text-green-300';
    }
    
    switch (status.toLowerCase()) {
      case 'ordered':
        return 'bg-blue-900 text-blue-300';
      case 'partially delivered':
        return 'bg-orange-900 text-orange-300';
      case 'pending':
        return 'bg-yellow-900 text-yellow-300';
      default:
        return 'bg-gray-700 text-gray-300';
    }
  };

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-white">Recent Transactions</h3>
      </div>
      
      <div className="space-y-4">
        {transactions.map((transaction) => (
          <div key={transaction.id} className="flex items-center justify-between py-3 border-b border-gray-700 last:border-b-0">
            <div className="flex items-center space-x-3">
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              <div>
                {transaction.transactionId ? (
                  <Link 
                    to={`/transactions`}
                    className="text-blue-400 hover:text-blue-300 font-medium text-sm transition-colors"
                  >
                    {transaction.id}
                  </Link>
                ) : (
                  <p className="text-blue-400 font-medium text-sm">{transaction.id}</p>
                )}
                <p className="text-gray-400 text-sm">{transaction.supplier}</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(transaction.status)}`}>
                {transaction.status}
              </span>
              <p className="text-white font-medium">{transaction.cost}</p>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
};

export default RecentTransactions;