import React, { useState } from 'react';
import { Plus, Edit, Save, X, Package, Trash2, Check, Eye, ShoppingCart, Upload, Download, AlertCircle } from 'lucide-react';
import Card from '../components/shared/Card';
import ASINModal from '../components/modals/ASINModal';
import TransactionModal from '../components/modals/TransactionModal';
import { useASINsWithMetrics } from '../hooks/useData';
import { updateASIN, deleteASIN, getTransactionsByASIN, createASIN } from '../services/database';
import { formatCurrency, truncateText, formatDate } from '../utils/formatters';
import { TransactionWithMetrics } from '../types/database';
import { downloadCSVTemplate, parseASINCSV } from '../utils/csvHelpers';

const ASINs: React.FC = () => {
  const { asins, loading, error, refetch } = useASINsWithMetrics();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<any>({});
  const [showShipModal, setShowShipModal] = useState<string | null>(null);
  const [shipAmount, setShipAmount] = useState<number>(0);
  const [showASINModal, setShowASINModal] = useState(false);
  const [editingASIN, setEditingASIN] = useState(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState<string | null>(null);
  const [showTransactionsModal, setShowTransactionsModal] = useState<string | null>(null);
  const [asinTransactions, setAsinTransactions] = useState<TransactionWithMetrics[]>([]);
  const [loadingTransactions, setLoadingTransactions] = useState(false);
  const [showTransactionModal, setShowTransactionModal] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<TransactionWithMetrics | null>(null);
  
  // Import states
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [importSuccess, setImportSuccess] = useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleEdit = (asin: any) => {
    setEditingId(asin.id);
    setEditValues({
      title: asin.title,
      brand: asin.brand,
      type: asin.type,
      pack: asin.pack,
      category: asin.category
    });
  };

  const handleSave = async (id: string) => {
    try {
      await updateASIN(id, editValues);
      setEditingId(null);
      setEditValues({});
      refetch();
    } catch (err) {
      console.error('Failed to update ASIN:', err);
    }
  };

  const handleCancel = () => {
    setEditingId(null);
    setEditValues({});
  };

  const handleShip = async (asinId: string, currentShipped: number) => {
    try {
      await updateASIN(asinId, { shipped: currentShipped + shipAmount });
      setShowShipModal(null);
      setShipAmount(0);
      refetch();
    } catch (err) {
      console.error('Failed to update shipped amount:', err);
    }
  };

  const handleAddASIN = () => {
    setEditingASIN(null);
    setShowASINModal(true);
  };

  const handleEditASIN = (asin: any) => {
    setEditingASIN(asin);
    setShowASINModal(true);
  };

  const handleModalSuccess = () => {
    refetch();
  };

  const handleDeleteClick = (asinId: string) => {
    if (deletingId === asinId) {
      // Second click - show confirmation modal
      const asin = asins.find(a => a.id === asinId);
      setShowDeleteModal(asinId);
      setDeletingId(null);
    } else {
      // First click - show tick/cross
      setDeletingId(asinId);
    }
  };

  const handleDeleteCancel = () => {
    setDeletingId(null);
  };

  const handleDeleteConfirm = async () => {
    if (showDeleteModal) {
      try {
        await deleteASIN(showDeleteModal);
        setShowDeleteModal(null);
        refetch();
      } catch (err) {
        console.error('Failed to delete ASIN:', err);
      }
    }
  };

  const handleViewTransactions = async (asinCode: string) => {
    setLoadingTransactions(true);
    setShowTransactionsModal(asinCode);
    
    try {
      const transactions = await getTransactionsByASIN(asinCode);
      setAsinTransactions(transactions);
    } catch (err) {
      console.error('Failed to load ASIN transactions:', err);
      setAsinTransactions([]);
    } finally {
      setLoadingTransactions(false);
    }
  };

  const handleTransactionClick = (transaction: TransactionWithMetrics) => {
    setSelectedTransaction(transaction);
    setShowTransactionModal(true);
    setShowTransactionsModal(null);
  };

  const handleTransactionModalSuccess = () => {
    refetch();
    // Reload transactions for the current ASIN if modal is still open
    if (showTransactionsModal) {
      handleViewTransactions(showTransactionsModal);
    }
  };

  // Import functionality
  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setImporting(true);
    setImportError(null);
    setImportSuccess(null);

    try {
      const text = await file.text();
      const { data, errors } = parseASINCSV(text);

      if (errors.length > 0) {
        setImportError(`Import errors: ${errors.join('; ')}`);
        return;
      }

      let importedCount = 0;
      let skippedCount = 0;

      for (const asinData of data) {
        try {
          await createASIN(asinData);
          importedCount++;
        } catch (err) {
          console.error(`Failed to import ASIN ${asinData.asin}:`, err);
          skippedCount++;
        }
      }

      setImportSuccess(`Successfully imported ${importedCount} ASINs. ${skippedCount} skipped due to duplicates or errors.`);
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

  // Helper function to format title into 2 lines, 24 chars each
  const formatTitleTwoLines = (title: string | null): { line1: string; line2: string } => {
    if (!title || title === 'No title') {
      return { line1: 'No title', line2: '' };
    }
    
    const truncated = truncateText(title, 48);
    if (truncated.length <= 24) {
      return { line1: truncated, line2: '' };
    }
    
    // Find a good break point around 24 characters
    let breakPoint = 24;
    while (breakPoint > 0 && truncated[breakPoint] !== ' ') {
      breakPoint--;
    }
    
    if (breakPoint === 0) breakPoint = 24; // If no space found, break at 24
    
    const line1 = truncated.substring(0, breakPoint).trim();
    const line2 = truncated.substring(breakPoint).trim();
    
    return { line1, line2 };
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white">ASINs</h1>
            <p className="text-gray-400 mt-1">Manage your Amazon product ASINs and track performance</p>
          </div>
          <div className="flex items-center space-x-3">
            <button className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg transition-colors">
              Incomplete
            </button>
            <button 
              onClick={downloadCSVTemplate}
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors flex items-center space-x-2"
            >
              <Download className="h-4 w-4" />
              <span>Template</span>
            </button>
            <button 
              onClick={handleImportClick}
              disabled={importing}
              className="bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 text-white px-4 py-2 rounded-lg transition-colors flex items-center space-x-2"
            >
              {importing ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              ) : (
                <Upload className="h-4 w-4" />
              )}
              <span>{importing ? 'Importing...' : 'Import'}</span>
            </button>
            <button 
              onClick={handleAddASIN}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors flex items-center space-x-2"
            >
              <Plus className="h-4 w-4" />
              <span>Add ASIN</span>
            </button>
          </div>
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
            <h1 className="text-3xl font-bold text-white">ASINs</h1>
            <p className="text-gray-400 mt-1">Manage your Amazon product ASINs and track performance</p>
          </div>
          <div className="flex items-center space-x-3">
            <button className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg transition-colors">
              Incomplete
            </button>
            <button 
              onClick={downloadCSVTemplate}
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors flex items-center space-x-2"
            >
              <Download className="h-4 w-4" />
              <span>Template</span>
            </button>
            <button 
              onClick={handleImportClick}
              disabled={importing}
              className="bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 text-white px-4 py-2 rounded-lg transition-colors flex items-center space-x-2"
            >
              {importing ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              ) : (
                <Upload className="h-4 w-4" />
              )}
              <span>{importing ? 'Importing...' : 'Import'}</span>
            </button>
            <button 
              onClick={handleAddASIN}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors flex items-center space-x-2"
            >
              <Plus className="h-4 w-4" />
              <span>Add ASIN</span>
            </button>
          </div>
        </div>
        <Card className="p-6">
          <div className="text-center text-red-400">
            <p>Error loading ASINs: {error}</p>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">ASINs</h1>
          <p className="text-gray-400 mt-1">Manage your Amazon product ASINs and track performance</p>
        </div>
        <div className="flex items-center space-x-3">
          <button className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg transition-colors">
            Incomplete
          </button>
          <button 
            onClick={downloadCSVTemplate}
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors flex items-center space-x-2"
          >
            <Download className="h-4 w-4" />
            <span>Template</span>
          </button>
          <button 
            onClick={handleImportClick}
            disabled={importing}
            className="bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 text-white px-4 py-2 rounded-lg transition-colors flex items-center space-x-2"
          >
            {importing ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
            ) : (
              <Upload className="h-4 w-4" />
            )}
            <span>{importing ? 'Importing...' : 'Import'}</span>
          </button>
          <button 
            onClick={handleAddASIN}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors flex items-center space-x-2"
          >
            <Plus className="h-4 w-4" />
            <span>Add ASIN</span>
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
            <Check className="h-5 w-5 text-green-400" />
            <div>
              <h3 className="text-green-300 font-medium">Import Successful</h3>
              <p className="text-green-400 text-sm">{importSuccess}</p>
            </div>
          </div>
        </Card>
      )}

      {/* ASINs Table */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-750 border-b border-gray-700">
              <tr>
                <th className="px-3 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  {/* Empty header for image column */}
                </th>
                <th className="px-3 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Category - ASIN - Brand
                </th>
                <th className="px-3 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Title
                </th>
                <th className="px-3 py-4 text-center text-xs font-medium text-gray-400 uppercase tracking-wider">
                  AVG COG
                </th>
                <th className="px-3 py-4 text-center text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-3 py-4 text-center text-xs font-medium text-gray-400 uppercase tracking-wider">
                  BUNDLE
                </th>
                <th className="px-3 py-4 text-center text-xs font-medium text-gray-400 uppercase tracking-wider">
                  QTY
                </th>
                <th className="px-3 py-4 text-center text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Shipped
                </th>
                <th className="px-3 py-4 text-center text-xs font-medium text-gray-400 uppercase tracking-wider">
                  INV
                </th>
                <th className="px-3 py-4 text-center text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Transactions
                </th>
                <th className="px-3 py-4 text-center text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Delete
                </th>
              </tr>
            </thead>
            <tbody className="bg-gray-800 divide-y divide-gray-700">
              {asins.length === 0 ? (
                <tr>
                  <td colSpan={11} className="px-6 py-12 text-center">
                    <div className="text-gray-400">
                      <p className="text-lg mb-2">No ASINs found</p>
                      <p className="text-sm">Add your first ASIN to start tracking product performance</p>
                    </div>
                  </td>
                </tr>
              ) : (
                asins.map((asin) => {
                  const titleLines = formatTitleTwoLines(asin.title);
                  
                  return (
                    <tr key={asin.id} className="hover:bg-gray-750">
                      <td className="px-2 py-2 whitespace-nowrap">
                        <div className="w-10 h-10 bg-gray-700 rounded border border-gray-600 flex items-center justify-center overflow-hidden">
                          {asin.image_url ? (
                            <img
                              src={asin.image_url}
                              alt={asin.title || 'Product'}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                e.currentTarget.style.display = 'none';
                                e.currentTarget.nextElementSibling!.style.display = 'flex';
                              }}
                            />
                          ) : null}
                          <div className={`w-full h-full flex items-center justify-center ${asin.image_url ? 'hidden' : 'flex'}`}>
                            <Package className="h-5 w-5 text-gray-500" />
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap text-sm font-medium">
                        {editingId === asin.id ? (
                          <div className="space-y-2">
                            <select
                              value={editValues.category || ''}
                              onChange={(e) => setEditValues({...editValues, category: e.target.value})}
                              className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1 text-white text-sm"
                            >
                              <option value="Stock">Stock</option>
                              <option value="Other">Other</option>
                            </select>
                            <input
                              type="text"
                              value={editValues.brand || ''}
                              onChange={(e) => setEditValues({...editValues, brand: e.target.value})}
                              className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1 text-white text-sm"
                              placeholder="Brand"
                            />
                          </div>
                        ) : (
                          <button
                            onClick={() => handleEditASIN(asin)}
                            className="hover:text-blue-300 transition-colors text-left"
                            title={`[${asin.category}] - [${asin.asin}] - [${asin.brand || 'No Brand'}]`}
                          >
                            <div className="text-blue-400 text-xs">
                              [{asin.category || 'Stock'}] - [{truncateText(asin.asin, 11)}] - [{truncateText(asin.brand || 'No Brand', 15)}]
                            </div>
                          </button>
                        )}
                      </td>
                      <td className="px-3 py-2 text-gray-300 max-w-xs">
                        {editingId === asin.id ? (
                          <input
                            type="text"
                            value={editValues.title || ''}
                            onChange={(e) => setEditValues({...editValues, title: e.target.value})}
                            className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1 text-white text-sm"
                          />
                        ) : (
                          <div className="text-xs leading-tight" title={asin.title || 'No title'}>
                            <div>{titleLines.line1}</div>
                            {titleLines.line2 && <div>{titleLines.line2}</div>}
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-300 text-center">
                        <span className="text-sm">{formatCurrency(asin.averageBuyPrice)}</span>
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-300 text-center">
                        {editingId === asin.id ? (
                          <select
                            value={editValues.type || ''}
                            onChange={(e) => setEditValues({...editValues, type: e.target.value})}
                            className="bg-gray-700 border border-gray-600 rounded px-2 py-1 text-white text-sm"
                          >
                            <option value="Single">Single</option>
                            <option value="Bundle">Bundle</option>
                          </select>
                        ) : (
                          <span className="text-sm">{asin.type || 'Single'}</span>
                        )}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-300 text-center">
                        <span className={`text-sm ${(asin.type || 'Single') === 'Bundle' ? 'text-green-400' : 'text-gray-400'}`}>
                          {(asin.type || 'Single') === 'Bundle' ? 'Yes' : 'No'}
                        </span>
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-300 text-center">
                        <span className="text-sm">{asin.adjustedQuantity}</span>
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-300 text-center">
                        <div className="flex items-center justify-center space-x-2">
                          <span className="text-sm">{asin.shipped}</span>
                          <button
                            onClick={() => setShowShipModal(asin.id)}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-2 py-1 rounded text-xs flex items-center space-x-1"
                          >
                            <Package className="h-3 w-3" />
                            <span>Ship</span>
                          </button>
                        </div>
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-300 text-center">
                        <span className="text-sm">{asin.stored}</span>
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-300 text-center">
                        <button
                          onClick={() => handleViewTransactions(asin.asin)}
                          className="bg-green-600 hover:bg-green-700 text-white px-2 py-1 rounded text-xs flex items-center space-x-1 mx-auto"
                        >
                          <Eye className="h-3 w-3" />
                          <span>View</span>
                        </button>
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-300 text-center">
                        {editingId === asin.id ? (
                          <div className="flex items-center justify-center space-x-1">
                            <button
                              onClick={() => handleSave(asin.id)}
                              className="text-green-400 hover:text-green-300 p-1"
                            >
                              <Save className="h-3 w-3" />
                            </button>
                            <button
                              onClick={handleCancel}
                              className="text-red-400 hover:text-red-300 p-1"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-center">                          
                            {deletingId === asin.id ? (
                              <div className="flex items-center space-x-1">
                                <button
                                  onClick={() => handleDeleteClick(asin.id)}
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
                                onClick={() => handleDeleteClick(asin.id)}
                                className="text-red-400 hover:text-red-300 p-1"
                                title="Delete ASIN"
                              >
                                <Trash2 className="h-3 w-3" />
                              </button>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Ship Modal */}
      {showShipModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 w-96">
            <h3 className="text-lg font-semibold text-white mb-4">Ship Items</h3>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-400 mb-2">
                Amount to Ship
              </label>
              <input
                type="number"
                value={shipAmount}
                onChange={(e) => setShipAmount(parseInt(e.target.value) || 0)}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white"
                min="0"
                placeholder="Enter amount to ship"
              />
            </div>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowShipModal(null);
                  setShipAmount(0);
                }}
                className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  const asin = asins.find(a => a.id === showShipModal);
                  if (asin) {
                    handleShip(asin.id, asin.shipped);
                  }
                }}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ASIN Transactions Modal */}
      {showTransactionsModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-lg shadow-2xl w-full max-w-4xl max-h-[80vh] overflow-y-auto border border-gray-700">
            <div className="flex items-center justify-between p-6 border-b border-gray-700">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-green-600 rounded-lg">
                  <ShoppingCart className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-white">Transactions for ASIN</h2>
                  <p className="text-sm text-gray-400">{showTransactionsModal}</p>
                </div>
              </div>
              <button
                onClick={() => setShowTransactionsModal(null)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="p-6">
              {loadingTransactions ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2"></div>
                  <p className="text-gray-400">Loading transactions...</p>
                </div>
              ) : asinTransactions.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  <Package className="h-12 w-12 mx-auto mb-3 text-gray-500" />
                  <p className="text-lg mb-2">No transactions found</p>
                  <p className="text-sm">This ASIN hasn't been used in any transactions yet</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {asinTransactions.map((transaction) => (
                    <div 
                      key={transaction.id} 
                      className="bg-gray-750 rounded-lg p-4 hover:bg-gray-700 transition-colors cursor-pointer"
                      onClick={() => handleTransactionClick(transaction)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <div className="text-blue-400 font-mono text-sm">
                            {transaction.id.slice(0, 8).toUpperCase()}
                          </div>
                          <div>
                            <p className="text-white font-medium">
                              {transaction.supplier?.name || 'Unknown Supplier'}
                            </p>
                            <p className="text-gray-400 text-sm">
                              {formatDate(transaction.ordered_date)} • Status: {transaction.status}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-white font-medium">{formatCurrency(transaction.totalCost)}</p>
                          <p className={`text-sm ${transaction.estimatedProfit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                            {formatCurrency(transaction.estimatedProfit)} ({transaction.roi.toFixed(1)}% ROI)
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 w-96 border border-gray-700">
            <h3 className="text-lg font-semibold text-white mb-4 text-center">Delete ASIN</h3>
            <div className="text-center mb-6">
              <p className="text-gray-300 mb-2">
                Delete <span className="font-mono text-blue-400">{asins.find(a => a.id === showDeleteModal)?.asin}</span>
              </p>
              <p className="text-gray-300">
                {asins.find(a => a.id === showDeleteModal)?.title ? 
                  truncateText(asins.find(a => a.id === showDeleteModal)!.title!, 32) : 
                  'No title'
                }
              </p>
            </div>
            <div className="flex justify-center space-x-3">
              <button
                onClick={() => setShowDeleteModal(null)}
                className="px-6 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
              >
                Close
              </button>
              <button
                onClick={handleDeleteConfirm}
                className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ASIN Modal */}
      <ASINModal
        isOpen={showASINModal}
        onClose={() => setShowASINModal(false)}
        onSuccess={handleModalSuccess}
        asin={editingASIN}
      />

      {/* Transaction Modal */}
      <TransactionModal
        isOpen={showTransactionModal}
        onClose={() => setShowTransactionModal(false)}
        onSuccess={handleTransactionModalSuccess}
        transaction={selectedTransaction}
      />
    </div>
  );
};

export default ASINs;