import React, { useState, useEffect, useRef } from 'react';
import { X, DollarSign } from 'lucide-react';
import { createOrUpdateBudget, getCurrentBudget } from '../../services/database';
import { formatCurrency } from '../../utils/formatters';

interface BudgetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const BudgetModal: React.FC<BudgetModalProps> = ({ 
  isOpen, 
  onClose, 
  onSuccess 
}) => {
  const [amount, setAmount] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentBudget, setCurrentBudget] = useState<number>(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      // Auto-focus the input when modal opens
      setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }, 100);

      // Load current budget
      loadCurrentBudget();
    } else {
      // Reset form when modal closes
      setAmount('');
      setError(null);
    }
  }, [isOpen]);

  const loadCurrentBudget = async () => {
    try {
      const budget = await getCurrentBudget();
      const budgetAmount = budget?.amount || 0;
      setCurrentBudget(budgetAmount);
      setAmount(budgetAmount.toString());
    } catch (err) {
      console.error('Failed to load current budget:', err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const numericAmount = parseFloat(amount) || 0;
    if (numericAmount < 0) {
      setError('Please enter a valid amount');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const now = new Date();
      const currentMonth = now.getMonth() + 1;
      const currentYear = now.getFullYear();

      await createOrUpdateBudget({
        month: currentMonth,
        year: currentYear,
        amount: numericAmount
      });

      onSuccess();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save budget');
    } finally {
      setLoading(false);
    }
  };

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // Allow only numbers and decimal point
    if (value === '' || /^\d*\.?\d*$/.test(value)) {
      setAmount(value);
      setError(null);
    }
  };

  const getCurrentMonthName = () => {
    const now = new Date();
    return now.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800/90 backdrop-blur-xl border border-gray-600/30 rounded-2xl shadow-2xl w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700/50">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-green-600/80 backdrop-blur-sm rounded-xl">
              <DollarSign className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-white">Set Monthly Budget</h2>
              <p className="text-sm text-gray-400">{getCurrentMonthName()}</p>
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
            <div className="bg-red-900/50 backdrop-blur-sm border border-red-700/50 rounded-xl p-4 text-red-300 text-sm mb-4">
              {error}
            </div>
          )}

          {currentBudget > 0 && (
            <div className="bg-blue-900/30 backdrop-blur-sm border border-blue-700/50 rounded-xl p-4 mb-4">
              <p className="text-blue-300 text-sm">
                Current budget: <span className="font-medium">{formatCurrency(currentBudget)}</span>
              </p>
            </div>
          )}

          <div className="mb-6">
            <div className="relative">
              <div className="relative border-2 border-green-500/50 rounded-xl bg-gray-800/50 backdrop-blur-sm">
                <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
                  <span className="text-green-400 text-lg">£</span>
                </div>
                <input
                  ref={inputRef}
                  type="text"
                  id="amount"
                  value={amount}
                  onChange={handleAmountChange}
                  className="w-full pl-8 pr-4 py-4 bg-transparent text-white text-lg font-medium placeholder-transparent focus:outline-none"
                  placeholder="0.00"
                  autoComplete="off"
                />
                <label
                  htmlFor="amount"
                  className="absolute left-6 -top-2.5 bg-gray-800 px-2 text-sm font-medium text-green-400"
                >
                  Budget Amount (£)
                </label>
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              This budget will apply to {getCurrentMonthName()} and future months until changed
            </p>
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-400 hover:text-white transition-all duration-300 hover:scale-102"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !amount.trim()}
              className="bg-green-600/80 backdrop-blur-sm hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white px-6 py-3 rounded-xl transition-all duration-300 hover:scale-102 flex items-center space-x-2"
            >
              {loading ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              ) : (
                <span>Save Budget</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default BudgetModal;