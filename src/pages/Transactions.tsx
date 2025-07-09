import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Search, 
  Calendar as CalendarIcon, 
  Download, 
  Upload, 
  Filter, 
  ArrowUpDown,
  DollarSign,
  Truck,
  Package,
  Clock,
  AlertCircle,
  Trash2,
  Check,
  X,
  Circle
} from 'lucide-react';
import Card from '../components/shared/Card';
import TransactionModal from '../components/modals/TransactionModal';
import CalendarModal from '../components/modals/CalendarModal';
import { useTransactionsWithMetrics, useSuppliers } from '../hooks/useData';
import { formatCurrency, formatDate, getStatusColor } from '../utils/formatters';
import { downloadTransactionTemplate } from '../utils/transactionHelpers';
import { deleteTransaction } from '../services/database';

const Transactions: React.FC = () => {
  const { transactions, loading, refetch } = useTransactionsWithMetrics();
  const { suppliers } = useSuppliers();
  const [showTransactionModal, setShowTransactionModal] = useState(false);
  const [showCalendarModal, setShowCalendarModal] = useState(false);
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [transactionToDelete, setTransactionToDelete] = useState<string | null>(null);
  const [editingTransaction, setEditingTransaction] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [supplierFilter, setSupplierFilter] = useState<string>('all');
  const [sortField, setSortField] = useState<string>('ordered_date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [selectMode, setSelectMode] = useState(false);
  const [selectedTransactions, setSelectedTransactions] = useState<string[]>([]);

  // Reset editing transaction when modal is closed
  useEffect(() => {
    if (!showTransactionModal) {
      setEditingTransaction(null);
    }
  }, [showTransactionModal]);

  // Reset selection mode and selected transactions when transactions change
  useEffect(() => {
    if (selectMode) {
      setSelectMode(false);
      setSelectedTransactions([]);
    }
  }, [transactions]);

  const handleAddTransaction = () => {
    setEditingTransaction(null);
    setShowTransactionModal(true);
  };

  const handleEditTransaction = (transaction: any) => {
    setEditingTransaction(transaction);
    setShowTransactionModal(true);
  };

  const handleDeleteTransaction = (id: string) => {
    setTransactionToDelete(id);
    setShowDeleteConfirmation(true);
  };

  const confirmDelete = async () => {
    if (!transactionToDelete) return;
    
    try {
      await deleteTransaction(transactionToDelete);
      refetch();
    } catch (error) {
      console.error('Failed to delete transaction:', error);
    } finally {
      setShowDeleteConfirmation(false);
      setTransactionToDelete(null);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedTransactions.length === 0) return;
    
    const confirmed = window.confirm(
      `Are you sure you want to delete ${selectedTransactions.length} selected transactions? This action cannot be undone.`
    );
    
    if (!confirmed) return;
    
    try {
      // Delete transactions one by one
      for (const id of selectedTransactions) {
        await deleteTransaction(id);
      }
      
      // Reset selection and refresh data
      setSelectedTransactions([]);
      setSelectMode(false);
      refetch();
    } catch (error) {
      console.error('Failed to delete transactions:', error);
    }
  };

  const toggleSelectMode = () => {
    setSelectMode(!selectMode);
    setSelectedTransactions([]);
  };

  const toggleSelectTransaction = (id: string) => {
    setSelectedTransactions(prev => 
      prev.includes(id) 
        ? prev.filter(txnId => txnId !== id) 
        : [...prev, id]
    );
  };

  const selectAllTransactions = () => {
    if (selectedTransactions.length === filteredTransactions.length) {
      setSelectedTransactions([]);
    } else {
      setSelectedTransactions(filteredTransactions.map(t => t.id));
    }
  };

  const handleTransactionSuccess = () => {
    refetch();
  };

  const handleShowCalendar = () => {
    setShowCalendarModal(true);
  };

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Filter and sort transactions
  const filteredTransactions = transactions
    .filter(transaction => {
      // Search filter
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch = 
        transaction.po_number?.toLowerCase().includes(searchLower) ||
        transaction.id.toLowerCase().includes(searchLower) ||
        transaction.supplier?.name.toLowerCase().includes(searchLower) ||
        transaction.category?.toLowerCase().includes(searchLower) ||
        transaction.notes?.toLowerCase().includes(searchLower);

      // Status filter
      const matchesStatus = 
        statusFilter === 'all' || 
        transaction.status.toLowerCase() === statusFilter.toLowerCase();

      // Supplier filter
      const matchesSupplier = 
        supplierFilter === 'all' || 
        transaction.supplier_id === supplierFilter;

      return matchesSearch && matchesStatus && matchesSupplier;
    })
    .sort((a, b) => {
      // Sort by selected field
      let comparison = 0;
      
      switch (sortField) {
        case 'ordered_date':
          comparison = new Date(a.ordered_date || '1970-01-01').getTime() - 
                      new Date(b.ordered_date || '1970-01-01').getTime();
          break;
        case 'delivery_date':
          comparison = new Date(a.delivery_date || '1970-01-01').getTime() - 
                      new Date(b.delivery_date || '1970-01-01').getTime();
          break;
        case 'supplier':
          comparison = (a.supplier?.name || '').localeCompare(b.supplier?.name || '');
          break;
        case 'status':
          comparison = (a.status || '').localeCompare(b.status || '');
          break;
        case 'payment_method':
          comparison = (a.payment_method || '').localeCompare(b.payment_method || '');
          break;
        case 'total_cost':
          comparison = a.totalCost - b.totalCost;
          break;
        case 'profit':
          comparison = a.estimatedProfit - b.estimatedProfit;
          break;
        case 'roi':
          comparison = a.roi - b.roi;
          break;
        default:
          comparison = 0;
      }
      
      return sortDirection === 'asc' ? comparison : -comparison;
    });

  // Get calendar transactions (only pending, ordered, partially delivered)
  const calendarTransactions = transactions.filter(transaction => 
    ['pending', 'ordered', 'partially delivered'].includes(transaction.status.toLowerCase())
  );

  // Get unique statuses for filter
  const statuses = Array.from(new Set(transactions.map(t => t.status)));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-blue-600/80 backdrop-blur-sm rounded-xl">
            <Clock className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Purchase Order Log</h1>
            <p className="text-gray-400">Track and manage your purchase orders</p>
          </div>
        </div>
        
        <div className="flex items-center space-x-3">
          <button
            onClick={handleShowCalendar}
            className="bg-purple-600/80 backdrop-blur-sm hover:bg-purple-700 text-white px-4 py-2 rounded-xl transition-all duration-300 hover:scale-102 flex items-center space-x-2 relative"
          >
            <CalendarIcon className="h-4 w-4" />
            <span>Calendar</span>
            {calendarTransactions.length > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                {calendarTransactions.length}
              </span>
            )}
          </button>
          
          <button
            onClick={toggleSelectMode}
            className={`${
              selectMode 
                ? 'bg-red-600/80 hover:bg-red-700' 
                : 'bg-gray-600/80 hover:bg-gray-700'
            } backdrop-blur-sm text-white px-4 py-2 rounded-xl transition-all duration-300 hover:scale-102 flex items-center space-x-2`}
          >
            <Check className="h-4 w-4" />
            <span>{selectMode ? 'Cancel' : 'Select'}</span>
          </button>
          
          {selectMode && selectedTransactions.length > 0 && (
            <button
              onClick={handleBulkDelete}
              className="bg-red-600/80 backdrop-blur-sm hover:bg-red-700 text-white px-4 py-2 rounded-xl transition-all duration-300 hover:scale-102 flex items-center space-x-2"
            >
              <Trash2 className="h-4 w-4" />
              <span>Delete ({selectedTransactions.length})</span>
            </button>
          )}
          
          <button
            onClick={() => downloadTransactionTemplate()}
            className="bg-green-600/80 backdrop-blur-sm hover:bg-green-700 text-white px-4 py-2 rounded-xl transition-all duration-300 hover:scale-102 flex items-center space-x-2"
          >
            <Download className="h-4 w-4" />
            <span>Template</span>
          </button>
          
          <button
            onClick={handleAddTransaction}
            className="bg-blue-600/80 backdrop-blur-sm hover:bg-blue-700 text-white px-4 py-2 rounded-xl transition-all duration-300 hover:scale-102 flex items-center space-x-2"
          >
            <Plus className="h-4 w-4" />
            <span>New Order</span>
          </button>
        </div>
      </div>

      {/* Filters */}
      <Card className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Search */}
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="block w-full pl-10 pr-3 py-2 border border-gray-600 rounded-xl bg-gray-700/50 backdrop-blur-sm text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300"
              placeholder="Search orders..."
            />
          </div>

          {/* Status Filter */}
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Filter className="h-5 w-5 text-gray-400" />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="block w-full pl-10 pr-3 py-2 border border-gray-600 rounded-xl bg-gray-700/50 backdrop-blur-sm text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300 appearance-none"
            >
              <option value="all">All Statuses</option>
              {statuses.map(status => (
                <option key={status} value={status}>{status}</option>
              ))}
            </select>
          </div>

          {/* Supplier Filter */}
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Truck className="h-5 w-5 text-gray-400" />
            </div>
            <select
              value={supplierFilter}
              onChange={(e) => setSupplierFilter(e.target.value)}
              className="block w-full pl-10 pr-3 py-2 border border-gray-600 rounded-xl bg-gray-700/50 backdrop-blur-sm text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300 appearance-none"
            >
              <option value="all">All Suppliers</option>
              {suppliers.map(supplier => (
                <option key={supplier.id} value={supplier.id}>{supplier.name}</option>
              ))}
            </select>
          </div>

          {/* Sort */}
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <ArrowUpDown className="h-5 w-5 text-gray-400" />
            </div>
            <select
              value={`${sortField}-${sortDirection}`}
              onChange={(e) => {
                const [field, direction] = e.target.value.split('-');
                setSortField(field);
                setSortDirection(direction as 'asc' | 'desc');
              }}
              className="block w-full pl-10 pr-3 py-2 border border-gray-600 rounded-xl bg-gray-700/50 backdrop-blur-sm text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300 appearance-none"
            >
              <option value="ordered_date-desc">Date (Newest First)</option>
              <option value="ordered_date-asc">Date (Oldest First)</option>
              <option value="delivery_date-desc">Delivery Date (Newest First)</option>
              <option value="delivery_date-asc">Delivery Date (Oldest First)</option>
              <option value="supplier-asc">Supplier (A-Z)</option>
              <option value="supplier-desc">Supplier (Z-A)</option>
              <option value="status-asc">Status (A-Z)</option>
              <option value="status-desc">Status (Z-A)</option>
              <option value="total_cost-desc">Cost (Highest First)</option>
              <option value="total_cost-asc">Cost (Lowest First)</option>
              <option value="roi-desc">ROI (Highest First)</option>
              <option value="roi-asc">ROI (Lowest First)</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Transactions Table */}
      <Card className="p-6">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          </div>
        ) : filteredTransactions.length === 0 ? (
          <div className="text-center py-8">
            <Package className="h-16 w-16 text-gray-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-white mb-2">No Purchase Orders Found</h2>
            <p className="text-gray-400 mb-6">
              {searchTerm || statusFilter !== 'all' || supplierFilter !== 'all'
                ? 'Try adjusting your filters to see more results.'
                : 'Create your first purchase order to get started.'}
            </p>
            <button
              onClick={handleAddTransaction}
              className="bg-blue-600/80 backdrop-blur-sm hover:bg-blue-700 text-white px-6 py-3 rounded-xl transition-all duration-300 hover:scale-102 flex items-center space-x-2 mx-auto"
            >
              <Plus className="h-5 w-5" />
              <span>Create Purchase Order</span>
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-gray-400 text-sm border-b border-gray-700/50">
                  <th className="pb-3 font-medium cursor-pointer" onClick={() => handleSort('ordered_date')}>
                    {selectMode ? (
                      <div className="flex items-center">
                        <button
                          onClick={selectAllTransactions}
                          className={`w-5 h-5 rounded border ${
                            selectedTransactions.length === filteredTransactions.length
                              ? 'bg-blue-600 border-blue-600 text-white'
                              : 'border-gray-500 text-transparent hover:border-blue-500'
                          } flex items-center justify-center transition-colors`}
                        >
                          {selectedTransactions.length === filteredTransactions.length && (
                            <Check className="h-3 w-3" />
                          )}
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center space-x-1">
                        <span>TXN ID</span>
                        {sortField === 'ordered_date' && (
                          <ArrowUpDown className={`h-4 w-4 ${sortDirection === 'asc' ? 'rotate-180' : ''}`} />
                        )}
                      </div>
                    )}
                  </th>
                  <th className="pb-3 font-medium">
                    <div className="flex items-center space-x-1">
                      <span>PO ID</span>
                    </div>
                  </th>
                  <th className="pb-3 font-medium cursor-pointer" onClick={() => handleSort('ordered_date')}>
                    <div className="flex items-center space-x-1">
                      <span>Date</span>
                      {sortField === 'ordered_date' && (
                        <ArrowUpDown className={`h-4 w-4 ${sortDirection === 'asc' ? 'rotate-180' : ''}`} />
                      )}
                    </div>
                  </th>
                  <th className="pb-3 font-medium cursor-pointer" onClick={() => handleSort('supplier')}>
                    <div className="flex items-center space-x-1">
                      <span>Supplier</span>
                      {sortField === 'supplier' && (
                        <ArrowUpDown className={`h-4 w-4 ${sortDirection === 'asc' ? 'rotate-180' : ''}`} />
                      )}
                    </div>
                  </th>
                  <th className="pb-3 font-medium">
                    <div className="flex items-center space-x-1">
                      <span>Category</span>
                    </div>
                  </th>
                  <th className="pb-3 font-medium cursor-pointer" onClick={() => handleSort('status')}>
                    <div className="flex items-center space-x-1">
                      <span>Status</span>
                      {sortField === 'status' && (
                        <ArrowUpDown className={`h-4 w-4 ${sortDirection === 'asc' ? 'rotate-180' : ''}`} />
                      )}
                    </div>
                  </th>
                  <th className="pb-3 font-medium cursor-pointer" onClick={() => handleSort('payment_method')}>
                    <div className="flex items-center space-x-1">
                      <span>Payment</span>
                      {sortField === 'payment_method' && (
                        <ArrowUpDown className={`h-4 w-4 ${sortDirection === 'asc' ? 'rotate-180' : ''}`} />
                      )}
                    </div>
                  </th>
                  <th className="pb-3 font-medium cursor-pointer" onClick={() => handleSort('total_cost')}>
                    <div className="flex items-center space-x-1">
                      <span>Total Cost</span>
                      {sortField === 'total_cost' && (
                        <ArrowUpDown className={`h-4 w-4 ${sortDirection === 'asc' ? 'rotate-180' : ''}`} />
                      )}
                    </div>
                  </th>
                  <th className="pb-3 font-medium cursor-pointer" onClick={() => handleSort('profit')}>
                    <div className="flex items-center space-x-1">
                      <span>Profit</span>
                      {sortField === 'profit' && (
                        <ArrowUpDown className={`h-4 w-4 ${sortDirection === 'asc' ? 'rotate-180' : ''}`} />
                      )}
                    </div>
                  </th>
                  <th className="pb-3 font-medium cursor-pointer" onClick={() => handleSort('roi')}>
                    <div className="flex items-center space-x-1">
                      <span>ROI%</span>
                      {sortField === 'roi' && (
                        <ArrowUpDown className={`h-4 w-4 ${sortDirection === 'asc' ? 'rotate-180' : ''}`} />
                      )}
                    </div>
                  </th>
                  <th className="pb-3 font-medium">
                    {/* Empty header for Directors Loan column */}
                  </th>
                  <th className="pb-3 font-medium">
                    {/* Delete column - no header */}
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredTransactions.map((transaction) => (
                  <tr 
                    key={transaction.id} 
                    className="border-b border-gray-700/30 hover:bg-gray-700/20 cursor-pointer transition-colors"
                    onClick={() => !selectMode && handleEditTransaction(transaction)}
                  >
                    <td className="py-4">
                      {selectMode ? (
                        <div className="flex items-center">
                          <button
                            onClick={() => toggleSelectTransaction(transaction.id)}
                            className={`w-5 h-5 rounded border ${
                              selectedTransactions.includes(transaction.id)
                                ? 'bg-blue-600 border-blue-600 text-white'
                                : 'border-gray-500 text-transparent hover:border-blue-500'
                            } flex items-center justify-center transition-colors`}
                          >
                            {selectedTransactions.includes(transaction.id) && (
                              <Check className="h-3 w-3" />
                            )}
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center">
                          {transaction.isDirectorsLoan && (
                            <div className="mr-2 text-orange-400">
                              <Circle className="h-2 w-2 fill-current" />
                            </div>
                          )}
                          <div className="text-blue-400 font-medium">
                            {transaction.id.slice(0, 8).toUpperCase()}
                          </div>
                        </div>
                      )}
                    </td>
                    <td className="py-4">
                      <div className="text-gray-400 text-sm">
                        {transaction.po_number}
                      </div>
                    </td>
                    <td className="py-4">
                      <div className="text-white">
                        {formatDate(transaction.ordered_date)}
                      </div>
                      <div className="text-gray-400 text-sm">
                        {transaction.delivery_date ? `Delivery: ${formatDate(transaction.delivery_date)}` : 'No delivery date'}
                      </div>
                    </td>
                    <td className="py-4">
                      <div className="text-white">
                        {transaction.supplier?.name || 'N/A'}
                      </div>
                    </td>
                    <td className="py-4">
                      <div className="text-white whitespace-normal break-words max-w-[100px]">
                        <span className="whitespace-pre-line">
                          {transaction.category ? transaction.category.replace(' ', '\n') : 'N/A'}
                        </span>
                      </div>
                    </td>
                    <td className="py-4">
                      <div className={`text-base font-medium px-3 py-1 rounded-full inline-block ${getStatusColor(transaction.status)}`}>
                        {transaction.status || 'pending'}
                      </div>
                    </td>
                    <td className="py-4">
                      <div className="text-gray-300 text-sm">
                        {transaction.payment_method || 'N/A'}
                      </div>
                    </td>
                    <td className="py-2">
                      <div className="bg-purple-900/30 border border-purple-600/30 rounded-xl px-1 py-1 text-center">
                        <span className="text-purple-300 font-medium">
                          {formatCurrency(transaction.totalCost)}
                        </span>
                      </div>
                    </td>
                    <td className="py-4">
                      <div className={`text-sm ${transaction.estimatedProfit >= 0 ? 'bg-green-900/30 border-green-600/30' : 'bg-red-900/30 border-red-600/30'} border rounded-xl px-1 py-1 text-center`}>
                        <span className={`${transaction.estimatedProfit >= 0 ? 'text-green-300' : 'text-red-300'} font-medium`}>
                          {formatCurrency(transaction.estimatedProfit)}
                        </span>
                      </div>
                    </td>
                    <td className="py-4">
                      <div className={`${transaction.roi >= 0 ? 'bg-green-900/30 border-green-600/30' : 'bg-red-900/30 border-red-600/30'} border rounded-xl px-1 py-1 text-center`}>
                        <span className={`${transaction.roi >= 0 ? 'text-green-300' : 'text-red-300'} font-medium`}>
                          {transaction.roi.toFixed(1)}%
                        </span>
                      </div>
                    </td>
                    <td className="py-4">
                      {/* Empty column for Director's Loan indicator (shown with orange dot in TXN ID column) */}
                    </td>
                    <td className="py-4">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteTransaction(transaction.id);
                        }}
                        className="text-red-400 hover:text-red-300 transition-colors p-1 hover:bg-red-900/20 rounded"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Transaction Modal */}
      <TransactionModal
        isOpen={showTransactionModal}
        onClose={() => setShowTransactionModal(false)}
        onSuccess={handleTransactionSuccess}
        transaction={editingTransaction}
      />

      {/* Calendar Modal */}
      <CalendarModal
        isOpen={showCalendarModal}
        onClose={() => setShowCalendarModal(false)}
        transactions={calendarTransactions}
      />
      
      {/* Delete Confirmation Modal */}
      {showDeleteConfirmation && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
          <div className="bg-gray-800/90 backdrop-blur-xl border border-gray-600/30 rounded-2xl shadow-2xl w-full max-w-md p-6">
            <h3 className="text-xl font-semibold text-white mb-4">Confirm Deletion</h3>
            <p className="text-gray-300 mb-6">
              Are you sure you want to delete this transaction? This action cannot be undone.
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowDeleteConfirmation(false)}
                className="px-4 py-2 text-gray-400 hover:text-white transition-all duration-300 hover:scale-102"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="bg-red-600/80 backdrop-blur-sm hover:bg-red-700 text-white px-6 py-3 rounded-xl transition-all duration-300 hover:scale-102"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Transactions;