import React, { useState, useEffect } from 'react';
import { X, Calendar, FileText, DollarSign, Loader2, CreditCard, User } from 'lucide-react';
import { createGeneralLedgerTransaction, updateGeneralLedgerTransaction } from '../../services/database';
import { GeneralLedgerTransaction } from '../../types/database';

interface GeneralLedgerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  transaction?: GeneralLedgerTransaction | null;
}

const GeneralLedgerModal: React.FC<GeneralLedgerModalProps> = ({ 
  isOpen, 
  onClose, 
  onSuccess, 
  transaction 
}) => {
  const [formData, setFormData] = useState({
    date: '',
    category: '',
    reference: '',
    type: 'Expense',
    amount: 0,
    payment_method: 'AMEX Plat',
    status: 'pending',
    director_name: '',
    txn_po: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nextReference, setNextReference] = useState<string>('');
  const [savedDirectors, setSavedDirectors] = useState<string[]>([]);
  const [showDirectorDropdown, setShowDirectorDropdown] = useState(false);

  // Predefined categories for general ledger
  const categories = [
    'Bank fees', 'Bank interest paid', 'Capital introduced', 'Vehicles', 
    'Property or asset purchases', 'Director\'s loans', 'Dividends', 'Fuel', 
    'Hotel and accommodation', 'Income', 'Insurance', 'Loan repayments and interest', 
    'Business loans', 'Marketing costs', 'Meals', 'Office supplies', 
    'Operational equipment', 'Miscellaneous expenses and income', 
    'Payments to subcontractors', 'Phone and internet costs', 'Professional fees', 
    'Rent', 'Shipping and postage', 'Software and IT expenses', 'Staff costs', 
    'Taxes', 'Transfers', 'Travel', 'Utilities', 'Workplace expenses', 'Vehicle maintenance'
  ].sort();

  // Payment method options (same as Purchase Order Log)
  const paymentMethods = ['AMEX Plat', 'AMEX Gold', 'Tide', 'Halifax', 'Revolut'];

  // Check if current category is Director's loans
  const isDirectorsLoans = formData.category === 'Director\'s loans';

  // Get transaction type options based on category
  const getTransactionTypeOptions = () => {
    if (isDirectorsLoans) {
      return [
        { value: 'Loan Received', label: 'Loan Received' },
        { value: 'Loan Repayment', label: 'Loan Repayment' }
      ];
    }
    return [
      { value: 'Income', label: 'Income' },
      { value: 'Expense', label: 'Expense' }
    ];
  };

  useEffect(() => {
    if (transaction) {
      setFormData({
        date: transaction.date || '',
        category: transaction.category || '',
        reference: transaction.reference || '',
        type: transaction.type || 'Expense',
        amount: Math.abs(transaction.amount) || 0,
        payment_method: transaction.payment_method || 'AMEX Plat',
        status: transaction.status || 'pending',
        director_name: transaction.director_name || '',
        txn_po: '' // This would need to be extracted from reference if needed
      });
      setNextReference(transaction.reference || '');
    } else {
      resetForm();
      generateNextReference();
    }
    setError(null);
    loadSavedDirectors();
  }, [transaction, isOpen]);

  // Load saved directors from localStorage
  const loadSavedDirectors = () => {
    try {
      const saved = localStorage.getItem('fba_directors');
      if (saved) {
        setSavedDirectors(JSON.parse(saved));
      }
    } catch (err) {
      console.error('Error loading saved directors:', err);
    }
  };

  // Save director to localStorage
  const saveDirector = (directorName: string) => {
    if (!directorName.trim()) return;
    
    try {
      const current = savedDirectors;
      if (!current.includes(directorName.trim())) {
        const updated = [...current, directorName.trim()].sort();
        setSavedDirectors(updated);
        localStorage.setItem('fba_directors', JSON.stringify(updated));
      }
    } catch (err) {
      console.error('Error saving director:', err);
    }
  };

  const generateNextReference = async () => {
    try {
      setNextReference('GL-00001 (auto-generated)');
    } catch (err) {
      setNextReference('GL-##### (auto-generated)');
    }
  };

  const resetForm = () => {
    setFormData({
      date: new Date().toISOString().split('T')[0],
      category: '',
      reference: '',
      type: 'Expense',
      amount: 0,
      payment_method: 'AMEX Plat',
      status: 'pending',
      director_name: '',
      txn_po: ''
    });
  };

  // Update form when category changes
  useEffect(() => {
    if (isDirectorsLoans) {
      setFormData(prev => ({
        ...prev,
        type: 'Loan Received',
        payment_method: 'Tide'
      }));
    } else if (formData.category && !isDirectorsLoans) {
      setFormData(prev => ({
        ...prev,
        type: 'Expense',
        payment_method: 'AMEX Plat'
      }));
    }
  }, [formData.category, isDirectorsLoans]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Adjust amount based on type
      let adjustedAmount: number;
      if (isDirectorsLoans) {
        // For Director's loans: Loan Received = positive, Loan Repayment = negative
        adjustedAmount = formData.type === 'Loan Received' 
          ? Math.abs(formData.amount) 
          : -Math.abs(formData.amount);
      } else {
        // For regular transactions: Income = positive, Expense = negative
        adjustedAmount = formData.type === 'Income' 
          ? Math.abs(formData.amount) 
          : -Math.abs(formData.amount);
      }

      // Generate reference for Director's loans
      let finalReference = formData.reference;
      if (isDirectorsLoans && formData.director_name.trim()) {
        const preposition = formData.type === 'Loan Received' ? 'from' : 'to';
        const txnPart = formData.txn_po.trim() ? ` / ${formData.txn_po.trim()}` : '';
        finalReference = `Director's ${formData.type} ${preposition} ${formData.director_name.trim()}${txnPart}`;
        
        // Save the director name
        saveDirector(formData.director_name.trim());
      }

      // Prepare transaction data - include director_name for database storage
      const transactionData = {
        date: formData.date,
        category: formData.category,
        reference: finalReference,
        type: formData.type,
        amount: adjustedAmount,
        payment_method: formData.payment_method,
        status: formData.status,
        director_name: isDirectorsLoans ? formData.director_name.trim() : undefined
      };

      if (transaction) {
        await updateGeneralLedgerTransaction(transaction.id, transactionData);
      } else {
        await createGeneralLedgerTransaction(transactionData);
      }

      onSuccess();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save transaction');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    
    if (name === 'amount') {
      const numValue = parseFloat(value);
      setFormData(prev => ({ 
        ...prev, 
        [name]: isNaN(numValue) ? 0 : Math.abs(numValue)
      }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleDirectorSelect = (directorName: string) => {
    setFormData(prev => ({ ...prev, director_name: directorName }));
    setShowDirectorDropdown(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800/90 backdrop-blur-xl border border-gray-600/30 rounded-2xl shadow-2xl w-full max-w-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700/50">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-600/80 backdrop-blur-sm rounded-xl">
              <FileText className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-white">
                {transaction ? 'Edit Transaction' : 'Add Transaction'}
              </h2>
              <p className="text-sm text-gray-400">
                {transaction ? transaction.reference : nextReference}
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

          {/* Row 1: Date and Category */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            {/* Date Field */}
            <div className="relative">
              <div className="relative border-2 border-blue-500/50 rounded-xl bg-gray-800/50 backdrop-blur-sm">
                <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
                  <Calendar className="h-5 w-5 text-blue-400" />
                </div>
                <input
                  type="date"
                  id="date"
                  name="date"
                  value={formData.date}
                  onChange={handleChange}
                  required
                  className="w-full pl-12 pr-4 py-4 bg-transparent text-white placeholder-transparent focus:outline-none"
                />
                <label
                  htmlFor="date"
                  className="absolute left-10 -top-2.5 bg-gray-800 px-2 text-sm font-medium text-blue-400"
                >
                  Date *
                </label>
              </div>
            </div>

            {/* Category Field */}
            <div className="relative">
              <div className="relative border-2 border-blue-500/50 rounded-xl bg-gray-800/50 backdrop-blur-sm">
                <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
                  <FileText className="h-5 w-5 text-blue-400" />
                </div>
                <select
                  id="category"
                  name="category"
                  value={formData.category}
                  onChange={handleChange}
                  required
                  className="w-full pl-12 pr-4 py-4 bg-transparent text-white focus:outline-none appearance-none"
                >
                  <option value="" disabled className="bg-gray-800 text-gray-400">Select a category</option>
                  {categories.map(category => (
                    <option key={category} value={category} className="bg-gray-800 text-white">
                      {category}
                    </option>
                  ))}
                </select>
                <label
                  htmlFor="category"
                  className="absolute left-10 -top-2.5 bg-gray-800 px-2 text-sm font-medium text-blue-400"
                >
                  Category *
                </label>
              </div>
            </div>
          </div>

          {/* Row 2: Type and Payment Method */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            {/* Type Field - Radio Buttons */}
            <div>
              <label className="block text-sm font-medium text-blue-400 mb-3">
                Transaction Type *
              </label>
              <div className="flex space-x-4">
                {getTransactionTypeOptions().map(option => (
                  <label key={option.value} className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="radio"
                      name="type"
                      value={option.value}
                      checked={formData.type === option.value}
                      onChange={handleChange}
                      className="form-radio h-5 w-5 text-blue-600 border-gray-600 focus:ring-blue-500"
                    />
                    <span className="text-white">{option.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Payment Method Field */}
            <div className="relative">
              <div className="relative border-2 border-blue-500/50 rounded-xl bg-gray-800/50 backdrop-blur-sm">
                <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
                  <CreditCard className="h-5 w-5 text-blue-400" />
                </div>
                <select
                  id="payment_method"
                  name="payment_method"
                  value={formData.payment_method}
                  onChange={handleChange}
                  disabled={isDirectorsLoans}
                  className="w-full pl-12 pr-4 py-4 bg-transparent text-white focus:outline-none appearance-none disabled:opacity-50"
                >
                  {paymentMethods.map(method => (
                    <option key={method} value={method} className="bg-gray-800 text-white">
                      {method}
                    </option>
                  ))}
                </select>
                <label
                  htmlFor="payment_method"
                  className="absolute left-10 -top-2.5 bg-gray-800 px-2 text-sm font-medium text-blue-400"
                >
                  Payment Method
                </label>
              </div>
            </div>
          </div>

          {/* Row 3: Amount and Status */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            {/* Amount Field */}
            <div className="relative">
              <div className="relative border-2 border-blue-500/50 rounded-xl bg-gray-800/50 backdrop-blur-sm">
                <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
                  <DollarSign className="h-5 w-5 text-blue-400" />
                </div>
                <input
                  type="number"
                  id="amount"
                  name="amount"
                  value={formData.amount}
                  onChange={handleChange}
                  step="0.01"
                  min="0"
                  required
                  className="w-full pl-12 pr-4 py-4 bg-transparent text-white placeholder-transparent focus:outline-none"
                />
                <label
                  htmlFor="amount"
                  className="absolute left-10 -top-2.5 bg-gray-800 px-2 text-sm font-medium text-blue-400"
                >
                  Amount (£) *
                </label>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                {isDirectorsLoans 
                  ? (formData.type === 'Loan Received' ? 'Money received from director' : 'Money paid to director')
                  : (formData.type === 'Income' ? 'Positive amount' : 'Will be recorded as negative')
                }
              </p>
            </div>

            {/* Status Field */}
            <div className="relative">
              <div className="relative border-2 border-blue-500/50 rounded-xl bg-gray-800/50 backdrop-blur-sm">
                <select
                  id="status"
                  name="status"
                  value={formData.status}
                  onChange={handleChange}
                  className="w-full px-4 py-4 bg-transparent text-white focus:outline-none appearance-none"
                >
                  <option value="pending" className="bg-gray-800 text-white">Pending</option>
                  <option value="complete" className="bg-gray-800 text-white">Complete</option>
                </select>
                <label
                  htmlFor="status"
                  className="absolute left-3 -top-2.5 bg-gray-800 px-2 text-sm font-medium text-blue-400"
                >
                  Status
                </label>
              </div>
            </div>
          </div>

          {/* Director and TXN/PO Fields for Director's Loans */}
          {isDirectorsLoans && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              {/* Director Field */}
              <div className="relative">
                <div className="relative border-2 border-blue-500/50 rounded-xl bg-gray-800/50 backdrop-blur-sm">
                  <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
                    <User className="h-5 w-5 text-blue-400" />
                  </div>
                  <input
                    type="text"
                    id="director_name"
                    name="director_name"
                    value={formData.director_name}
                    onChange={handleChange}
                    onFocus={() => setShowDirectorDropdown(true)}
                    className="w-full pl-12 pr-4 py-4 bg-transparent text-white placeholder-transparent focus:outline-none"
                    placeholder="Director Name"
                    required
                  />
                  <label
                    htmlFor="director_name"
                    className="absolute left-10 -top-2.5 bg-gray-800 px-2 text-sm font-medium text-blue-400"
                  >
                    Director *
                  </label>
                </div>
                
                {/* Director Dropdown */}
                {showDirectorDropdown && savedDirectors.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-gray-800/90 backdrop-blur-xl border border-gray-600/30 rounded-xl shadow-lg z-10 max-h-48 overflow-y-auto">
                    {savedDirectors
                      .filter(director => director.toLowerCase().includes(formData.director_name.toLowerCase()))
                      .map((director) => (
                        <button
                          key={director}
                          type="button"
                          onClick={() => handleDirectorSelect(director)}
                          className="w-full text-left px-4 py-3 hover:bg-white/10 transition-colors border-b border-gray-700/50 last:border-b-0"
                        >
                          <div className="text-white font-medium text-sm">{director}</div>
                        </button>
                      ))}
                  </div>
                )}
              </div>

              {/* TXN / PO Field */}
              <div className="relative">
                
                <div className="relative border-2 border-blue-500/50 rounded-xl bg-gray-800/50 backdrop-blur-sm">
                  <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
                    <FileText className="h-5 w-5 text-blue-400" />
                  </div>
                  <input
                    type="text"
                    id="txn_po"
                    name="txn_po"
                    value={formData.txn_po}
                    onChange={handleChange}
                    className="w-full pl-12 pr-4 py-4 bg-transparent text-white placeholder-transparent focus:outline-none"
                    placeholder="TXN / PO"
                  />
                  <label
                    htmlFor="txn_po"
                    className="absolute left-10 -top-2.5 bg-gray-800 px-2 text-sm font-medium text-blue-400"
                  >
                    TXN / PO
                  </label>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Optional transaction or purchase order reference
                </p>
              </div>
            </div>
          )}

          {/* Reference Field (only shown if not Director's loans) */}
          {!isDirectorsLoans && (
            <div className="mb-6">
              <div className="relative">
                <div className="relative border-2 border-blue-500/50 rounded-xl bg-gray-800/50 backdrop-blur-sm">
                  <textarea
                    id="reference"
                    name="reference"
                    value={formData.reference}
                    onChange={handleChange}
                    rows={2}
                    className="w-full px-4 py-4 bg-transparent text-white placeholder-transparent focus:outline-none resize-none"
                    placeholder="Reference details..."
                  />
                  <label
                    htmlFor="reference"
                    className="absolute left-3 -top-2.5 bg-gray-800 px-2 text-sm font-medium text-blue-400"
                  >
                    Reference
                  </label>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Optional description or reference for this transaction
                </p>
              </div>
            </div>
          )}

          {/* Reference Preview for Director's Loans */}
          {isDirectorsLoans && formData.director_name && (
            <div className="mb-6 bg-blue-900/20 backdrop-blur-sm border border-blue-600/30 rounded-xl p-4">
              <h4 className="text-sm font-medium text-blue-400 mb-2">Reference Preview</h4>
              <p className="text-white">
                {`Director's ${formData.type} ${formData.type === 'Loan Received' ? 'from' : 'to'} ${formData.director_name.trim()}${formData.txn_po ? ` / ${formData.txn_po}` : ''}`}
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end space-x-3 pt-6 border-t border-gray-700/50">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-3 text-gray-400 hover:text-white transition-all duration-300 hover:scale-102"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !formData.date || !formData.category || formData.amount <= 0 || (isDirectorsLoans && !formData.director_name.trim())}
              className="bg-blue-600/80 backdrop-blur-sm hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white px-6 py-3 rounded-xl transition-all duration-300 hover:scale-102 flex items-center space-x-2"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <span>{transaction ? 'Update' : 'Create'} Transaction</span>
              )}
            </button>
          </div>
        </form>
      </div>
      
      {/* Click outside to close dropdown */}
      {showDirectorDropdown && (
        <div 
          className="fixed inset-0 z-0" 
          onClick={() => setShowDirectorDropdown(false)}
        />
      )}
    </div>
  );
};

export default GeneralLedgerModal;