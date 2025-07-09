import React, { useState } from 'react';
import { Plus, Edit, Save, X, Package, Trash2, Check, Eye, ShoppingCart, Upload, Download, AlertCircle } from 'lucide-react';
import Card from '../components/shared/Card';
import ASINModal from '../components/modals/ASINModal';
import TransactionModal from '../components/modals/TransactionModal';
import { useASINsWithMetrics } from '../hooks/useData';
import { updateASIN, deleteASIN, getTransactionsByASIN, createASIN, getAllASINs, getASINsByCategory, createASINPricingHistory } from '../services/database';
import { getTransactionItems, getTransactions } from '../services/database';
import { formatCurrency, truncateText, formatDate } from '../utils/formatters';
import { TransactionWithMetrics } from '../types/database';
import { parseASINCSV, downloadCSVTemplate, importASINsWithUpdate } from '../utils/csvHelpers';
import { downloadASINExport, generateASINExportCSVWithPricing } from '../utils/asinHelpers';
import { ASINWithMetrics } from '../types/database';

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
  const [importData, setImportData] = useState<any[]>([]);
  const [importError, setImportError] = useState<string | null>(null);
  const [importSuccess, setImportSuccess] = useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // Filter states
  const [showIncompleteOnly, setShowIncompleteOnly] = useState(false);
  const [showOtherCategory, setShowOtherCategory] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // State for displaying ASINs
  const [displayAsins, setDisplayAsins] = useState<ASINWithMetrics[]>([]);

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

  const handleTransactionClick = (transaction: TransactionWithMetrics) => {
    setSelectedTransaction(transaction);
    setShowTransactionModal(true);
    setShowTransactionsModal(null);
  };

  // Load ASINs based on current filter
  const loadASINs = async () => {
    try {
      let asinData: ASINWithMetrics[] = [];
      
      if (showOtherCategory) {
        // Load Other category ASINs with metrics calculation
        const otherAsins = await getASINsByCategory('Other');
        const [transactionItems, transactions] = await Promise.all([
          getTransactionItems(),
          getTransactions()
        ]);
        
        asinData = otherAsins.map(asin => {
          const asinItems = transactionItems.filter(item => item.asin === asin.asin);
          
          // Calculate total cost and quantity for this ASIN
          const totalCost = asinItems.reduce((sum, item) => sum + (item.buy_price * item.quantity), 0);
          const totalQuantity = asinItems.reduce((sum, item) => sum + item.quantity, 0);
          
          // Calculate average buy price (COG)
          const averageBuyPrice = totalQuantity > 0 ? totalCost / totalQuantity : 0;
          
          return {
            ...asin,
            averageBuyPrice,
            totalQuantity,
            adjustedQuantity: 0, // Other category doesn't track inventory
            stored: 0
          };
        });
      } else {
        // Use existing Stock ASINs
        asinData = asins;
      }
      
      setDisplayAsins(asinData);
    } catch (err) {
      console.error('Failed to load ASINs:', err);
    }
  };

  // Load ASINs when filters change
  React.useEffect(() => {
    if (!loading) {
      loadASINs();
    }
  }, [showOtherCategory, asins, loading]);

  // Filter ASINs based on search term and incomplete filter
  const filteredAsins = displayAsins.filter(asin => {
    const matchesSearch = asin.asin.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (asin.title && asin.title.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (asin.brand && asin.brand.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesIncomplete = showIncompleteOnly ? 
      (!asin.title || asin.title.trim() === '' || asin.title === 'No title' || 
       !asin.image_url || asin.image_url.trim() === '' || asin.image_url === 'No image') : true;

    return matchesSearch && matchesIncomplete;
  });

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
      const reader = new FileReader();
      
      reader.onload = async (event) => {
        try {
          const csvContent = event.target?.result as string;
          console.log('CSV content length:', csvContent.length);
          const { data, errors } = parseASINCSV(csvContent);
          console.log('Parsed data:', data.length, 'items');
          
          if (errors.length > 0) {
            setImportError(`CSV parsing errors: ${errors.join(', ')}`);
            setImporting(false);
            return;
          }
          
          if (data.length === 0) {
            setImportError('No valid data found in the CSV file. Please check the format and try again.');
            setImporting(false);
            return;
          }
          
          setImportData(data);
          
          // Now that we have the data, we can proceed with the import
          await handleImportSubmit(data);
        } catch (error) {
          setImportError(error instanceof Error ? error.message : 'Failed to parse CSV');
          setImporting(false);
        }
      };
      
      reader.onerror = () => {
        setImportError('Failed to read file');
        setImporting(false);
      };
      
      reader.readAsText(file);
    } catch (error) {
      setImportError(error instanceof Error ? error.message : 'Failed to process file');
      setImporting(false);
    }
  };

  const handleImportSubmit = async (dataToImport?: any[]) => {
    const dataArray = dataToImport || importData;
    
    if (!dataArray || dataArray.length === 0) {
      setImportError('No data to import');
      setImporting(false);
      return;
    }
    
    try {
      // Use the new import function that handles updates
      const result = await importASINsWithUpdate(dataArray);
      
      setImportSuccess(`Successfully imported ${result.imported} ASINs and updated ${result.updated} existing ASINs. ${result.skipped} skipped due to errors.`);
      
      // Refresh ASINs list
      refetch();
    } catch (error) {
      setImportError(error instanceof Error ? error.message : 'Import failed');
    } finally {
      setImporting(false); 
    }
  };

  // Legacy import function (kept for reference)
  const handleLegacyImportSubmit = async () => {
    if (!importData) return;
    
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
          // Create or update the ASIN
          const createdAsin = await createASIN({
            asin: asinData.asin,
            title: asinData.title,
            brand: asinData.brand,
            image_url: asinData.image_url,
            type: asinData.type,
            pack: asinData.pack,
            category: asinData.category
          });
          importedCount++;
          
          // If pricing data is provided, create pricing history entry
          if (asinData.has_pricing) {
            await createASINPricingHistory({ asin: asinData.asin, buy_price: asinData.buy_price, sell_price: asinData.sell_price, est_fees: asinData.est_fee });
          }
        } catch (err) {
          console.error(`Failed to import ASIN ${asinData.asin}:`, err);
          skippedCount++;
        }
      }

      setImportSuccess(`Successfully imported ${importedCount} ASINs. ${skippedCount} skipped due to duplicates or errors.`);
      loadASINs();
    } catch (err) {
      setImportError(err instanceof Error ? err.message : 'Failed to import CSV file');
    } finally {
      setImporting(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Export functionality
  const handleExportClick = () => {
    downloadASINExport(filteredAsins);
  };

  // Helper function to format title into 2 lines, 64 chars each
  const formatTitleTwoLines = (title: string | null): { line1: string; line2: string } => {
    if (!title || title === 'No title') {
      return { line1: 'No title', line2: '' };
    }
    
    const truncated = truncateText(title, 128);
    if (truncated.length <= 64) {
      return { line1: truncated, line2: '' };
    }
    
    // Find a good break point around 64 characters
    let breakPoint = 64;
    while (breakPoint > 0 && truncated[breakPoint] !== ' ') {
      breakPoint--;
    }
    
    if (breakPoint === 0) breakPoint = 64; // If no space found, break at 64
    
    const line1 = truncated.substring(0, breakPoint).trim();
    const line2 = truncated.substring(breakPoint).trim();
    
    return { line1, line2 };
  };

  const handleModalSuccess = () => {
    loadASINs();
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
        loadASINs();
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

  const handleTransactionModalSuccess = () => {
    loadASINs();
    // Reload transactions for the current ASIN if modal is still open
    if (showTransactionsModal) {
      handleViewTransactions(showTransactionsModal);
    }
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
            <button 
              onClick={() => setShowIncompleteOnly(!showIncompleteOnly)}
              className={`px-4 py-2 rounded-lg transition-colors ${
                showIncompleteOnly 
                  ? 'bg-orange-600 hover:bg-orange-700 text-white' 
                  : 'bg-gray-700 hover:bg-gray-600 text-white'
              }`}
            >
              Incomplete
            </button>
            <button 
              onClick={() => setShowOtherCategory(!showOtherCategory)}
              className={`px-4 py-2 rounded-lg transition-colors ${
                showOtherCategory 
                  ? 'bg-purple-600 hover:bg-purple-700 text-white' 
                  : 'bg-gray-700 hover:bg-gray-600 text-white'
              }`}
            >
              Other
            </button>
            <button 
              onClick={downloadCSVTemplate}
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors flex items-center space-x-2"
            >
              <Download className="h-4 w-4" />
              <span>Template</span>
            </button>
            <button 
              onClick={handleExportClick}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors flex items-center space-x-2"
            >
              <Download className="h-4 w-4" />
              <span>Export</span>
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
            <button 
              onClick={() => setShowIncompleteOnly(!showIncompleteOnly)}
              className={`px-4 py-2 rounded-lg transition-colors ${
                showIncompleteOnly 
                  ? 'bg-orange-600 hover:bg-orange-700 text-white' 
                  : 'bg-gray-700 hover:bg-gray-600 text-white'
              }`}
            >
              Incomplete
            </button>
            <button 
              onClick={() => setShowOtherCategory(!showOtherCategory)}
              className={`px-4 py-2 rounded-lg transition-colors ${
                showOtherCategory 
                  ? 'bg-purple-600 hover:bg-purple-700 text-white' 
                  : 'bg-gray-700 hover:bg-gray-600 text-white'
              }`}
            >
              Other
            </button>
            <button 
              onClick={downloadCSVTemplate}
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors flex items-center space-x-2"
            >
              <Download className="h-4 w-4" />
              <span>Template</span>
            </button>
            <button 
              onClick={handleExportClick}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors flex items-center space-x-2"
            >
              <Download className="h-4 w-4" />
              <span>Export</span>
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
          <button 
            onClick={() => setShowIncompleteOnly(!showIncompleteOnly)}
            className={`px-4 py-2 rounded-lg transition-colors ${
              showIncompleteOnly 
                ? 'bg-orange-600 hover:bg-orange-700 text-white' 
                : 'bg-gray-700 hover:bg-gray-600 text-white'
            }`}
          >
            Incomplete
          </button>
          <button 
            onClick={() => setShowOtherCategory(!showOtherCategory)}
            className={`px-4 py-2 rounded-lg transition-colors ${
              showOtherCategory 
                ? 'bg-purple-600 hover:bg-purple-700 text-white' 
                : 'bg-gray-700 hover:bg-gray-600 text-white'
            }`}
          >
            Other
          </button>
          <button 
            onClick={downloadCSVTemplate}
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors flex items-center space-x-2"
          >
            <Download className="h-4 w-4" />
            <span>Template</span>
          </button>
          <button 
            onClick={handleExportClick}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors flex items-center space-x-2"
          >
            <Download className="h-4 w-4" />
            <span>Export</span>
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

      {/* Search Bar */}
      <Card className="p-4">
        <div className="relative">
          <input
            type="text"
            placeholder="Search ASINs by ASIN, title, or brand..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-300"
          />
        </div>
      </Card>

      {/* Filter Status */}
      {showIncompleteOnly && (
        <Card className="p-4 bg-orange-900/20 border-orange-600/30">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <AlertCircle className="h-5 w-5 text-orange-400" />
              <div>
                <h3 className="text-orange-300 font-medium">Showing Incomplete Stock ASINs</h3>
                <p className="text-orange-400 text-sm">
                  Displaying {filteredAsins.length} ASINs missing title or image URL
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowIncompleteOnly(false)}
              className="text-orange-400 hover:text-orange-300 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </Card>
      )}

      {/* Other Category Status */}
      {showOtherCategory && (
        <Card className="p-4 bg-purple-900/20 border-purple-600/30">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Package className="h-5 w-5 text-purple-400" />
              <div>
                <h3 className="text-purple-300 font-medium">Showing Other Category ASINs</h3>
                <p className="text-purple-400 text-sm">
                  Displaying {filteredAsins.length} non-stock ASINs
                </p>
              </div>
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
                  
                </th>
                <th className="px-3 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  ASIN
                </th>
                <th className="px-3 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Title
                </th>
                <th className="px-3 py-4 text-center text-xs font-medium text-gray-400 uppercase tracking-wider">
                  AVG COG
                </th>
                {!showOtherCategory && (
                  <>
                <th className="px-3 py-4 text-center text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Type
                </th>
                    <th className="px-3 py-4 text-center text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Bundle
                    </th>
                    <th className="px-3 py-4 text-center text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Total QTY
                    </th>
                    <th className="px-3 py-4 text-center text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Ordered
                    </th>
                    <th className="px-3 py-4 text-center text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Inv
                    </th>
                    <th className="px-3 py-4 text-center text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Shipped
                    </th>
                    <th className="px-3 py-4 text-center text-xs font-medium text-gray-400 uppercase tracking-wider">
                      TXNs
                    </th>
                  </>
                )}
                {showOtherCategory && (
                  <th className="px-3 py-4 text-center text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Category
                  </th>
                )}
                <th className="px-3 py-4 text-center text-xs font-medium text-gray-400 uppercase tracking-wider">
                  
                </th>
              </tr>
            </thead>
            <tbody className="bg-gray-800 divide-y divide-gray-700">
              {filteredAsins.length === 0 ? (
                <tr>
                  <td colSpan={showOtherCategory ? 6 : 12} className="px-6 py-12 text-center">
                    <div className="text-gray-400">
                      {showIncompleteOnly ? (
                        <>
                          <p className="text-lg mb-2">No incomplete ASINs found</p>
                          <p className="text-sm">All your Stock ASINs have complete title and image information</p>
                        </>
                      ) : showOtherCategory ? (
                        <>
                          <p className="text-lg mb-2">No Other category ASINs found</p>
                          <p className="text-sm">Other category ASINs will appear here when you add them</p>
                        </>
                      ) : (
                        <>
                          <p className="text-lg mb-2">No ASINs found</p>
                          <p className="text-sm">Add your first ASIN to start tracking product performance</p>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                filteredAsins.map((asin) => {
                  const titleLines = formatTitleTwoLines(asin.title);
                  
                  // Calculate ordered quantity (items in transactions that are not complete)
                  const orderedQuantity = asin.totalQuantity - asin.adjustedQuantity;
                  
                  // Calculate inventory (items in complete transactions minus shipped)
                  const inventoryQuantity = Math.max(0, asin.adjustedQuantity - asin.shipped);
                  
                  // Calculate total quantity (ordered + inventory + shipped)
                  const totalQuantity = orderedQuantity + inventoryQuantity + asin.shipped;
                  
                  return (
                    <tr key={asin.id} className="hover:bg-gray-750">
                      <td className="px-2 py-2 whitespace-nowrap">
                        <div className="w-16 h-16 bg-gray-700 rounded border border-gray-600 flex items-center justify-center overflow-hidden">
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
                            title={`${asin.asin}`}
                          >
                            <div className="text-blue-400 text-xs">
                              {`${asin.asin}`}
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
                        <span className="text-sm">{formatCurrency(asin.averageBuyPrice || 0)}</span>
                      </td>
                      {!showOtherCategory && (
                        <>
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
                        <span className="text-sm">{totalQuantity}</span>
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-300 text-center">
                        <span className="text-sm">{orderedQuantity}</span>
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-300 text-center">
                        <span className="text-sm">{inventoryQuantity}</span>
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-300 text-center">
                        <div className="flex items-center justify-center space-x-2">
                          <span className="text-sm">{asin.shipped || 0}</span>
                          <button
                            onClick={() => setShowShipModal(asin.id)}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-2 py-1 rounded text-xs flex items-center space-x-1"
                          >
                            <Package className="h-3 w-3" />
                            <span>Ship</span>
                          </button>
                        </div>
                      </td>
                      <td className="px-3 py-4 text-center text-xs font-medium text-gray-400 uppercase tracking-wider">
                        <button
                          onClick={() => handleViewTransactions(asin.asin)}
                          className="bg-green-600 hover:bg-green-700 text-white px-2 py-1 rounded text-xs flex items-center space-x-1 mx-auto"
                        >
                          <Eye className="h-3 w-3" />
                          <span>View</span>
                        </button>
                      </td>
                        </>
                      )}
                      {showOtherCategory && (
                        <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-300 text-center">
                          <span className="text-sm text-purple-400">{asin.category}</span>
                        </td>
                      )}
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
                  const asin = filteredAsins.find(a => a.id === showShipModal);
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
                Delete <span className="font-mono text-blue-400">{filteredAsins.find(a => a.id === showDeleteModal)?.asin}</span>
              </p>
              <p className="text-gray-300">
                {filteredAsins.find(a => a.id === showDeleteModal)?.title ? 
                  truncateText(filteredAsins.find(a => a.id === showDeleteModal)!.title!, 48) : 
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