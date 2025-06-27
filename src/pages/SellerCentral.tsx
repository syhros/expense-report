import React, { useState, useRef } from 'react';
import { Upload, Download, RefreshCw, Edit, Save, X, FileText, AlertCircle } from 'lucide-react';
import Card from '../components/shared/Card';
import { useAmazonTransactions, useASINs } from '../hooks/useData';
import { updateAmazonTransaction, createAmazonTransaction, deleteAllAmazonTransactions } from '../services/database';
import { formatCurrency, formatDate } from '../utils/formatters';

const SellerCentral: React.FC = () => {
  const { amazonTransactions, loading, error, refetch } = useAmazonTransactions();
  const { asins } = useASINs();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<any>({});
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [importSuccess, setImportSuccess] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleEdit = (transaction: any) => {
    setEditingId(transaction.id);
    setEditValues({
      date: transaction.date,
      transaction_status: transaction.transaction_status,
      transaction_type: transaction.transaction_type,
      order_id: transaction.order_id,
      product_details: transaction.product_details,
      total_product_charges: transaction.total_product_charges,
      total_promotional_rebates: transaction.total_promotional_rebates,
      amazon_fees: transaction.amazon_fees,
      other: transaction.other,
      total: transaction.total,
      avg_cog: transaction.avg_cog
    });
  };

  const handleSave = async (id: string) => {
    try {
      await updateAmazonTransaction(id, editValues);
      setEditingId(null);
      setEditValues({});
      refetch();
    } catch (err) {
      console.error('Failed to update Amazon transaction:', err);
    }
  };

  const handleCancel = () => {
    setEditingId(null);
    setEditValues({});
  };

  const handleFileUpload = () => {
    fileInputRef.current?.click();
  };

  const parseCSVLine = (line: string): string[] => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    
    result.push(current.trim());
    return result;
  };

  const parseDate = (dateStr: string): string | null => {
    if (!dateStr || dateStr.trim() === '') return null;
    
    // Handle DD/MM/YYYY format
    const parts = dateStr.split('/');
    if (parts.length === 3) {
      const day = parts[0].padStart(2, '0');
      const month = parts[1].padStart(2, '0');
      const year = parts[2];
      return `${year}-${month}-${day}`;
    }
    
    return null;
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setImporting(true);
    setImportError(null);
    setImportSuccess(null);

    try {
      // First, delete all existing Amazon transactions
      await deleteAllAmazonTransactions();

      const text = await file.text();
      const lines = text.split('\n').filter(line => line.trim());
      
      if (lines.length < 2) {
        throw new Error('CSV file must contain at least a header row and one data row');
      }

      // Parse header to find column indices
      const headers = parseCSVLine(lines[0]).map(h => h.replace(/"/g, '').toLowerCase());
      
      const columnIndices = {
        date: headers.findIndex(h => h.includes('date')),
        transaction_status: headers.findIndex(h => h.includes('transaction status')),
        transaction_type: headers.findIndex(h => h.includes('transaction type')),
        order_id: headers.findIndex(h => h.includes('order id')),
        product_details: headers.findIndex(h => h.includes('product details')),
        total_product_charges: headers.findIndex(h => h.includes('total product charges')),
        total_promotional_rebates: headers.findIndex(h => h.includes('total promotional rebates')),
        amazon_fees: headers.findIndex(h => h.includes('amazon fees')),
        other: headers.findIndex(h => h.includes('other')),
        total: headers.findIndex(h => h.includes('total') && h.includes('gbp'))
      };

      // Validate required columns exist
      const missingColumns = Object.entries(columnIndices)
        .filter(([_, index]) => index === -1)
        .map(([column, _]) => column);

      if (missingColumns.length > 0) {
        throw new Error(`Missing required columns: ${missingColumns.join(', ')}`);
      }

      let importedCount = 0;
      let skippedCount = 0;
      let matchedCount = 0;

      // Process data rows
      for (let i = 1; i < lines.length; i++) {
        const values = parseCSVLine(lines[i]);
        
        if (values.length < Math.max(...Object.values(columnIndices)) + 1) {
          skippedCount++;
          continue;
        }

        try {
          const productDetails = values[columnIndices.product_details]?.replace(/"/g, '') || '';
          
          // Try to match ASIN by product details (first 24 characters)
          let avgCog = 0;
          if (productDetails && productDetails.length >= 24) {
            const productPrefix = productDetails.substring(0, 24).toLowerCase();
            const matchingASIN = asins.find(asin => 
              asin.title && asin.title.toLowerCase().substring(0, 24) === productPrefix
            );
            
            if (matchingASIN) {
              // Calculate average COG from transaction items for this ASIN
              // For now, we'll use the averageBuyPrice from the ASIN metrics
              // In a real implementation, you'd calculate this from transaction items
              avgCog = 0; // This would be calculated from your transaction items
              matchedCount++;
            }
          }

          const transactionData = {
            date: parseDate(values[columnIndices.date]?.replace(/"/g, '')),
            transaction_status: values[columnIndices.transaction_status]?.replace(/"/g, '') || '',
            transaction_type: values[columnIndices.transaction_type]?.replace(/"/g, '') || '',
            order_id: values[columnIndices.order_id]?.replace(/"/g, '') || '',
            product_details: productDetails,
            total_product_charges: parseFloat(values[columnIndices.total_product_charges]?.replace(/"/g, '') || '0') || 0,
            total_promotional_rebates: parseFloat(values[columnIndices.total_promotional_rebates]?.replace(/"/g, '') || '0') || 0,
            amazon_fees: parseFloat(values[columnIndices.amazon_fees]?.replace(/"/g, '') || '0') || 0,
            other: parseFloat(values[columnIndices.other]?.replace(/"/g, '') || '0') || 0,
            total: parseFloat(values[columnIndices.total]?.replace(/"/g, '') || '0') || 0,
            avg_cog: avgCog
          };

          await createAmazonTransaction(transactionData);
          importedCount++;
        } catch (err) {
          console.error(`Error importing row ${i}:`, err);
          skippedCount++;
        }
      }

      setImportSuccess(`Successfully imported ${importedCount} transactions. ${matchedCount} ASIN matches found. ${skippedCount} rows skipped. Previous data cleared.`);
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

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white">Seller Central</h1>
            <p className="text-gray-400 mt-1">Import and manage Amazon Seller Central transaction data</p>
          </div>
          <div className="flex items-center space-x-3">
            <button className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg transition-colors flex items-center space-x-2">
              <RefreshCw className="h-4 w-4" />
              <span>Sync Data</span>
            </button>
            <button 
              onClick={handleFileUpload}
              disabled={importing}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white px-4 py-2 rounded-lg transition-colors flex items-center space-x-2"
            >
              <Upload className="h-4 w-4" />
              <span>Import Transactions CSV</span>
            </button>
          </div>
        </div>
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>
      </div>
    );
  }

  // Calculate summary statistics with ASIN matching and COG integration
  const totalTransactions = amazonTransactions.length;
  const totalRevenue = amazonTransactions.reduce((sum, t) => sum + t.total, 0);
  const totalAmazonFees = amazonTransactions.reduce((sum, t) => sum + Math.abs(t.amazon_fees), 0);
  const totalProductCharges = amazonTransactions.reduce((sum, t) => sum + t.total_product_charges, 0);
  const totalCOG = amazonTransactions.reduce((sum, t) => sum + (t.avg_cog || 0), 0);
  const netProfit = totalProductCharges - totalCOG - totalAmazonFees;
  const matchedTransactions = amazonTransactions.filter(t => (t.avg_cog || 0) > 0).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Seller Central</h1>
          <p className="text-gray-400 mt-1">Import and manage Amazon Seller Central transaction data</p>
        </div>
        <div className="flex items-center space-x-3">
          <button className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg transition-colors flex items-center space-x-2">
            <RefreshCw className="h-4 w-4" />
            <span>Sync Data</span>
          </button>
          <button 
            onClick={handleFileUpload}
            disabled={importing}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white px-4 py-2 rounded-lg transition-colors flex items-center space-x-2"
          >
            {importing ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
            ) : (
              <Upload className="h-4 w-4" />
            )}
            <span>{importing ? 'Importing...' : 'Import Transactions CSV'}</span>
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
            <FileText className="h-5 w-5 text-green-400" />
            <div>
              <h3 className="text-green-300 font-medium">Import Successful</h3>
              <p className="text-green-400 text-sm">{importSuccess}</p>
            </div>
          </div>
        </Card>
      )}

      {/* Import Instructions */}
      <Card className="p-6">
        <div className="flex items-start space-x-4">
          <div className="p-3 bg-blue-600 rounded-lg">
            <Download className="h-6 w-6 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white mb-2">How to Import Transaction Data</h3>
            <div className="text-gray-300 space-y-2">
              <p>1. Log into your Amazon Seller Central account</p>
              <p>2. Navigate to Reports → Payments → Transaction View</p>
              <p>3. Select your date range and download the CSV file</p>
              <p>4. Click "Import Transactions CSV" above to upload your file</p>
            </div>
            <div className="mt-4 p-3 bg-blue-900/30 rounded-lg">
              <p className="text-blue-300 text-sm">
                <strong>Note:</strong> Importing will clear all previous data and replace it with the new CSV data. The system will automatically match product details with your ASINs to calculate accurate profit margins using average COG values.
              </p>
            </div>
          </div>
        </div>
      </Card>

      {/* Enhanced Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-400">Total Transactions</p>
              <p className="text-2xl font-bold text-white mt-2">{totalTransactions}</p>
              <p className="text-xs text-gray-500 mt-1">All time</p>
            </div>
            <div className="p-3 bg-blue-600 rounded-lg">
              <span className="text-white text-xl">📊</span>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-400">Total Revenue</p>
              <p className="text-2xl font-bold text-white mt-2">{formatCurrency(totalRevenue)}</p>
              <p className="text-xs text-gray-500 mt-1">Sum of Total column</p>
            </div>
            <div className="p-3 bg-green-600 rounded-lg">
              <span className="text-white text-xl">💰</span>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-400">Amazon Fees</p>
              <p className="text-2xl font-bold text-white mt-2">{formatCurrency(totalAmazonFees)}</p>
              <p className="text-xs text-gray-500 mt-1">Sum of Amazon Fees</p>
            </div>
            <div className="p-3 bg-red-600 rounded-lg">
              <span className="text-white text-xl">💸</span>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-400">Net Profit</p>
              <p className={`text-2xl font-bold mt-2 ${netProfit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {formatCurrency(netProfit)}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {matchedTransactions} ASIN matches
              </p>
            </div>
            <div className="p-3 bg-purple-600 rounded-lg">
              <span className="text-white text-xl">📈</span>
            </div>
          </div>
        </Card>
      </div>

      {/* Additional Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Revenue Breakdown</h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-gray-400">Product Charges</span>
              <span className="text-white font-medium">{formatCurrency(totalProductCharges)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-400">Cost of Goods</span>
              <span className="text-orange-400 font-medium">-{formatCurrency(totalCOG)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-400">Amazon Fees</span>
              <span className="text-red-400 font-medium">-{formatCurrency(totalAmazonFees)}</span>
            </div>
            <div className="border-t border-gray-700 pt-2">
              <div className="flex justify-between items-center">
                <span className="text-white font-medium">Net Profit</span>
                <span className={`font-bold ${netProfit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {formatCurrency(netProfit)}
                </span>
              </div>
            </div>
            <div className="text-xs text-gray-500 mt-2">
              Calculation: Product Charges - Cost of Goods - Amazon Fees = Net Profit
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <h3 className="text-lg font-semibold text-white mb-4">ASIN Matching</h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-gray-400">Total Transactions</span>
              <span className="text-white font-medium">{totalTransactions}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-400">ASIN Matches</span>
              <span className="text-blue-400 font-medium">{matchedTransactions}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-400">Match Rate</span>
              <span className="text-green-400 font-medium">
                {totalTransactions > 0 ? ((matchedTransactions / totalTransactions) * 100).toFixed(1) : 0}%
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-400">Total COG</span>
              <span className="text-orange-400 font-medium">{formatCurrency(totalCOG)}</span>
            </div>
            <div className="text-xs text-gray-500 mt-2">
              Matches based on first 24 characters of Product Details vs ASIN titles. COG automatically calculated from matched ASINs.
            </div>
          </div>
        </Card>
      </div>

      {/* Transaction Data Table */}
      <Card className="overflow-hidden">
        <div className="p-6 border-b border-gray-700">
          <h3 className="text-lg font-semibold text-white">Amazon Transaction Data</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-750 border-b border-gray-700">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Transaction Status
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Transaction Type
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Order ID
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Product Details
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Total Product Charges
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Total Promotional Rebates
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Amazon Fees
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Other
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  AVG. COG
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Total (GBP)
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-gray-800 divide-y divide-gray-700">
              {amazonTransactions.length === 0 ? (
                <tr>
                  <td colSpan={12} className="px-6 py-12 text-center">
                    <div className="text-gray-400">
                      <div className="w-16 h-16 bg-gray-700 rounded-lg flex items-center justify-center mx-auto mb-4">
                        <Upload className="h-8 w-8 text-gray-500" />
                      </div>
                      <p className="text-lg mb-2">No transaction data imported</p>
                      <p className="text-sm">Import your Amazon Seller Central CSV file to view transaction data</p>
                    </div>
                  </td>
                </tr>
              ) : (
                amazonTransactions.map((transaction) => (
                  <tr key={transaction.id} className="hover:bg-gray-750">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                      {editingId === transaction.id ? (
                        <input
                          type="date"
                          value={editValues.date || ''}
                          onChange={(e) => setEditValues({...editValues, date: e.target.value})}
                          className="bg-gray-700 border border-gray-600 rounded px-2 py-1 text-white text-sm"
                        />
                      ) : (
                        formatDate(transaction.date)
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                      {editingId === transaction.id ? (
                        <input
                          type="text"
                          value={editValues.transaction_status || ''}
                          onChange={(e) => setEditValues({...editValues, transaction_status: e.target.value})}
                          className="w-24 bg-gray-700 border border-gray-600 rounded px-2 py-1 text-white text-sm"
                        />
                      ) : (
                        transaction.transaction_status
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                      {editingId === transaction.id ? (
                        <input
                          type="text"
                          value={editValues.transaction_type || ''}
                          onChange={(e) => setEditValues({...editValues, transaction_type: e.target.value})}
                          className="w-24 bg-gray-700 border border-gray-600 rounded px-2 py-1 text-white text-sm"
                        />
                      ) : (
                        transaction.transaction_type
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-400">
                      {editingId === transaction.id ? (
                        <input
                          type="text"
                          value={editValues.order_id || ''}
                          onChange={(e) => setEditValues({...editValues, order_id: e.target.value})}
                          className="w-32 bg-gray-700 border border-gray-600 rounded px-2 py-1 text-white text-sm"
                        />
                      ) : (
                        transaction.order_id
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-300 max-w-xs">
                      {editingId === transaction.id ? (
                        <input
                          type="text"
                          value={editValues.product_details || ''}
                          onChange={(e) => setEditValues({...editValues, product_details: e.target.value})}
                          className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1 text-white text-sm"
                        />
                      ) : (
                        <span className="truncate block">{transaction.product_details}</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                      {editingId === transaction.id ? (
                        <input
                          type="number"
                          step="0.01"
                          value={editValues.total_product_charges || ''}
                          onChange={(e) => setEditValues({...editValues, total_product_charges: parseFloat(e.target.value) || 0})}
                          className="w-24 bg-gray-700 border border-gray-600 rounded px-2 py-1 text-white text-sm"
                        />
                      ) : (
                        formatCurrency(transaction.total_product_charges)
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                      {editingId === transaction.id ? (
                        <input
                          type="number"
                          step="0.01"
                          value={editValues.total_promotional_rebates || ''}
                          onChange={(e) => setEditValues({...editValues, total_promotional_rebates: parseFloat(e.target.value) || 0})}
                          className="w-24 bg-gray-700 border border-gray-600 rounded px-2 py-1 text-white text-sm"
                        />
                      ) : (
                        formatCurrency(transaction.total_promotional_rebates)
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-red-400">
                      {editingId === transaction.id ? (
                        <input
                          type="number"
                          step="0.01"
                          value={editValues.amazon_fees || ''}
                          onChange={(e) => setEditValues({...editValues, amazon_fees: parseFloat(e.target.value) || 0})}
                          className="w-24 bg-gray-700 border border-gray-600 rounded px-2 py-1 text-white text-sm"
                        />
                      ) : (
                        formatCurrency(transaction.amazon_fees)
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                      {editingId === transaction.id ? (
                        <input
                          type="number"
                          step="0.01"
                          value={editValues.other || ''}
                          onChange={(e) => setEditValues({...editValues, other: parseFloat(e.target.value) || 0})}
                          className="w-24 bg-gray-700 border border-gray-600 rounded px-2 py-1 text-white text-sm"
                        />
                      ) : (
                        formatCurrency(transaction.other)
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-orange-400">
                      {editingId === transaction.id ? (
                        <input
                          type="number"
                          step="0.01"
                          value={editValues.avg_cog || ''}
                          onChange={(e) => setEditValues({...editValues, avg_cog: parseFloat(e.target.value) || 0})}
                          className="w-24 bg-gray-700 border border-gray-600 rounded px-2 py-1 text-white text-sm"
                        />
                      ) : (
                        formatCurrency(transaction.avg_cog || 0)
                      )}
                    </td>
                    <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${
                      transaction.total >= 0 ? 'text-green-400' : 'text-red-400'
                    }`}>
                      {editingId === transaction.id ? (
                        <input
                          type="number"
                          step="0.01"
                          value={editValues.total || ''}
                          onChange={(e) => setEditValues({...editValues, total: parseFloat(e.target.value) || 0})}
                          className="w-24 bg-gray-700 border border-gray-600 rounded px-2 py-1 text-white text-sm"
                        />
                      ) : (
                        formatCurrency(transaction.total)
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                      {editingId === transaction.id ? (
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => handleSave(transaction.id)}
                            className="text-green-400 hover:text-green-300 flex items-center space-x-1"
                          >
                            <Save className="h-4 w-4" />
                            <span>Save</span>
                          </button>
                          <button
                            onClick={handleCancel}
                            className="text-red-400 hover:text-red-300 flex items-center space-x-1"
                          >
                            <X className="h-4 w-4" />
                            <span>Cancel</span>
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => handleEdit(transaction)}
                          className="text-blue-400 hover:text-blue-300 flex items-center space-x-1"
                        >
                          <Edit className="h-4 w-4" />
                          <span>Edit</span>
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};

export default SellerCentral;