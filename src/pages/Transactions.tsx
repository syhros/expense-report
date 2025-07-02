import React, { useState, useRef } from 'react';
import { Plus, Filter, Trash2, Check, X, Download, Upload, AlertCircle } from 'lucide-react';
import Card from '../components/shared/Card';
import TransactionModal from '../components/modals/TransactionModal';
import { useTransactionsWithMetrics, useDashboardMetrics, useBudgets } from '../hooks/useData';
import { updateTransaction, deleteTransaction } from '../services/database';
import { formatCurrency, formatDate, truncateText } from '../utils/formatters';
import { downloadTransactionTemplate, parseTransactionCSV } from '../utils/transactionHelpers';
import { importTransactionsFromCSV } from '../services/transactionImporter';

const Transactions: React.FC = () => {
  const { transactions, loading: transactionsLoading, error, refetch } = useTransactionsWithMetrics();
  const { metrics, loading: metricsLoading } = useDashboardMetrics();
  const { currentBudget, loading: budgetLoading } = useBudgets();
  const [showTransactionModal, setShowTransactionModal] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState<string | null>(null);
  
  // Import states
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [importSuccess, setImportSuccess] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loading = transactionsLoading || metricsLoading || budgetLoading;

  const handleAddTransaction = () => {
    setEditingTransaction(null);
    setShowTransactionModal(true);
  };

  const handleEditTransaction = (transaction: any) => {
    setEditingTransaction(transaction);
    setShowTransactionModal(true);
  };

  const handleModalSuccess = () => {
    refetch();
  };

  const handleStatusChange = async (transactionId: string, newStatus: string) => {
    try {
      await updateTransaction(transactionId, { status: newStatus });
      refetch();
    } catch (err) {
      console.error('Failed to update transaction status:', err);
    }
  };

  const handleDeleteClick = (transactionId: string) => {
    if (deletingId === transactionId) {
      // Second click - show confirmation modal
      setShowDeleteModal(transactionId);
      setDeletingId(null);
    } else {
      // First click - show tick/cross
      setDeletingId(transactionId);
    }
  };

  const handleDeleteCancel = () => {
    setDeletingId(null);
  };

  const handleDeleteConfirm = async () => {
    if (showDeleteModal) {
      try {
        await deleteTransaction(showDeleteModal);
        setShowDeleteModal(null);
        refetch();
      } catch (err) {
        console.error('Failed to delete transaction:', err);
      }
    }
  };

  // Import functionality
  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setImporting(true);
    setImportError(null);
    setImportSuccess(null);

    try {
      const text = await file.text();
      const { data, errors } = parseTransactionCSV(text);

      if (errors.length > 0) {
        setImportError(`Import errors: ${errors.join('; ')}`);
        return;
      }

      const result = await importTransactionsFromCSV(data);

      if (result.errors.length > 0) {
        setImportError(`Some items failed to import: ${result.errors.join('; ')}`);
      }

      setImportSuccess(`Successfully imported ${result.imported} transactions. ${result.skipped} items skipped due to errors.`);
      refetch();
    } catch (err) {
      setImportError(err instanceof Error ? err.message : 'Failed to import CSV file');
    } finally {
      setImporting(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Enhanced status color function with finalized status indicators
  const getEnhancedStatusColor = (status: string): string => {
    const isFinalized = ['fully received', 'collected', 'complete'].includes(status.toLowerCase());
    
    switch (status.toLowerCase()) {
      case 'pending':
        return 'bg-yellow-900/80 backdrop-blur-sm text-yellow-300 border border-yellow-600/50';
      case 'ordered':
        return 'bg-blue-900/80 backdrop-blur-sm text-blue-300 border border-blue-600/50';
      case 'partially delivered':
        return 'bg-orange-900/80 backdrop-blur-sm text-orange-300 border border-orange-600/50';
      case 'fully received':
      case 'collected':
      case 'complete':
        return 'bg-green-900/80 backdrop-blur-sm text-green-300 border border-green-600/50';
      default:
        return 'bg-gray-700/80 backdrop-blur-sm text-gray-300 border border-gray-600/50';
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white">Purchase Order Log</h1>
            <p className="text-gray-400 mt-1">Track and manage all your purchase orders</p>
          </div>
          <div className="flex items-center space-x-3">
            <button 
              onClick={downloadTransactionTemplate}
              className="bg-green-600/80 backdrop-blur-sm hover:bg-green-700 text-white px-4 py-2 rounded-xl transition-all duration-300 hover:scale-102 flex items-center space-x-2"
            >
              <Download className="h-4 w-4" />
              <span>Template</span>
            </button>
            <button 
              onClick={handleImportClick}
              disabled={importing}
              className="bg-purple-600/80 backdrop-blur-sm hover:bg-purple-700 disabled:bg-gray-600 text-white px-4 py-2 rounded-xl transition-all duration-300 hover:scale-102 flex items-center space-x-2"
            >
              {importing ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              ) : (
                <Upload className="h-4 w-4" />
              )}
              <span>{importing ? 'Importing...' : 'Import'}</span>
            </button>
            <button 
              onClick={handleAddTransaction}
              className="bg-blue-600/80 backdrop-blur-sm hover:bg-blue-700 text-white px-4 py-2 rounded-xl transition-all duration-300 hover:scale-102 flex items-center space-x-2"
            >
              <Plus className="h-4 w-4" />
              <span>Add Purchase Order</span>
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
            <h1 className="text-3xl font-bold text-white">Purchase Order Log</h1>
            <p className="text-gray-400 mt-1">Track and manage all your purchase orders</p>
          </div>
          <div className="flex items-center space-x-3">
            <button 
              onClick={downloadTransactionTemplate}
              className="bg-green-600/80 backdrop-blur-sm hover:bg-green-700 text-white px-4 py-2 rounded-xl transition-all duration-300 hover:scale-102 flex items-center space-x-2"
            >
              <Download className="h-4 w-4" />
              <span>Template</span>
            </button>
            <button 
              onClick={handleImportClick}
              disabled={importing}
              className="bg-purple-600/80 backdrop-blur-sm hover:bg-purple-700 disabled:bg-gray-600 text-white px-4 py-2 rounded-xl transition-all duration-300 hover:scale-102 flex items-center space-x-2"
            >
              {importing ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              ) : (
                <Upload className="h-4 w-4" />
              )}
              <span>{importing ? 'Importing...' : 'Import'}</span>
            </button>
            <button 
              onClick={handleAddTransaction}
              className="bg-blue-600/80 backdrop-blur-sm hover:bg-blue-700 text-white px-4 py-2 rounded-xl transition-all duration-300 hover:scale-102 flex items-center space-x-2"
            >
              <Plus className="h-4 w-4" />
              <span>Add Purchase Order</span>
            </button>
          </div>
        </div>
        <Card className="p-6">
          <div className="text-center text-red-400">
            <p>Error loading purchase orders: {error}</p>
          </div>
        </Card>
      </div>
    );
  }

  const budgetAmount = currentBudget?.amount || 0;
  const monthlySpend = metrics?.monthlySpend || 0;
  const budgetRemaining = budgetAmount - monthlySpend;
  const pendingOrders = transactions.filter(t => 
    t.status === 'pending' || t.status === 'ordered'
  ).length;

  // Calculate days left in current month
  const now = new Date();
  const daysLeftInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate() - now.getDate();

  const statuses = ['Pending', 'Ordered', 'Partially Delivered', 'Fully Received', 'Collected', 'Complete'];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Purchase Order Log</h1>
          <p className="text-gray-400 mt-1">Track and manage all your purchase orders</p>
        </div>
        <div className="flex items-center space-x-3">
          <button 
            onClick={downloadTransactionTemplate}
            className="bg-green-600/80 backdrop-blur-sm hover:bg-green-700 text-white px-4 py-2 rounded-xl transition-all duration-300 hover:scale-102 flex items-center space-x-2"
          >
            <Download className="h-4 w-4" />
            <span>Template</span>
          </button>
          <button 
            onClick={handleImportClick}
            disabled={importing}
            className="bg-purple-600/80 backdrop-blur-sm hover:bg-purple-700 disabled:bg-gray-600 text-white px-4 py-2 rounded-xl transition-all duration-300 hover:scale-102 flex items-center space-x-2"
          >
            {importing ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
            ) : (
              <Upload className="h-4 w-4" />
            )}
            <span>{importing ? 'Importing...' : 'Import'}</span>
          </button>
          <button 
            onClick={handleAddTransaction}
            className="bg-blue-600/80 backdrop-blur-sm hover:bg-blue-700 text-white px-4 py-2 rounded-xl transition-all duration-300 hover:scale-102 flex items-center space-x-2"
          >
            <Plus className="h-4 w-4" />
            <span>Add Purchase Order</span>
          </button>
        </div>
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".csv"
        onChange={handleFileChange}
        className="hidden"
      />

      {/* Import Status Messages */}
      {importError && (
        <Card className="p-4 bg-red-900/20 border-red-600/30">
          <div className="flex items-center space-x-3">
            <AlertCircle className="h-5 w-5 text-red-400" />
            <div>
              <h3 className="text-red-300 font-medium">Import Error</h3>
              <p className="text-red-400 text-sm">{importError}</p>
            </div>
          </div>
        </Card>
      )}

      {importSuccess && (
        <Card className="p-4 bg-green-900/20 border-green-600/30">
          <div className="flex items-center space-x-3">
            <Check className="h-5 w-5 text-green-400" />
            <div>
              <h3 className="text-green-300 font-medium">Import Successful</h3>
              <p className="text-green-400 text-sm">{importSuccess}</p>
            </div>
          </div>
        </Card>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-400">This Month</p>
              <p className="text-2xl font-bold text-white mt-2">{transactions.length}</p>
              <p className="text-xs text-gray-500 mt-1">Purchase Orders</p>
            </div>
            <div className="p-3 bg-blue-600/80 backdrop-blur-sm rounded-xl">
              <span className="text-white text-xl">📊</span>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-400">Monthly Spend</p>
              <p className="text-2xl font-bold text-white mt-2">{formatCurrency(monthlySpend)}</p>
              <p className="text-xs text-gray-500 mt-1">
                {budgetAmount > 0 ? `${((monthlySpend / budgetAmount) * 100).toFixed(1)}% of budget` : 'No budget set'}
              </p>
            </div>
            <div className="p-3 bg-green-600/80 backdrop-blur-sm rounded-xl">
              <span className="text-white text-xl">💰</span>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-400">Budget Remaining</p>
              <p className={`text-2xl font-bold mt-2 ${budgetRemaining >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {formatCurrency(budgetRemaining)}
              </p>
              <p className="text-xs text-gray-500 mt-1">{daysLeftInMonth} days left</p>
            </div>
            <div className="p-3 bg-purple-600/80 backdrop-blur-sm rounded-xl">
              <span className="text-white text-xl">✅</span>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-400">Pending Orders</p>
              <p className="text-2xl font-bold text-white mt-2">{pendingOrders}</p>
              <p className="text-xs text-gray-500 mt-1">Awaiting completion</p>
            </div>
            <div className="p-3 bg-orange-600/80 backdrop-blur-sm rounded-xl">
              <span className="text-white text-xl">⏳</span>
            </div>
          </div>
        </Card>
      </div>

      {/* Filters Section */}
      <Card className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">Supplier</label>
            <select className="w-full bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-300">
              <option>All Suppliers</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">Status</label>
            <select className="w-full bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-300">
              <option>All Statuses</option>
              {statuses.map(status => (
                <option key={status} value={status.toLowerCase()}>{status}</option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">Date Range</label>
            <select className="w-full bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-300">
              <option>All Time</option>
              <option>Last 7 days</option>
              <option>Last 30 days</option>
              <option>Last 3 months</option>
              <option>Last 6 months</option>
              <option>This year</option>
            </select>
          </div>
          
          <div className="flex items-end">
            <button className="w-full bg-white/10 backdrop-blur-sm hover:bg-white/20 text-white px-4 py-2 rounded-xl transition-all duration-300 hover:scale-102 flex items-center justify-center space-x-2">
              <Filter className="h-4 w-4" />
              <span>Apply Filters</span>
            </button>
          </div>
        </div>
      </Card>

      {/* Transaction Table */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-800/50 backdrop-blur-sm border-b border-gray-700/50">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  PO ID
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Ordered Date
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Delivery Date
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Supplier
                </th>
                <th className="px-6 py-4 text-center text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Category / Status
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Payment Method
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Total Cost
                </th>
                <th className="px-6 py-4 text-center text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Est. P/L
                </th>
                <th className="px-6 py-4 text-center text-xs font-medium text-gray-400 uppercase tracking-wider">
                  ROI
                </th>
                <th className="px-6 py-4 text-center text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Delete
                </th>
              </tr>
            </thead>
            <tbody className="bg-gray-800/30 backdrop-blur-sm divide-y divide-gray-700/50">
              {transactions.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-6 py-12 text-center">
                    <div className="text-gray-400">
                      <p className="text-lg mb-2">No purchase orders found</p>
                      <p className="text-sm">Add your first purchase order to get started</p>
                    </div>
                  </td>
                </tr>
              ) : (
                transactions.map((transaction) => (
                  <tr key={transaction.id} className="hover:bg-white/5 transition-colors duration-300">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-blue-400">
                      <button
                        onClick={() => handleEditTransaction(transaction)}
                        className="hover:text-blue-300 transition-colors duration-300"
                      >
                        {transaction.id.slice(0, 8).toUpperCase()}
                      </button>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                      {formatDate(transaction.ordered_date)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                      {formatDate(transaction.delivery_date)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                      {transaction.supplier?.name || 'Unknown'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-300">
                      {/* Category and Status centered */}
                      <div className="space-y-1 text-center">
                        <div className="text-gray-300 text-xs">
                          {transaction.category || 'N/A'}
                        </div>
                        <div className="flex justify-center">
                          <select
                            value={transaction.status}
                            onChange={(e) => handleStatusChange(transaction.id, e.target.value)}
                            className={`px-2 py-1 text-xs font-medium rounded-full border-0 focus:outline-none focus:ring-2 focus:ring-blue-500 ${getEnhancedStatusColor(transaction.status)}`}
                          >
                            {statuses.map(status => (
                              <option key={status} value={status.toLowerCase()} className="bg-gray-800 text-white">
                                {status}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                      {transaction.payment_method || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                      {formatCurrency(transaction.totalCost)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <div className={`inline-flex items-center px-3 py-1 rounded-lg text-sm font-medium backdrop-blur-sm ${
                        transaction.estimatedProfit >= 0 
                          ? 'bg-green-900/80 text-green-300 border border-green-600/50' 
                          : 'bg-red-900/80 text-red-300 border border-red-600/50'
                      }`}>
                        {formatCurrency(transaction.estimatedProfit)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <div className={`inline-flex items-center px-3 py-1 rounded-lg text-sm font-medium backdrop-blur-sm ${
                        transaction.roi >= 0 
                          ? 'bg-green-900/80 text-green-300 border border-green-600/50' 
                          : 'bg-red-900/80 text-red-300 border border-red-600/50'
                      }`}>
                        {transaction.roi.toFixed(1)}%
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300 text-center">
                      <div className="flex items-center justify-center">                          
                        {deletingId === transaction.id ? (
                          <div className="flex items-center space-x-1">
                            <button
                              onClick={() => handleDeleteClick(transaction.id)}
                              className="text-green-400 hover:text-green-300 p-1"
                              title="Confirm delete"
                            >
                              <Check className="h-3 w-3" />
                            </button>
                            <button
                              onClick={handleDeleteCancel}
                              className="text-red-400 hover:text-red-300 p-1"
                              title="Cancel delete"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => handleDeleteClick(transaction.id)}
                            className="text-red-400 hover:text-red-300 p-1"
                            title="Delete purchase order"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-gray-800/90 backdrop-blur-xl border border-gray-600/30 rounded-2xl p-6 w-96">
            <h3 className="text-lg font-semibold text-white mb-4 text-center">Delete Purchase Order</h3>
            <div className="text-center mb-6">
              <p className="text-gray-300 mb-2">
                Delete Purchase Order <span className="font-mono text-blue-400">{showDeleteModal.slice(0, 8).toUpperCase()}</span>
              </p>
              <p className="text-gray-300">
                {transactions.find(t => t.id === showDeleteModal)?.supplier?.name || 'Unknown Supplier'}
              </p>
            </div>
            <div className="flex justify-center space-x-3">
              <button
                onClick={() => setShowDeleteModal(null)}
                className="px-6 py-2 bg-gray-600/80 backdrop-blur-sm hover:bg-gray-700 text-white rounded-xl transition-all duration-300 hover:scale-102"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteConfirm}
                className="px-6 py-2 bg-red-600/80 backdrop-blur-sm hover:bg-red-700 text-white rounded-xl transition-all duration-300 hover:scale-102"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Transaction Modal */}
      <TransactionModal
        isOpen={showTransactionModal}
        onClose={() => setShowTransactionModal(false)}
        onSuccess={handleModalSuccess}
        transaction={editingTransaction}
      />
    </div>
  );
};

export default Transactions;