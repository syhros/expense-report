import React, { useState, useEffect, useRef } from 'react';
import { X, DollarSign, Calendar, ChevronLeft } from 'lucide-react';
import { createOrUpdateBudget, getCurrentBudget, getBudgets, getTransactions } from '../../services/database';
import { formatCurrency } from '../../utils/formatters';

interface BudgetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface MonthOption {
  month: number;
  year: number;
  label: string;
  hasTransactions: boolean;
  currentBudget?: number;
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
  const [showPreviousMonths, setShowPreviousMonths] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState<{ month: number; year: number } | null>(null);
  const [monthOptions, setMonthOptions] = useState<MonthOption[]>([]);
  const [loadingMonths, setLoadingMonths] = useState(false);
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
      setShowPreviousMonths(false);
      setSelectedMonth(null);
      setMonthOptions([]);
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

  const loadPreviousMonths = async () => {
    setLoadingMonths(true);
    try {
      const [transactions, budgets] = await Promise.all([
        getTransactions(),
        getBudgets()
      ]);

      // Get months that have transactions
      const monthsWithTransactions = new Set<string>();
      transactions.forEach(transaction => {
        if (transaction.ordered_date) {
          const date = new Date(transaction.ordered_date);
          const monthKey = `${date.getFullYear()}-${date.getMonth() + 1}`;
          monthsWithTransactions.add(monthKey);
        }
      });

      // Create budget map for quick lookup
      const budgetMap = new Map<string, number>();
      budgets.forEach(budget => {
        const monthKey = `${budget.year}-${budget.month}`;
        budgetMap.set(monthKey, budget.amount);
      });

      // Generate month options for the last 12 months (excluding current month)
      const options: MonthOption[] = [];
      const now = new Date();
      const currentMonthKey = `${now.getFullYear()}-${now.getMonth() + 1}`;

      for (let i = 1; i <= 12; i++) {
        const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const month = date.getMonth() + 1;
        const year = date.getFullYear();
        const monthKey = `${year}-${month}`;
        
        // Skip current month
        if (monthKey === currentMonthKey) continue;

        const hasTransactions = monthsWithTransactions.has(monthKey);
        
        // Only include months that have transactions
        if (hasTransactions) {
          options.push({
            month,
            year,
            label: date.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' }).toUpperCase(),
            hasTransactions,
            currentBudget: budgetMap.get(monthKey)
          });
        }
      }

      setMonthOptions(options);
    } catch (err) {
      console.error('Failed to load previous months:', err);
      setError('Failed to load previous months');
    } finally {
      setLoadingMonths(false);
    }
  };

  const handlePreviousMonthsClick = async () => {
    if (!showPreviousMonths) {
      await loadPreviousMonths();
    }
    setShowPreviousMonths(true);
  };

  const handleBackToCurrentMonth = () => {
    setShowPreviousMonths(false);
    setSelectedMonth(null);
    setAmount(currentBudget.toString());
    setError(null);
  };

  const handleMonthSelect = (monthOption: MonthOption) => {
    setSelectedMonth({ month: monthOption.month, year: monthOption.year });
    setAmount((monthOption.currentBudget || 0).toString());
    setError(null);
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
      let targetMonth: number;
      let targetYear: number;

      if (selectedMonth) {
        targetMonth = selectedMonth.month;
        targetYear = selectedMonth.year;
      } else {
        const now = new Date();
        targetMonth = now.getMonth() + 1;
        targetYear = now.getFullYear();
      }

      await createOrUpdateBudget({
        month: targetMonth,
        year: targetYear,
        amount: numericAmount
      });

      // If we're in previous months mode, don't close the modal
      if (showPreviousMonths) {
        // Update the month options to reflect the new budget
        setMonthOptions(prev => prev.map(option => 
          option.month === targetMonth && option.year === targetYear
            ? { ...option, currentBudget: numericAmount }
            : option
        ));
        
        // Show success message briefly
        const successMessage = `Budget for ${getMonthName(targetMonth, targetYear)} updated successfully`;
        setError(null);
        
        // Reset selected month
        setSelectedMonth(null);
        setAmount('');
        
        // Show brief success feedback
        setTimeout(() => {
          // Could add a success state here if needed
        }, 1000);
      } else {
        onSuccess();
        onClose();
      }
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

  const getMonthName = (month: number, year: number) => {
    const date = new Date(year, month - 1);
    return date.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800/90 backdrop-blur-xl border border-gray-600/30 rounded-2xl shadow-2xl w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700/50">
          <div className="flex items-center space-x-3">
            {showPreviousMonths && (
              <button
                onClick={handleBackToCurrentMonth}
                className="p-1 text-gray-400 hover:text-white transition-colors duration-300 hover:scale-102"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
            )}
            <div className="p-2 bg-green-600/80 backdrop-blur-sm rounded-xl">
              {showPreviousMonths ? <Calendar className="h-5 w-5 text-white" /> : <DollarSign className="h-5 w-5 text-white" />}
            </div>
            <div>
              <h2 className="text-xl font-semibold text-white">
                {showPreviousMonths ? 'Previous Months Budget' : 'Set Monthly Budget'}
              </h2>
              <p className="text-sm text-gray-400">
                {selectedMonth ? getMonthName(selectedMonth.month, selectedMonth.year) : 
                 showPreviousMonths ? 'Select a month to edit' : getCurrentMonthName()}
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

        {/* Content */}
        <div className="p-6">
          {showPreviousMonths ? (
            // Previous Months View
            <>
              {loadingMonths ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                  <span className="ml-3 text-gray-400">Loading months...</span>
                </div>
              ) : monthOptions.length === 0 ? (
                <div className="text-center py-8">
                  <Calendar className="h-12 w-12 text-gray-500 mx-auto mb-3" />
                  <p className="text-gray-400">No previous months with transactions found</p>
                </div>
              ) : (
                <>
                  {!selectedMonth ? (
                    // Month Selection
                    <div className="space-y-3">
                      <h3 className="text-sm font-medium text-gray-400 mb-4">Select a month to edit budget:</h3>
                      {monthOptions.map((option) => (
                        <button
                          key={`${option.year}-${option.month}`}
                          onClick={() => handleMonthSelect(option)}
                          className="w-full bg-gray-700/50 backdrop-blur-sm border border-gray-600/30 rounded-xl p-4 text-left hover:bg-gray-600/50 transition-all duration-300 hover:scale-102"
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-white font-medium">{option.label}</p>
                              <p className="text-gray-400 text-sm">
                                Current budget: {formatCurrency(option.currentBudget || 0)}
                              </p>
                            </div>
                            <div className="text-blue-400">
                              <ChevronLeft className="h-5 w-5 rotate-180" />
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  ) : (
                    // Budget Edit Form for Selected Month
                    <form onSubmit={handleSubmit}>
                      {error && (
                        <div className="bg-red-900/50 backdrop-blur-sm border border-red-700/50 rounded-xl p-4 text-red-300 text-sm mb-4">
                          {error}
                        </div>
                      )}

                      <div className="mb-6">
                        <div className="flex space-x-4 mb-4">
                          {/* Month/Year Dropdown */}
                          <div className="flex-1 relative">
                            <div className="relative border-2 border-blue-500/50 rounded-xl bg-gray-800/50 backdrop-blur-sm">
                              <select
                                value={`${selectedMonth.year}-${selectedMonth.month}`}
                                onChange={(e) => {
                                  const [year, month] = e.target.value.split('-').map(Number);
                                  const option = monthOptions.find(opt => opt.year === year && opt.month === month);
                                  if (option) handleMonthSelect(option);
                                }}
                                className="w-full px-4 py-4 bg-transparent text-white focus:outline-none appearance-none"
                              >
                                {monthOptions.map((option) => (
                                  <option 
                                    key={`${option.year}-${option.month}`} 
                                    value={`${option.year}-${option.month}`}
                                    className="bg-gray-800 text-white"
                                  >
                                    {option.label}
                                  </option>
                                ))}
                              </select>
                              <label className="absolute left-3 -top-2.5 bg-gray-800 px-2 text-sm font-medium text-blue-400">
                                Month
                              </label>
                            </div>
                          </div>

                          {/* Budget Amount */}
                          <div className="flex-1 relative">
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
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex justify-end space-x-3">
                        <button
                          type="button"
                          onClick={() => setSelectedMonth(null)}
                          className="px-4 py-2 text-gray-400 hover:text-white transition-all duration-300 hover:scale-102"
                        >
                          Back
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
                  )}
                </>
              )}
            </>
          ) : (
            // Current Month Budget Form
            <form onSubmit={handleSubmit}>
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
              <div className="flex justify-between">
                <button
                  type="button"
                  onClick={handlePreviousMonthsClick}
                  className="bg-gray-600/80 backdrop-blur-sm hover:bg-gray-700 text-white px-4 py-2 rounded-xl transition-all duration-300 hover:scale-102 flex items-center space-x-2"
                >
                  <Calendar className="h-4 w-4" />
                  <span>Previous Months</span>
                </button>
                
                <div className="flex space-x-3">
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
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default BudgetModal;