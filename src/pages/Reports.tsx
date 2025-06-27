import React, { useState } from 'react';
import { Download, FileText, Archive, Calendar, DollarSign, TrendingUp, AlertCircle } from 'lucide-react';
import Card from '../components/shared/Card';
import { generateExpenseReportBackup } from '../services/reportGenerator';
import { useDashboardMetrics, useTransactionsWithMetrics } from '../hooks/useData';
import { formatCurrency, formatDate } from '../utils/formatters';

const Reports: React.FC = () => {
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const { metrics, loading: metricsLoading } = useDashboardMetrics();
  const { transactions, loading: transactionsLoading } = useTransactionsWithMetrics();

  const loading = metricsLoading || transactionsLoading;

  const handleGenerateBackup = async () => {
    setGenerating(true);
    setError(null);
    setSuccess(null);

    try {
      await generateExpenseReportBackup();
      setSuccess('Expense report backup generated successfully! Check your downloads folder.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate expense report backup');
    } finally {
      setGenerating(false);
    }
  };

  const getCurrentDate = () => {
    return new Date().toISOString().split('T')[0];
  };

  const getReportStats = () => {
    if (!transactions || transactions.length === 0) {
      return {
        totalTransactions: 0,
        totalSpend: 0,
        totalProfit: 0,
        avgROI: 0,
        dateRange: 'No data'
      };
    }

    const sortedTransactions = transactions
      .filter(t => t.ordered_date)
      .sort((a, b) => new Date(a.ordered_date!).getTime() - new Date(b.ordered_date!).getTime());

    const totalSpend = transactions.reduce((sum, t) => sum + t.totalCost, 0);
    const totalProfit = transactions.reduce((sum, t) => sum + t.estimatedProfit, 0);
    const avgROI = transactions.length > 0 ? 
      transactions.reduce((sum, t) => sum + t.roi, 0) / transactions.length : 0;

    const dateRange = sortedTransactions.length > 0 ? 
      `${formatDate(sortedTransactions[0].ordered_date)} - ${formatDate(sortedTransactions[sortedTransactions.length - 1].ordered_date)}` :
      'No data';

    return {
      totalTransactions: transactions.length,
      totalSpend,
      totalProfit,
      avgROI,
      dateRange
    };
  };

  const stats = getReportStats();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Reports</h1>
          <p className="text-gray-400 mt-1">Generate comprehensive expense reports and data backups</p>
        </div>
      </div>

      {/* Status Messages */}
      {error && (
        <Card className="p-4 bg-red-900/20 border-red-600/30">
          <div className="flex items-center space-x-3">
            <AlertCircle className="h-5 w-5 text-red-400" />
            <div>
              <h3 className="text-red-300 font-medium">Generation Error</h3>
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          </div>
        </Card>
      )}

      {success && (
        <Card className="p-4 bg-green-900/20 border-green-600/30">
          <div className="flex items-center space-x-3">
            <Download className="h-5 w-5 text-green-400" />
            <div>
              <h3 className="text-green-300 font-medium">Success</h3>
              <p className="text-green-400 text-sm">{success}</p>
            </div>
          </div>
        </Card>
      )}

      {/* Report Statistics */}
      {!loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-400">Total Transactions</p>
                <p className="text-2xl font-bold text-white mt-2">{stats.totalTransactions}</p>
                <p className="text-xs text-gray-500 mt-1">All time</p>
              </div>
              <div className="p-3 bg-blue-600/80 backdrop-blur-sm rounded-xl">
                <FileText className="h-6 w-6 text-white" />
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-400">Total Spend</p>
                <p className="text-2xl font-bold text-white mt-2">{formatCurrency(stats.totalSpend)}</p>
                <p className="text-xs text-gray-500 mt-1">Including fees & shipping</p>
              </div>
              <div className="p-3 bg-green-600/80 backdrop-blur-sm rounded-xl">
                <DollarSign className="h-6 w-6 text-white" />
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-400">Total Estimated Profit</p>
                <p className={`text-2xl font-bold mt-2 ${stats.totalProfit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {formatCurrency(stats.totalProfit)}
                </p>
                <p className="text-xs text-gray-500 mt-1">Projected earnings</p>
              </div>
              <div className="p-3 bg-purple-600/80 backdrop-blur-sm rounded-xl">
                <TrendingUp className="h-6 w-6 text-white" />
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-400">Average ROI</p>
                <p className={`text-2xl font-bold mt-2 ${stats.avgROI >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {stats.avgROI.toFixed(1)}%
                </p>
                <p className="text-xs text-gray-500 mt-1">Return on investment</p>
              </div>
              <div className="p-3 bg-orange-600/80 backdrop-blur-sm rounded-xl">
                <Calendar className="h-6 w-6 text-white" />
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Expense Report Backup */}
      <Card className="p-8">
        <div className="flex items-start space-x-6">
          <div className="p-4 bg-blue-600/80 backdrop-blur-sm rounded-2xl">
            <Archive className="h-8 w-8 text-white" />
          </div>
          <div className="flex-1">
            <h3 className="text-2xl font-bold text-white mb-3">Expense Report Backup</h3>
            <p className="text-gray-300 mb-6 leading-relaxed">
              Generate a comprehensive backup of all your expense data including detailed transaction reports 
              and associated receipt files. Perfect for accounting, tax preparation, or data archival purposes.
            </p>

            {/* Report Contents */}
            <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-600/30 rounded-xl p-6 mb-6">
              <h4 className="text-lg font-semibold text-white mb-4">Report Contents</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h5 className="text-blue-400 font-medium mb-3">📄 PDF Report Includes:</h5>
                  <ul className="text-gray-300 text-sm space-y-2">
                    <li>• Transaction ID and dates</li>
                    <li>• Supplier information</li>
                    <li>• Category and status details</li>
                    <li>• Payment methods</li>
                    <li>• Cost breakdown and P/L analysis</li>
                    <li>• ROI calculations</li>
                    <li>• Detailed line items with ASIN data</li>
                    <li>• Associated receipt filenames</li>
                  </ul>
                </div>
                <div>
                  <h5 className="text-green-400 font-medium mb-3">📁 ZIP Archive Contains:</h5>
                  <ul className="text-gray-300 text-sm space-y-2">
                    <li>• Complete PDF expense report</li>
                    <li>• "receipts" folder with all uploaded files</li>
                    <li>• Chronologically sorted transactions</li>
                    <li>• Parent-child transaction relationships</li>
                    <li>• Consistent currency formatting</li>
                    <li>• Proper date formatting (DD/MM/YYYY)</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Report Preview Info */}
            <div className="bg-blue-900/20 backdrop-blur-sm border border-blue-600/30 rounded-xl p-4 mb-6">
              <div className="flex items-center space-x-3 mb-3">
                <FileText className="h-5 w-5 text-blue-400" />
                <h5 className="text-blue-300 font-medium">Report Preview</h5>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="text-gray-400">Filename:</span>
                  <p className="text-blue-300 font-mono">expense-backup-{getCurrentDate()}.zip</p>
                </div>
                <div>
                  <span className="text-gray-400">Date Range:</span>
                  <p className="text-blue-300">{stats.dateRange}</p>
                </div>
                <div>
                  <span className="text-gray-400">Transactions:</span>
                  <p className="text-blue-300">{stats.totalTransactions} records</p>
                </div>
                <div>
                  <span className="text-gray-400">Total Value:</span>
                  <p className="text-blue-300">{formatCurrency(stats.totalSpend)}</p>
                </div>
              </div>
            </div>

            {/* Generate Button */}
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-400">
                <p>Report will be downloaded as a ZIP file to your default downloads folder.</p>
                <p className="mt-1">Processing time may vary based on the number of receipts and transactions.</p>
              </div>
              <button
                onClick={handleGenerateBackup}
                disabled={generating || loading || stats.totalTransactions === 0}
                className="bg-blue-600/80 backdrop-blur-sm hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white px-8 py-4 rounded-xl transition-all duration-300 hover:scale-102 flex items-center space-x-3 text-lg font-medium"
              >
                {generating ? (
                  <>
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
                    <span>Generating Report...</span>
                  </>
                ) : (
                  <>
                    <Download className="h-6 w-6" />
                    <span>Generate Backup</span>
                  </>
                )}
              </button>
            </div>

            {stats.totalTransactions === 0 && (
              <div className="mt-4 p-3 bg-yellow-900/30 backdrop-blur-sm border border-yellow-600/30 rounded-lg">
                <p className="text-yellow-300 text-sm">
                  No transactions found. Add some transactions to generate an expense report.
                </p>
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* Additional Report Options */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="p-6 opacity-60">
          <div className="flex items-center space-x-4 mb-4">
            <div className="p-3 bg-gray-600 rounded-xl">
              <TrendingUp className="h-6 w-6 text-gray-300" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-300">Performance Analytics</h3>
              <p className="text-gray-500 text-sm">Coming Soon</p>
            </div>
          </div>
          <p className="text-gray-400 text-sm">
            Advanced analytics and performance metrics for your FBA business including profit trends, 
            supplier performance, and ROI analysis.
          </p>
        </Card>

        <Card className="p-6 opacity-60">
          <div className="flex items-center space-x-4 mb-4">
            <div className="p-3 bg-gray-600 rounded-xl">
              <Calendar className="h-6 w-6 text-gray-300" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-300">Tax Reports</h3>
              <p className="text-gray-500 text-sm">Coming Soon</p>
            </div>
          </div>
          <p className="text-gray-400 text-sm">
            Generate tax-ready reports with proper categorization and formatting for easy 
            submission to accountants and tax authorities.
          </p>
        </Card>
      </div>
    </div>
  );
};

export default Reports;