import React, { useState } from 'react';
import { Plus, DollarSign, TrendingUp, Target, Calendar, BarChart3 } from 'lucide-react';
import Card from '../components/shared/Card';
import BudgetModal from '../components/modals/BudgetModal';
import { useBudgets, useDashboardMetrics, useTransactionsWithMetrics } from '../hooks/useData';
import { formatCurrency, formatPercentage } from '../utils/formatters';

const Budget: React.FC = () => {
  const { budgets, currentBudget, loading: budgetLoading, refetch } = useBudgets();
  const { metrics, loading: metricsLoading } = useDashboardMetrics();
  const { transactions, loading: transactionsLoading } = useTransactionsWithMetrics();
  const [showBudgetModal, setShowBudgetModal] = useState(false);

  const loading = budgetLoading || metricsLoading || transactionsLoading;

  const handleUpdateBudget = () => {
    setShowBudgetModal(true);
  };

  const handleModalSuccess = () => {
    refetch();
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white">Budget Management</h1>
            <p className="text-gray-400 mt-1">Track spending, manage budgets, and analyze financial performance</p>
          </div>
          <button 
            onClick={handleUpdateBudget}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors flex items-center space-x-2"
          >
            <Plus className="h-4 w-4" />
            <span>Update Budget</span>
          </button>
        </div>
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>
      </div>
    );
  }

  const budgetAmount = currentBudget?.amount || 0;
  const monthlySpend = metrics?.monthlySpend || 0;
  const budgetRemaining = budgetAmount - monthlySpend;
  const budgetUtilization = budgetAmount > 0 ? (monthlySpend / budgetAmount) * 100 : 0;

  // Calculate days left in current month
  const now = new Date();
  const daysLeftInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate() - now.getDate();
  const dailySpendTarget = daysLeftInMonth > 0 ? budgetRemaining / daysLeftInMonth : 0;

  const currentMonthName = now.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });

  // Calculate historical data from actual transactions and budgets
  const calculateHistoricalData = () => {
    const monthlyData: { [key: string]: { budget: number; spend: number; profit: number } } = {};
    
    // Initialize with budget data
    budgets.forEach(budget => {
      const monthKey = `${budget.year}-${budget.month.toString().padStart(2, '0')}`;
      monthlyData[monthKey] = {
        budget: budget.amount,
        spend: 0,
        profit: 0
      };
    });

    // Add transaction data
    transactions.forEach(transaction => {
      if (transaction.ordered_date) {
        const date = new Date(transaction.ordered_date);
        const monthKey = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
        
        if (!monthlyData[monthKey]) {
          monthlyData[monthKey] = { budget: 0, spend: 0, profit: 0 };
        }
        
        monthlyData[monthKey].spend += transaction.totalCost;
        monthlyData[monthKey].profit += transaction.estimatedProfit;
      }
    });

    return monthlyData;
  };

  const historicalData = calculateHistoricalData();
  const sortedMonths = Object.keys(historicalData).sort();
  
  // Calculate totals for summary stats
  const totalBudgetSet = Object.values(historicalData).reduce((sum, data) => sum + data.budget, 0);
  const totalActualSpend = Object.values(historicalData).reduce((sum, data) => sum + data.spend, 0);
  const totalEstProfit = Object.values(historicalData).reduce((sum, data) => sum + data.profit, 0);
  const avgMonthlySpend = sortedMonths.length > 0 ? totalActualSpend / sortedMonths.length : 0;
  
  // Count months under/over budget
  const monthsWithBudget = Object.values(historicalData).filter(data => data.budget > 0);
  const monthsUnderBudget = monthsWithBudget.filter(data => data.spend <= data.budget).length;
  const monthsOverBudget = monthsWithBudget.filter(data => data.spend > data.budget).length;

  // Generate chart data points based on actual data with dynamic Y-axis
  const generateChartPoints = () => {
    const chartWidth = 400;
    const chartHeight = 300;
    
    // Calculate the maximum value across all data points
    const allValues = Object.values(historicalData).flatMap(data => [
      data.budget, 
      data.spend, 
      Math.max(data.profit, 0) // Only consider positive profits for scale
    ]);
    const dataMax = Math.max(...allValues, 0);
    
    // Calculate dynamic max value in increments of £500
    const maxValue = dataMax <= 500 ? 500 : Math.ceil(dataMax / 500) * 500;
    
    // Generate Y-axis labels
    const increment = 500;
    const numLabels = Math.floor(maxValue / increment) + 1;
    const yAxisLabels = [];
    for (let i = numLabels - 1; i >= 0; i--) {
      yAxisLabels.push(`£${(i * increment).toLocaleString()}`);
    }

    // If we have no data, create default visualization
    if (sortedMonths.length === 0) {
      const defaultPoints = [
        { x: 20, budget: 280, spend: 280, profit: 280 }, // £0 level
        { x: 200, budget: 280, spend: 280, profit: 280 }, // £0 level  
        { x: 380, budget: 50, spend: 100, profit: 150 } // Higher values for current month
      ];

      return {
        points: defaultPoints,
        maxValue: 500,
        yAxisLabels: ['£500', '£400', '£300', '£200', '£100', '£0']
      };
    }

    // Calculate points based on actual data - spread across full width
    const dataPoints = sortedMonths.slice(-3).map((monthKey, index) => {
      const data = historicalData[monthKey];
      // Spread points evenly across chart width with padding
      const x = 20 + (index * ((chartWidth - 40) / Math.max(sortedMonths.slice(-3).length - 1, 1)));
      
      // Convert values to chart coordinates (invert Y axis) using dynamic scale
      const budgetY = chartHeight - ((data.budget / maxValue) * chartHeight);
      const spendY = chartHeight - ((data.spend / maxValue) * chartHeight);
      const profitY = chartHeight - ((Math.max(data.profit, 0) / maxValue) * chartHeight);
      
      return {
        x: Math.min(x, 380), // Ensure we don't exceed chart bounds
        budget: Math.max(budgetY, 10), // Ensure points stay visible
        spend: Math.max(spendY, 10),
        profit: Math.max(profitY, 10)
      };
    });

    // Ensure we have exactly 3 points for consistent display
    while (dataPoints.length < 3) {
      const lastPoint = dataPoints[dataPoints.length - 1];
      const x = dataPoints.length === 0 ? 20 : 
                dataPoints.length === 1 ? 200 : 380;
      dataPoints.push({
        x,
        budget: lastPoint?.budget || chartHeight - 10,
        spend: lastPoint?.spend || chartHeight - 10,
        profit: lastPoint?.profit || chartHeight - 10
      });
    }

    return {
      points: dataPoints,
      maxValue,
      yAxisLabels
    };
  };

  const chartData = generateChartPoints();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Budget Management</h1>
          <p className="text-gray-400 mt-1">Track spending, manage budgets, and analyze financial performance</p>
        </div>
        <button 
          onClick={handleUpdateBudget}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors flex items-center space-x-2"
        >
          <Plus className="h-4 w-4" />
          <span>Update Budget</span>
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-400">Monthly Budget</p>
              <p className="text-2xl font-bold text-white mt-2">{formatCurrency(budgetAmount)}</p>
              <p className="text-xs text-gray-500 mt-1">{currentMonthName}</p>
            </div>
            <div className="p-3 bg-blue-600 rounded-lg">
              <DollarSign className="h-6 w-6 text-white" />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-400">Monthly Spend</p>
              <p className="text-2xl font-bold text-white mt-2">{formatCurrency(monthlySpend)}</p>
              <p className="text-xs text-gray-500 mt-1">
                {budgetAmount > 0 ? `${budgetUtilization.toFixed(1)}% of budget` : 'No budget set'}
              </p>
            </div>
            <div className="p-3 bg-orange-600 rounded-lg">
              <TrendingUp className="h-6 w-6 text-white" />
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
            <div className="p-3 bg-green-600 rounded-lg">
              <Target className="h-6 w-6 text-white" />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-400">Daily Spend Target</p>
              <p className="text-2xl font-bold text-white mt-2">
                {dailySpendTarget > 0 ? formatCurrency(dailySpendTarget) : formatCurrency(0)}
              </p>
              <p className="text-xs text-gray-500 mt-1">To stay on budget</p>
            </div>
            <div className="p-3 bg-purple-600 rounded-lg">
              <Calendar className="h-6 w-6 text-white" />
            </div>
          </div>
        </Card>
      </div>

      {/* Budget Progress */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Budget Progress</h3>
        <div className="mb-2 flex justify-between text-sm">
          <span className="text-gray-400">{budgetUtilization.toFixed(1)}% used</span>
          <span className="text-white">{formatCurrency(monthlySpend)} / {formatCurrency(budgetAmount)}</span>
        </div>
        <div className="w-full bg-gray-700 rounded-full h-3">
          <div 
            className={`h-3 rounded-full transition-all duration-300 ${
              budgetUtilization > 100 ? 'bg-red-500' : 
              budgetUtilization > 80 ? 'bg-yellow-500' : 'bg-green-500'
            }`} 
            style={{ width: `${Math.min(budgetUtilization, 100)}%` }}
          ></div>
        </div>
        <div className="flex justify-between text-xs text-gray-500 mt-2">
          <span>£0</span>
          <span>{formatCurrency(budgetAmount)}</span>
        </div>
      </Card>

      {/* Historical Performance Chart */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Historical Performance</h3>
        <p className="text-sm text-gray-400 mb-6">Budget vs Actual Spend Analysis</p>
        
        {/* Chart Container */}
        <div className="relative h-80 bg-gray-900 rounded-lg p-6 border border-gray-700">
          {/* Y-axis labels - Dynamic based on data */}
          <div className="absolute left-0 top-0 h-full flex flex-col justify-between text-xs text-gray-500 py-16">
            {chartData.yAxisLabels.map((label, index) => (
              <span key={index}>{label}</span>
            ))}
          </div>

          {/* Chart area */}
          <div className="ml-12 h-full relative">
            {/* Chart lines - Now using real data with dynamic scale and full width */}
            <svg className="absolute inset-0 w-full h-full" viewBox="0 0 1000 300">
              {/* Budget line (blue) */}
              <path
                d={`M ${chartData.points[0].x} ${chartData.points[0].budget} L ${chartData.points[1].x} ${chartData.points[1].budget} L ${chartData.points[2].x} ${chartData.points[2].budget}`}
                stroke="#3B82F6"
                strokeWidth="3"
                fill="none"
                className="drop-shadow-sm"
              />
              {chartData.points.map((point, index) => (
                <circle key={`budget-${index}`} cx={point.x} cy={point.budget} r="4" fill="#3B82F6" />
              ))}

              {/* Actual Spend line (green) */}
              <path
                d={`M ${chartData.points[0].x} ${chartData.points[0].spend} L ${chartData.points[1].x} ${chartData.points[1].spend} L ${chartData.points[2].x} ${chartData.points[2].spend}`}
                stroke="#10B981"
                strokeWidth="3"
                fill="none"
                className="drop-shadow-sm"
              />
              {chartData.points.map((point, index) => (
                <circle key={`spend-${index}`} cx={point.x} cy={point.spend} r="4" fill="#10B981" />
              ))}

              {/* Estimated Profit line (purple) */}
              <path
                d={`M ${chartData.points[0].x} ${chartData.points[0].profit} L ${chartData.points[1].x} ${chartData.points[1].profit} L ${chartData.points[2].x} ${chartData.points[2].profit}`}
                stroke="#8B5CF6"
                strokeWidth="3"
                fill="none"
                className="drop-shadow-sm"
              />
              {chartData.points.map((point, index) => (
                <circle key={`profit-${index}`} cx={point.x} cy={point.profit} r="4" fill="#8B5CF6" />
              ))}
            </svg>

            {/* X-axis labels with padding */}
            <div className="absolute bottom-0 left-0 right-0 flex justify-between text-xs text-gray-500 px-6 -mb-6">
              {sortedMonths.length >= 3 ? (
                <>
                  <span>{new Date(sortedMonths[sortedMonths.length - 3] + '-01').toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })}</span>
                  <span>{new Date(sortedMonths[sortedMonths.length - 2] + '-01').toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })}</span>
                  <span>{new Date(sortedMonths[sortedMonths.length - 1] + '-01').toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })}</span>
                </>
              ) : (
                <>
                  <span>Apr 2025</span>
                  <span>May 2025</span>
                  <span>Jun 2025</span>
                </>
              )}
            </div>
          </div>

          {/* Legend */}
          <div className="absolute top-4 right-4 flex items-center space-x-6 text-sm">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
              <span className="text-blue-400">Budget</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <span className="text-green-400">Actual Spend</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
              <span className="text-purple-400">Estimated Profit</span>
            </div>
          </div>
        </div>

        {/* Summary Stats - Using Real Data */}
        <div className="grid grid-cols-4 gap-4 mt-6">
          <div className="bg-blue-900/20 border border-blue-600/30 rounded-lg p-4 text-center">
            <p className="text-2xl font-bold text-blue-400">{formatCurrency(totalBudgetSet)}</p>
            <p className="text-blue-300 text-sm">Total Budget Set</p>
            <p className="text-gray-400 text-xs">Last {sortedMonths.length} months</p>
          </div>
          <div className="bg-green-900/20 border border-green-600/30 rounded-lg p-4 text-center">
            <p className="text-2xl font-bold text-green-400">{formatCurrency(totalActualSpend)}</p>
            <p className="text-green-300 text-sm">Total Actual Spend</p>
            <p className="text-gray-400 text-xs">
              {totalBudgetSet > 0 ? `${((totalActualSpend / totalBudgetSet) * 100).toFixed(1)}% of budget` : 'No budget set'}
            </p>
          </div>
          <div className="bg-purple-900/20 border border-purple-600/30 rounded-lg p-4 text-center">
            <p className="text-2xl font-bold text-purple-400">{formatCurrency(totalEstProfit)}</p>
            <p className="text-purple-300 text-sm">Total Est. Profit</p>
            <p className="text-gray-400 text-xs">From historical orders</p>
          </div>
          <div className="bg-orange-900/20 border border-orange-600/30 rounded-lg p-4 text-center">
            <p className="text-2xl font-bold text-orange-400">{formatCurrency(avgMonthlySpend)}</p>
            <p className="text-orange-300 text-sm">Avg Monthly Spend</p>
            <p className="text-gray-400 text-xs">{monthsUnderBudget} under, {monthsOverBudget} over budget</p>
          </div>
        </div>
      </Card>

      {/* Monthly Breakdown - Using Real Data */}
      <Card className="overflow-hidden">
        <div className="p-6 border-b border-gray-700">
          <h3 className="text-lg font-semibold text-white">Monthly Breakdown</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-750 border-b border-gray-700">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Month
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Budget
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Actual Spend
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Variance
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Est. Profit
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Performance
                </th>
              </tr>
            </thead>
            <tbody className="bg-gray-800 divide-y divide-gray-700">
              {sortedMonths.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <div className="text-gray-400">
                      <p className="text-lg mb-2">No budget history found</p>
                      <p className="text-sm">Set your first budget to start tracking performance</p>
                    </div>
                  </td>
                </tr>
              ) : (
                sortedMonths.map((monthKey) => {
                  const data = historicalData[monthKey];
                  const [year, month] = monthKey.split('-');
                  const monthName = new Date(parseInt(year), parseInt(month) - 1).toLocaleDateString('en-GB', { 
                    month: 'long', 
                    year: 'numeric' 
                  });
                  const variance = data.budget - data.spend;
                  const utilization = data.budget > 0 ? (data.spend / data.budget) * 100 : 0;
                  
                  return (
                    <tr key={monthKey}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-white">
                        {monthName}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                        {formatCurrency(data.budget)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                        {formatCurrency(data.spend)}
                      </td>
                      <td className={`px-6 py-4 whitespace-nowrap text-sm ${variance >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {variance >= 0 ? '+' : ''}{formatCurrency(variance)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-purple-400">
                        {formatCurrency(data.profit)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="w-16 bg-gray-700 rounded-full h-2 mr-2">
                            <div 
                              className={`h-2 rounded-full ${utilization > 100 ? 'bg-red-500' : utilization > 80 ? 'bg-yellow-500' : 'bg-green-500'}`}
                              style={{ width: `${Math.min(utilization, 100)}%` }}
                            ></div>
                          </div>
                          <span className="text-sm text-gray-300">{utilization.toFixed(0)}%</span>
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

      {/* Budget Modal */}
      <BudgetModal
        isOpen={showBudgetModal}
        onClose={() => setShowBudgetModal(false)}
        onSuccess={handleModalSuccess}
      />
    </div>
  );
};

export default Budget;