import React, { useState, useRef } from 'react';
import { Plus, Filter, Trash2, Check, X, Download, Upload, AlertCircle, BookOpen } from 'lucide-react';
import Card from '../components/shared/Card';
import GeneralLedgerModal from '../components/modals/GeneralLedgerModal';
import { useGeneralLedgerTransactions } from '../hooks/useData';
import { updateGeneralLedgerTransaction, deleteGeneralLedgerTransaction } from '../services/database';
import { formatCurrency, formatDate } from '../utils/formatters';

const GeneralLedger: React.FC = () => {
  const { transactions, loading, error, refetch } = useGeneralLedgerTransactions();
  const [showModal, setShowModal] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState<string | null>(null);

  const handleAddTransaction = () => {
    setEditingTransaction(null);
    setShowModal(true);
  };

  const handleEditTransaction = (transaction: any) => {
    setEditingTransaction(transaction);
    setShowModal(true);
  };

  const handleModalSuccess = () => {
    refetch();
  };

  const handleStatusChange = async (transactionId: string, newStatus: string) => {
    try {
      await updateGeneralLedgerTransaction(transactionId, { status: newStatus });
      refetch();
    } catch (err) {
      console.error('Failed to update transaction status:', err);
    }
  };

  const handleDeleteClick = (transactionId: string) => {
    if (deletingId === transactionId) {
      setShowDeleteModal(transactionId);
      setDeletingId(null);
    } else {
      setDeletingId(transactionId);
    }
  };

  const handleDeleteCancel = () => {
    setDeletingId(null);
  };

  const handleDeleteConfirm = async () => {
    if (showDeleteModal) {
      try {
        await deleteGeneralLedgerTransaction(showDeleteModal);
        setShowDeleteModal(null);
        refetch();
      } catch (err) {
        console.error('Failed to delete transaction:', err);
      }
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white">General Ledger</h1>
            <p className="text-gray-400 mt-1">Track all non-purchase-order financial events</p>
          </div>
          <button 
            onClick={handleAddTransaction}
            className="bg-blue-600/80 backdrop-blur-sm hover:bg-blue-700 text-white px-4 py-2 rounded-xl transition-all duration-300 hover:scale-102 flex items-center space-x-2"
          >
            <Plus className="h-4 w-4" />
            <span>Add Transaction</span>
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
            <h1 className="text-3xl font-bold text-white">General Ledger</h1>
            <p className="text-gray-400 mt-1">Track all non-purchase-order financial events</p>
          </div>
          <button 
            onClick={handleAddTransaction}
            className="bg-blue-600/80 backdrop-blur-sm hover:bg-blue-700 text-white px-4 py-2 rounded-xl transition-all duration-300 hover:scale-102 flex items-center space-x-2"
          >
            <Plus className="h-4 w-4" />
            <span>Add Transaction</span>
          </button>
        </div>
        <Card className="p-6">
          <div className="text-center text-red-400">
            <p>Error loading general ledger: {error}</p>
          </div>
        </Card>
      </div>
    );
  }

  // Calculate summary metrics with loan handling
  const incomeTransactions = transactions.filter(t => t.type === 'Income');
  const expenseTransactions = transactions.filter(t => t.type === 'Expense');
  const loanReceivedTransactions = transactions.filter(t => t.type === 'Loan Received');
  const loanRepaymentTransactions = transactions.filter(t => t.type === 'Loan Repayment');
  
  const totalIncome = incomeTransactions.reduce((sum, t) => sum + t.amount, 0);
  const totalExpenses = expenseTransactions.reduce((sum, t) => sum + Math.abs(t.amount), 0);
  
  // Calculate total loans: -(sum of 'Loan Received') + (sum of 'Loan Repayment')
  const totalLoansReceived = loanReceivedTransactions.reduce((sum, t) => sum + Math.abs(t.amount), 0);
  const totalLoansRepaid = loanRepaymentTransactions.reduce((sum, t) => sum + Math.abs(t.amount), 0);
  const totalLoans = (totalLoansReceived) - totalLoansRepaid;
  
  // Net amount includes all transactions (income, expenses, and loans for cashflow)
  const netAmount = totalIncome - totalExpenses + loanReceivedTransactions.reduce((sum, t) => sum + t.amount, 0) + loanRepaymentTransactions.reduce((sum, t) => sum + t.amount, 0);
  
  const pendingTransactions = transactions.filter(t => t.status === 'pending').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">General Ledger</h1>
          <p className="text-gray-400 mt-1">Track all non-purchase-order financial events</p>
        </div>
        <button 
          onClick={handleAddTransaction}
          className="bg-blue-600/80 backdrop-blur-sm hover:bg-blue-700 text-white px-4 py-2 rounded-xl transition-all duration-300 hover:scale-102 flex items-center space-x-2"
        >
          <Plus className="h-4 w-4" />
          <span>Add Transaction</span>
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-400">Total Transactions</p>
              <p className="text-2xl font-bold text-white mt-2">{transactions.length}</p>
              <p className="text-xs text-gray-500 mt-1">All time</p>
            </div>
            <div className="p-3 bg-blue-600/80 backdrop-blur-sm rounded-xl">
              <BookOpen className="h-6 w-6 text-white" />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-400">Total Income</p>
              <p className="text-2xl font-bold text-green-400 mt-2">{formatCurrency(totalIncome)}</p>
              <p className="text-xs text-gray-500 mt-1">Revenue & income</p>
            </div>
            <div className="p-3 bg-green-600/80 backdrop-blur-sm rounded-xl">
              <span className="text-white text-xl">💰</span>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-400">Total Expenses</p>
              <p className="text-2xl font-bold text-red-400 mt-2">{formatCurrency(totalExpenses)}</p>
              <p className="text-xs text-gray-500 mt-1">Costs & expenses</p>
            </div>
            <div className="p-3 bg-red-600/80 backdrop-blur-sm rounded-xl">
              <span className="text-white text-xl">💸</span>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-400">Total Loans</p>
              <p className={`text-2xl font-bold mt-2 ${totalLoans >= 0 ? 'text-orange-400' : 'text-blue-400'}`}>
                {formatCurrency(totalLoans)}
              </p>
              <p className="text-xs text-gray-500 mt-1">Director's loans</p>
            </div>
            <div className="p-3 bg-orange-600/80 backdrop-blur-sm rounded-xl">
              <span className="text-white text-xl">🏦</span>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-400">Net Amount</p>
              <p className={`text-2xl font-bold mt-2 ${netAmount >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {formatCurrency(netAmount)}
              </p>
              <p className="text-xs text-gray-500 mt-1">{pendingTransactions} pending</p>
            </div>
            <div className="p-3 bg-purple-600/80 backdrop-blur-sm rounded-xl">
              <span className="text-white text-xl">📊</span>
            </div>
          </div>
        </Card>
      </div>

      {/* Filters Section */}
      <Card className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">Category</label>
            <select className="w-full bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-300">
              <option>All Categories</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">Type</label>
            <select className="w-full bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-300">
              <option>All Types</option>
              <option value="income">Income</option>
              <option value="expense">Expense</option>
              <option value="loan_received">Loan Received</option>
              <option value="loan_repayment">Loan Repayment</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">Status</label>
            <select className="w-full bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-300">
              <option>All Statuses</option>
              <option value="pending">Pending</option>
              <option value="complete">Complete</option>
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
                  TXN ID
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Category
                </th>
                <th className="px-6 py-4 text-left text-xs w-64 font-medium text-gray-400 uppercase tracking-wider">
                  Reference
                </th>
                <th className="px-6 py-4 text-center text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-4 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Amount
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Payment Method
                </th>
                <th className="px-6 py-4 text-center text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-4 text-center text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Delete
                </th>
              </tr>
            </thead>
            <tbody className="bg-gray-800/30 backdrop-blur-sm divide-y divide-gray-700/50">
              {transactions.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-6 py-12 text-center">
                    <div className="text-gray-400">
                      <BookOpen className="h-12 w-12 mx-auto mb-3 text-gray-500" />
                      <p className="text-lg mb-2">No general ledger transactions found</p>
                      <p className="text-sm">Add your first transaction to get started</p>
                    </div>
                  </td>
                </tr>
              ) : (
                transactions.map((transaction) => {
                  const getTypeColor = (type: string) => {
                    switch (type) {
                      case 'Income':
                        return 'bg-green-900/80 text-green-300 border border-green-600/50';
                      case 'Expense':
                        return 'bg-red-900/80 text-red-300 border border-red-600/50';
                      case 'Loan Received':
                        return 'bg-blue-900/80 text-blue-300 border border-blue-600/50';
                      case 'Loan Repayment':
                        return 'bg-orange-900/80 text-orange-300 border border-orange-600/50';
                      default:
                        return 'bg-gray-700/80 text-gray-300 border border-gray-600/50';
                    }
                  };

                  return (
                    <tr key={transaction.id} className="hover:bg-white/5 transition-colors duration-300">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-blue-400">
                        <button
                          onClick={() => handleEditTransaction(transaction)}
                          className="hover:text-blue-300 transition-colors duration-300"
                        >
                          {transaction.reference?.startsWith('GL-') 
                            ? transaction.reference.slice(0, 8).toUpperCase()
                            : transaction.id.slice(0, 8).toUpperCase()
                          }
                        </button>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                        {formatDate(transaction.date)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                        {transaction.category}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-300 max-w-lg">
                        <div className="line-clamp-2" title={transaction.reference}>
                          {transaction.reference || 'N/A'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getTypeColor(transaction.type)}`}>
                          {transaction.type}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                        <span className={`font-medium ${
                          transaction.type === 'Income' || transaction.type === 'Loan Received' ? 'text-green-400' : 'text-red-400'
                        }`}>
                          {transaction.type === 'Income' || transaction.type === 'Loan Received' ? '+' : '-'}{formatCurrency(Math.abs(transaction.amount))}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                        {transaction.payment_method || 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <select
                          value={transaction.status}
                          onChange={(e) => handleStatusChange(transaction.id, e.target.value)}
                          className={`px-2 py-1 text-xs font-medium rounded-full border-0 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                            transaction.status === 'complete'
                              ? 'bg-green-900/80 backdrop-blur-sm text-green-300 border border-green-600/50'
                              : 'bg-yellow-900/80 backdrop-blur-sm text-yellow-300 border border-yellow-600/50'
                          }`}
                        >
                          <option value="pending" className="bg-gray-800 text-white">Pending</option>
                          <option value="complete" className="bg-gray-800 text-white">Complete</option>
                        </select>
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
                              title="Delete transaction"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-gray-800/90 backdrop-blur-xl border border-gray-600/30 rounded-2xl p-6 w-96">
            <h3 className="text-lg font-semibold text-white mb-4 text-center">Delete Transaction</h3>
            <div className="text-center mb-6">
              <p className="text-gray-300 mb-2">
                Delete Transaction <span className="font-mono text-blue-400">{showDeleteModal.slice(0, 8).toUpperCase()}</span>
              </p>
              <p className="text-gray-300">
                {transactions.find(t => t.id === showDeleteModal)?.category || 'Unknown Category'}
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

      {/* General Ledger Transaction Modal */}
      <GeneralLedgerModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onSuccess={handleModalSuccess}
        transaction={editingTransaction}
      />
    </div>
  );
};

export default GeneralLedger;