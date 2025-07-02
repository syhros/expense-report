import React, { useState } from 'react';
import { ShoppingBag, Package, TrendingUp, CreditCard, Target, Calendar, Clock, CheckCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import SummaryCard from '../components/dashboard/SummaryCard';
import MetricCard from '../components/dashboard/MetricCard';
import BudgetStatus from '../components/dashboard/BudgetStatus';
import TopSuppliers from '../components/dashboard/TopSuppliers';
import TopProducts from '../components/dashboard/TopProducts';
import RecentTransactions from '../components/dashboard/RecentOrders';
import { useDashboardMetrics, useSupplierMetrics, useTransactionsWithMetrics, useBudgets, useGeneralLedgerTransactions } from '../hooks/useData';
import { formatCurrency, formatPercentage } from '../utils/formatters';

const Dashboard: React.FC = () => {
  const { metrics, loading: metricsLoading } = useDashboardMetrics();
  const { supplierMetrics, loading: supplierLoading } = useSupplierMetrics();
  const { transactions, loading: transactionsLoading } = useTransactionsWithMetrics();
  const { currentBudget, loading: budgetLoading } = useBudgets();
  const { transactions: generalLedgerTransactions, loading: generalLedgerLoading } = useGeneralLedgerTransactions();
  const [supplierView, setSupplierView] = useState<'orders' | 'spend' | 'profit'>('orders');

  if (metricsLoading || supplierLoading || transactionsLoading || budgetLoading || generalLedgerLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-white">Dashboard</h1>
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>
      </div>
    );
  }

  if (!metrics) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-white">Dashboard</h1>
        <div className="text-center py-12 text-gray-400">
          <p>Unable to load dashboard metrics</p>
        </div>
      </div>
    );
  }

  // Calculate total transactions (purchase orders + general ledger)
  const totalTransactions = transactions.length + generalLedgerTransactions.length;

  const summaryCards = [
    { 
      title: 'Total Transactions', 
      value: totalTransactions.toString(), 
      icon: ShoppingBag, 
      trend: `${metrics.totalStockOrdered} items total` 
    },
    { 
      title: 'Total Stock Ordered', 
      value: metrics.totalStockOrdered.toString(), 
      icon: Package, 
      trend: 'Units across all orders' 
    },
    { 
      title: 'Total Estimated Profit', 
      value: formatCurrency(metrics.totalEstimatedProfit), 
      icon: TrendingUp, 
      trend: `${formatPercentage(metrics.averageROI)} ROI`,
      trendColor: metrics.totalEstimatedProfit >= 0 ? 'text-green-400' : 'text-red-400'
    },
    { 
      title: 'Monthly Spend', 
      value: formatCurrency(metrics.monthlySpend), 
      icon: CreditCard, 
      trend: transactions.length > 0 ? `Avg. ${formatCurrency(metrics.monthlySpend / transactions.length)} per order` : 'No orders yet'
    }
  ];

  const budgetAmount = currentBudget?.amount || 0;
  const daysLeftInMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate() - new Date().getDate();
  const dailySpendTarget = daysLeftInMonth > 0 && budgetAmount > 0 ? (budgetAmount - metrics.monthlySpend) / daysLeftInMonth : 0;

  // Calculate average order value
  const averageOrderValue = transactions.length > 0 ? metrics.monthlySpend / transactions.length : 0;
  
  // Mock previous month comparison (would need historical data)
  const previousMonthAvgOrderValue = averageOrderValue * 0.95; // Mock 5% increase
  const avgOrderValueChange = previousMonthAvgOrderValue > 0 ? 
    ((averageOrderValue - previousMonthAvgOrderValue) / previousMonthAvgOrderValue) * 100 : 0;

  // Calculate delivery status including "Complete"
  const deliveredOrders = transactions.filter(t => 
    t.status === 'fully received' || t.status === 'collected' || t.status === 'complete'
  ).length;

  const metricCards = [
    { 
      title: 'Daily Spend Target', 
      value: formatCurrency(Math.max(dailySpendTarget, 0)), 
      trend: dailySpendTarget <= 200 && dailySpendTarget > 0 ? 'On Track' : dailySpendTarget > 200 ? 'Off Track' : 'Budget exceeded',
      description: `${daysLeftInMonth} days left`,
      trendColor: dailySpendTarget <= 200 && dailySpendTarget > 0 ? 'text-green-400' : 'text-red-400'
    },
    { 
      title: 'Estimated Profit Margin', 
      value: formatPercentage(metrics.averageROI), 
      trend: '+0.8%',
      trendColor: metrics.averageROI >= 0 ? 'text-green-400' : 'text-red-400'
    },
    { 
      title: 'Avg. Order Value', 
      value: formatCurrency(averageOrderValue), 
      trend: `${avgOrderValueChange >= 0 ? '+' : ''}${avgOrderValueChange.toFixed(1)}%`,
      description: 'vs previous month'
    },
    { 
      title: 'Delivered Orders', 
      value: deliveredOrders.toString(), 
      trend: `${transactions.length > 0 ? ((deliveredOrders / transactions.length) * 100).toFixed(1) : 0}%`, 
      description: 'Completion rate' 
    }
  ];

  // Get recent transactions (last 5 transactions) with clickable IDs
  const recentTransactions = transactions.slice(0, 5).map(transaction => ({
    id: transaction.id.slice(0, 8).toUpperCase(),
    supplier: transaction.supplier?.name || 'Unknown Supplier',
    status: transaction.status,
    cost: formatCurrency(transaction.totalCost),
    transactionId: transaction.id
  }));

  // Mock top products for now - this would need more complex calculation
  const topProducts = [
    { 
      title: 'Top performing product will appear here', 
      asin: 'B00EXAMPLE', 
      units: 0, 
      profit: '0', 
      roi: '0.0%' 
    }
  ];

  // Sort suppliers based on selected view
  const sortedSuppliers = [...supplierMetrics].sort((a, b) => {
    switch (supplierView) {
      case 'spend':
        return b.totalSpend - a.totalSpend;
      case 'profit':
        return b.estimatedProfit - a.estimatedProfit;
      default:
        return b.orderCount - a.orderCount;
    }
  }).slice(0, 3);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-white">Dashboard</h1>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {summaryCards.map((card, index) => (
          <SummaryCard
            key={index}
            title={card.title}
            value={card.value}
            icon={card.icon}
            trend={card.trend}
            trendColor={card.trendColor}
          />
        ))}
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {metricCards.map((card, index) => (
          <MetricCard
            key={index}
            title={card.title}
            value={card.value}
            trend={card.trend}
            description={card.description}
            trendColor={card.trendColor}
          />
        ))}
      </div>

      {/* Budget and Suppliers Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="relative">
          <BudgetStatus />
          {/* Link Manage Budget button to budget page */}
          <div className="absolute top-6 right-6">
            <Link
              to="/budget"
              className="text-blue-400 hover:text-blue-300 text-sm font-medium transition-colors"
            >
              Manage Budget
            </Link>
          </div>
        </div>
        <div className="relative">
          <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl shadow-xl p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-white">Top Suppliers</h3>
              <div className="flex space-x-4 text-sm">
                <button 
                  onClick={() => setSupplierView('orders')}
                  className={`px-3 py-1 rounded ${supplierView === 'orders' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'}`}
                >
                  Orders
                </button>
                <button 
                  onClick={() => setSupplierView('spend')}
                  className={`px-3 py-1 rounded ${supplierView === 'spend' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'}`}
                >
                  Spend
                </button>
                <button 
                  onClick={() => setSupplierView('profit')}
                  className={`px-3 py-1 rounded ${supplierView === 'profit' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'}`}
                >
                  Profit
                </button>
                <Link
                  to="/suppliers"
                  className="text-blue-400 hover:text-blue-300 font-medium"
                >
                  View All
                </Link>
              </div>
            </div>
            <TopSuppliers suppliers={sortedSuppliers} />
          </div>
        </div>
      </div>

      {/* Products and Transactions Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <TopProducts products={topProducts} />
        <div className="relative">
          <RecentTransactions transactions={recentTransactions} />
          {/* Enhanced "View All" link */}
          <div className="absolute top-6 right-6">
            <Link
              to="/transactions"
              className="text-blue-400 hover:text-blue-300 text-sm font-medium transition-colors"
            >
              View All
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;