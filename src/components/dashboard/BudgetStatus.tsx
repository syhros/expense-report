import React from 'react';
import Card from '../shared/Card';
import { useBudgets, useTransactionsWithMetrics, useDashboardMetrics } from '../../hooks/useData';
import { formatCurrency } from '../../utils/formatters';

const BudgetStatus: React.FC = () => {
  const { budgets, currentBudget, loading: budgetLoading } = useBudgets();
  const { transactions, loading: transactionsLoading } = useTransactionsWithMetrics();
  const { metrics, loading: metricsLoading } = useDashboardMetrics();

  const loading = budgetLoading || metricsLoading || transactionsLoading;

  if (loading) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        </div>
      </Card>
    );
  }

  const budgetAmount = currentBudget?.amount || 0;
  const monthlySpend = metrics?.monthlySpend || 0;
  const budgetRemaining = budgetAmount - monthlySpend;
  const budgetPercentage = budgetAmount > 0 ? (monthlySpend / budgetAmount) * 100 : 0;

  // Calculate days left in current month
  const now = new Date();
  const daysLeftInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate() - now.getDate();
  const dailySpendTarget = daysLeftInMonth > 0 && budgetRemaining > 0 ? budgetRemaining / daysLeftInMonth : 0;

  const currentMonthName = now.toLocaleDateString('en-GB', { month: 'long' });

  // Calculate historical data for last 3 months (excluding current month)
  const calculateHistoricalData = () => {
    const monthlyData: { [key: string]: { budget: number; spend: number } } = {};
    
    // Initialize with budget data
    budgets.forEach(budget => {
      const monthKey = `${budget.year}-${budget.month.toString().padStart(2, '0')}`;
      monthlyData[monthKey] = {
        budget: budget.amount,
        spend: 0
      };
    });

    // Add transaction data
    transactions.forEach(transaction => {
      if (transaction.ordered_date) {
        const date = new Date(transaction.ordered_date);
        const monthKey = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
        
        if (!monthlyData[monthKey]) {
          monthlyData[monthKey] = { budget: 0, spend: 0 };
        }
        
        monthlyData[monthKey].spend += transaction.totalCost;
      }
    });

    return monthlyData;
  };

  const historicalData = calculateHistoricalData();
  const currentMonthKey = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}`;
  
  // Get last 3 months excluding current month
  const sortedMonths = Object.keys(historicalData)
    .filter(monthKey => monthKey !== currentMonthKey)
    .sort()
    .slice(-3);

  // Ensure we have exactly 3 months, fill with empty data if needed
  while (sortedMonths.length < 3) {
    const lastMonth = sortedMonths.length > 0 ? sortedMonths[0] : currentMonthKey;
    const [year, month] = lastMonth.split('-').map(Number);
    const prevMonth = month === 1 ? 12 : month - 1;
    const prevYear = month === 1 ? year - 1 : year;
    const prevMonthKey = `${prevYear}-${prevMonth.toString().padStart(2, '0')}`;
    sortedMonths.unshift(prevMonthKey);
  }

  return (
    <Card className="px-6 pt-6 pb-2">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-semibold text-white">Monthly Budget Status</h3>
      </div>
      
      {/* 3 Budget Boxes */}
      <div className="grid grid-cols-3 gap-4">
        {/* Budget Box - Blue */}
        <div className="bg-blue-900/30 backdrop-blur-sm border border-blue-600/30 rounded-xl p-2 text-center">
          <div className="text-blue-400 text-sm font-medium mb-1">Budget</div>
          <div className="text-2xl font-bold text-blue-300 mb-1">
            {formatCurrency(budgetAmount)}
          </div>
          <div className="text-blue-300 text-xs">
            {currentMonthName} budget
          </div>
        </div>

        {/* Total Month Spend Box - Green */}
        <div className="bg-green-900/30 backdrop-blur-sm border border-green-600/30 rounded-xl p-2 text-center">
          <div className="text-green-400 text-sm font-medium mb-1">Total Month Spend</div>
          <div className="text-2xl font-bold text-green-300 mb-1">
            {formatCurrency(monthlySpend)}
          </div>
          <div className="text-green-300 text-xs">
            {budgetPercentage.toFixed(1)}% spent
          </div>
        </div>

        {/* Daily Target Box - Purple */}
        <div className="bg-purple-900/30 backdrop-blur-sm border border-purple-600/30 rounded-xl p-2 text-center">
          <div className="text-purple-400 text-sm font-medium mb-1">Daily Target</div>
          <div className="text-2xl font-bold text-purple-300 mb-1">
            {formatCurrency(Math.max(dailySpendTarget, 0))}
          </div>
          <div className="text-purple-300 text-xs">
            {daysLeftInMonth} days left
          </div>
        </div>
      </div>

      {/* Progress bar for current month */}
      <div className="mt-6">
        <div className="w-full bg-gray-700/50 backdrop-blur-sm rounded-full h-3 mb-2">
          <div 
            className={`h-3 rounded-full transition-all duration-300 ${
              budgetPercentage > 100 ? 'bg-red-500' : 
              budgetPercentage > 80 ? 'bg-yellow-500' : 'bg-green-500'
            }`} 
            style={{ width: `${Math.min(budgetPercentage, 100)}%` }}>
          </div>
        </div>
        
        <div className="flex justify-between text-xs text-gray-500">
          <span>£0</span>
          <span>Remaining: {formatCurrency(Math.max(budgetRemaining, 0))}</span>
          <span>{formatCurrency(budgetAmount)}</span>
        </div>
      </div>

      {/* Historical Budget Information - Last 3 Months */}
      <div className="mt-3 pt-4 border-t border-gray-700/50">
        <div className="grid grid-cols-3 gap-4">
          {sortedMonths.map((monthKey) => {
            const data = historicalData[monthKey] || { budget: 0, spend: 0 };
            const [year, month] = monthKey.split('-');
            const monthName = new Date(parseInt(year), parseInt(month) - 1).toLocaleDateString('en-GB', { 
              month: 'long' 
            });
            const percentage = data.budget > 0 ? (data.spend / data.budget) * 100 : 0;
            
            return (
              <div key={monthKey} className="bg-gray-800/30 backdrop-blur-sm border border-gray-600/30 rounded-xl px-4 py-2 mb-2 text-center">
                <div className="text-gray-400 text-sm font-medium mb-0">
                  {monthName}
                </div>
                <div className="text-xl font-bold text-white mb-1">
                  {formatCurrency(data.spend)}
                </div>
                <div className="text-gray-400 text-xs">
                  {percentage.toFixed(1)}% of Budget Spent
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </Card>
  );
};

export default BudgetStatus;