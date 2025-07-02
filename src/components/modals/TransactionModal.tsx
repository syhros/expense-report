import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, Calendar, Building2, CreditCard, Package, Upload, FileText, ChevronLeft, ChevronRight, ZoomIn, Loader2, Edit, ChevronDown, User } from 'lucide-react';
import { createTransaction, updateTransaction, getSuppliers, createTransactionItem, updateTransactionItem, deleteTransactionItem, getTransactionItems, createGeneralLedgerTransaction } from '../../services/database';
import { uploadReceipt, getReceiptUrl, deleteReceipt, listReceipts } from '../../services/storage';
import { useSuppliers, useCategories, useUniqueDirectors } from '../../hooks/useData';
import TransactionItemModal from './TransactionItemModal';
import { Transaction, TransactionItemDisplay, ASIN } from '../../types/database';
import { formatCurrency } from '../../utils/formatters';

interface TransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  transaction?: Transaction | null;
}

interface ReceiptFile {
  id: string;
  file?: File;
  url?: string;
  name: string;
  uploading?: boolean;
  error?: string;
}

const TransactionModal: React.FC<TransactionModalProps> = ({ 
  isOpen, 
  onClose, 
  onSuccess, 
  transaction 
}) => {
  const { suppliers } = useSuppliers();
  const { directors } = useUniqueDirectors();
  const [formData, setFormData] = useState({
    ordered_date: '',
    delivery_date: '',
    supplier_id: '',
    po_number: '',
    category: 'Stock',
    payment_method: 'AMEX Plat',
    status: 'pending',
    shipping_cost: 0,
    notes: ''
  });

  const [items, setItems] = useState<TransactionItemDisplay[]>([]);
  const [originalItems, setOriginalItems] = useState<TransactionItemDisplay[]>([]);
  const [receipts, setReceipts] = useState<ReceiptFile[]>([]);
  const [showItemModal, setShowItemModal] = useState(false);
  const [editingItem, setEditingItem] = useState<TransactionItemDisplay | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentReceiptIndex, setCurrentReceiptIndex] = useState(0);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [selectedDirectorsLoan, setSelectedDirectorsLoan] = useState<string>('No');

  // Simplified categories for purchase orders
  const purchaseOrderCategories = ['Stock', 'Operational Equipment', 'Office Supplies', 'Vehicle Maintenance', 'Misc.'];

  useEffect(() => {
    if (transaction) {
      setFormData({
        ordered_date: transaction.ordered_date || '',
        delivery_date: transaction.delivery_date || '',
        supplier_id: transaction.supplier_id || '',
        po_number: transaction.po_number || '',
        category: transaction.category || 'Stock',
        payment_method: transaction.payment_method || 'AMEX Plat',
        status: transaction.status || 'pending',
        shipping_cost: transaction.shipping_cost || 0,
        notes: transaction.notes || ''
      });
      loadTransactionItems(transaction.id);
      loadTransactionReceipts(transaction.id);
    } else {
      resetForm();
    }
    setError(null);
  }, [transaction, isOpen]);

  const resetForm = () => {
    setFormData({
      ordered_date: '',
      delivery_date: '',
      supplier_id: '',
      po_number: '',
      category: 'Stock',
      payment_method: 'AMEX Plat',
      status: 'pending',
      shipping_cost: 0,
      notes: ''
    });
    setItems([]);
    setOriginalItems([]);
    setReceipts([]);
    setCurrentReceiptIndex(0);
    setSelectedDirectorsLoan('No');
  };

  const loadTransactionItems = async (transactionId: string) => {
    try {
      const transactionItems = await getTransactionItems(transactionId);
      const itemsWithDetails = transactionItems.map(item => {
        // Extract ASIN details from the joined data
        const asinDetails = item.asin_details || null;
        
        return {
          ...item,
          asin_details: asinDetails,
          totalCost: item.buy_price * item.quantity, // This is the item's COG
          estimatedProfit: (item.sell_price * item.quantity) - (item.buy_price * item.quantity) - (item.est_fees * item.quantity),
          roi: (item.buy_price * item.quantity) > 0 ? ((item.sell_price * item.quantity) - (item.buy_price * item.quantity) - (item.est_fees * item.quantity)) / (item.buy_price * item.quantity) * 100 : 0,
          displayQuantity: asinDetails?.type === 'Bundle' && asinDetails.pack > 1 
            ? Math.floor(item.quantity / asinDetails.pack) 
            : item.quantity
        };
      });
      setItems(itemsWithDetails);
      setOriginalItems([...itemsWithDetails]); // Store original items for comparison
    } catch (err) {
      console.error('Failed to load transaction items:', err);
    }
  };

  const loadTransactionReceipts = async (transactionId: string) => {
    try {
      const receiptPaths = await listReceipts(transactionId);
      const receiptFiles: ReceiptFile[] = receiptPaths.map((path, index) => ({
        id: `existing-${index}`,
        url: getReceiptUrl(path),
        name: path.split('/').pop() || 'receipt'
      }));
      setReceipts(receiptFiles);
    } catch (err) {
      console.error('Failed to load receipts:', err);
    }
  };

  const handleFileUpload = async (files: FileList) => {
    const validFiles = Array.from(files).filter(file => {
      const validTypes = ['image/jpeg', 'image/png', 'application/pdf'];
      return validTypes.includes(file.type) && file.size <= 10 * 1024 * 1024; // 10MB limit
    });

    if (validFiles.length === 0) {
      setError('Please select valid JPG, PNG, or PDF files under 10MB');
      return;
    }

    const newReceipts: ReceiptFile[] = validFiles.map(file => ({
      id: Math.random().toString(36).substr(2, 9),
      file,
      name: file.name,
      uploading: true
    }));

    setReceipts(prev => [...prev, ...newReceipts]);

    // Upload files if we have a transaction ID
    if (transaction?.id) {
      for (const receipt of newReceipts) {
        try {
          if (receipt.file) {
            const url = await uploadReceipt(transaction.id, receipt.file);
            setReceipts(prev => prev.map(r => 
              r.id === receipt.id 
                ? { ...r, url, uploading: false }
                : r
            ));
          }
        } catch (err) {
          setReceipts(prev => prev.map(r => 
            r.id === receipt.id 
              ? { ...r, uploading: false, error: 'Upload failed' }
              : r
          ));
        }
      }
    }
  };

  const removeReceipt = async (receiptId: string) => {
    const receipt = receipts.find(r => r.id === receiptId);
    if (receipt?.url && transaction?.id) {
      try {
        await deleteReceipt(receipt.url);
      } catch (err) {
        console.error('Failed to delete receipt:', err);
      }
    }
    setReceipts(prev => prev.filter(r => r.id !== receiptId));
    if (currentReceiptIndex >= receipts.length - 1) {
      setCurrentReceiptIndex(Math.max(0, receipts.length - 2));
    }
  };

  const handlePreviewClick = (receipt: ReceiptFile) => {
    if (receipt.url) {
      setPreviewUrl(receipt.url);
      setShowPreviewModal(true);
    } else if (receipt.file) {
      const url = URL.createObjectURL(receipt.file);
      setPreviewUrl(url);
      setShowPreviewModal(true);
    }
  };

  const renderReceiptThumbnail = (receipt: ReceiptFile, index: number) => {
    if (receipt.uploading) {
      return (
        <div className="w-48 h-48 bg-gray-700/50 backdrop-blur-sm border border-gray-600/30 rounded-xl flex items-center justify-center">
          <Loader2 className="h-8 w-8 text-blue-400 animate-spin" />
        </div>
      );
    }

    if (receipt.error) {
      return (
        <div className="w-48 h-48 bg-red-900/20 backdrop-blur-sm border border-red-600/30 rounded-xl flex items-center justify-center">
          <span className="text-red-400 text-sm text-center p-4">{receipt.error}</span>
        </div>
      );
    }

    const imageUrl = receipt.url || (receipt.file ? URL.createObjectURL(receipt.file) : '');
    const isPdf = receipt.name.toLowerCase().endsWith('.pdf');

    return (
      <div 
        key={receipt.id}
        className="relative w-48 h-48 bg-gray-800/50 backdrop-blur-sm border border-gray-600/30 rounded-xl overflow-hidden cursor-pointer group hover:scale-102 transition-all duration-300 flex-shrink-0"
        onClick={() => handlePreviewClick(receipt)}
      >
        {isPdf ? (
          <div className="w-full h-full flex flex-col items-center justify-center p-4">
            <FileText className="h-16 w-16 text-red-400 mb-2" />
            <span className="text-white text-sm text-center truncate w-full">{receipt.name}</span>
          </div>
        ) : (
          <img 
            src={imageUrl} 
            alt={receipt.name}
            className="w-full h-full object-cover"
          />
        )}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all duration-300 flex items-center justify-center">
          <ZoomIn className="h-8 w-8 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            removeReceipt(receipt.id);
          }}
          className="absolute top-2 right-2 p-1 bg-red-600/80 backdrop-blur-sm rounded-full text-white hover:bg-red-700 transition-colors duration-300"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    );
  };

  const isValidUUID = (id: string): boolean => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(id);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Confirmation for Director's Loan
    if (selectedDirectorsLoan !== 'No') {
      const totalCost = items.reduce((sum, item) => sum + item.totalCost, 0) + formData.shipping_cost;
      const confirmed = window.confirm(
        `Are you sure you want to allocate this purchase order (${formatCurrency(totalCost)}) as a Director's Loan from ${selectedDirectorsLoan}?`
      );
      if (!confirmed) {
        return;
      }
    }
    
    setLoading(true);
    setError(null);

    try {
      let savedTransaction;
      
      if (transaction) {
        savedTransaction = await updateTransaction(transaction.id, formData);
        
        // Handle transaction items for existing transaction
        const originalItemIds = new Set(originalItems.map(item => item.id));
        const currentItemIds = new Set(items.filter(item => isValidUUID(item.id)).map(item => item.id));
        
        // Update existing items
        for (const item of items) {
          if (item.id && isValidUUID(item.id) && originalItemIds.has(item.id)) {
            await updateTransactionItem(item.id, {
              asin: item.asin,
              quantity: item.quantity,
              buy_price: item.buy_price,
              sell_price: item.sell_price,
              est_fees: item.est_fees
            });
          }
        }
        
        // Create new items (those with temporary IDs)
        for (const item of items) {
          if (!item.id || !isValidUUID(item.id)) {
            await createTransactionItem({
              transaction_id: savedTransaction.id,
              asin: item.asin,
              quantity: item.quantity,
              buy_price: item.buy_price,
              sell_price: item.sell_price,
              est_fees: item.est_fees || 0
            });
          }
        }
        
        // Delete items that were removed (present in original but not in current)
        for (const originalItem of originalItems) {
          if (!currentItemIds.has(originalItem.id)) {
            await deleteTransactionItem(originalItem.id);
          }
        }
      } else {
        savedTransaction = await createTransaction(formData);
        
        // Create new items for new transaction
        for (const item of items) {
          await createTransactionItem({
            transaction_id: savedTransaction.id,
            asin: item.asin,
            quantity: item.quantity,
            buy_price: item.buy_price,
            sell_price: item.sell_price,
            est_fees: item.est_fees || 0
          });
        }

        // Upload receipts for new transaction
        for (const receipt of receipts) {
          if (receipt.file && !receipt.url) {
            try {
              await uploadReceipt(savedTransaction.id, receipt.file);
            } catch (err) {
              console.error('Failed to upload receipt:', err);
            }
          }
        }
      }

      // Create Director's Loan entry if selected
      if (selectedDirectorsLoan !== 'No') {
        const totalCost = items.reduce((sum, item) => sum + item.totalCost, 0) + formData.shipping_cost;
        const reference = `Director's Loan Received from ${selectedDirectorsLoan} for PO ${savedTransaction.po_number || savedTransaction.id.slice(0, 8).toUpperCase()}`;
        
        await createGeneralLedgerTransaction({
          date: formData.ordered_date || new Date().toISOString().split('T')[0],
          category: 'Director\'s loans',
          type: 'Loan Received',
          amount: totalCost, // Positive amount for loan received
          payment_method: 'Tide',
          director_name: selectedDirectorsLoan,
          reference: reference,
          status: 'pending'
        });
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
    setFormData(prev => ({ 
      ...prev, 
      [name]: name === 'shipping_cost' ? parseFloat(value) || 0 : value 
    }));
  };

  const handleAddItem = () => {
    setEditingItem(null);
    setShowItemModal(true);
  };

  const handleEditItem = (item: TransactionItemDisplay) => {
    setEditingItem(item);
    setShowItemModal(true);
  };

  const handleItemSuccess = (itemData: Omit<TransactionItemDisplay, 'id' | 'created_at' | 'transaction_id'>) => {
    if (editingItem) {
      setItems(prev => prev.map(item => 
        item.id === editingItem.id ? { ...editingItem, ...itemData } : item
      ));
    } else {
      const newItem: TransactionItemDisplay = {
        id: Math.random().toString(36).substr(2, 9),
        transaction_id: transaction?.id || '',
        created_at: new Date().toISOString(),
        ...itemData
      };
      setItems(prev => [...prev, newItem]);
    }
  };

  const handleDeleteItem = (itemId: string) => {
    setItems(prev => prev.filter(item => item.id !== itemId));
  };

  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
  const totalCost = items.reduce((sum, item) => sum + item.totalCost, 0) + formData.shipping_cost;
  const totalProfit = items.reduce((sum, item) => sum + item.estimatedProfit, 0);
  const totalROI = totalCost > 0 ? (totalProfit / totalCost) * 100 : 0;

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div className="bg-gray-800/90 backdrop-blur-xl border border-gray-600/30 rounded-2xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-700/50">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-600/80 backdrop-blur-sm rounded-xl">
                <Package className="h-5 w-5 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-white">
                  {transaction ? 'Edit Purchase Order' : 'Add Purchase Order'}
                </h2>
                <p className="text-sm text-gray-400">{formData.po_number || 'New Purchase Order'}</p>
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

            {/* Row 1: Ordered Date, Delivery Date, Status, Payment Method */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <div className="relative">
                <div className="relative border-2 border-blue-500/50 rounded-xl bg-gray-800/50 backdrop-blur-sm">
                  <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
                    <Calendar className="h-5 w-5 text-blue-400" />
                  </div>
                  <input
                    type="date"
                    id="ordered_date"
                    name="ordered_date"
                    value={formData.ordered_date}
                    onChange={handleChange}
                    className="w-full pl-12 pr-4 py-4 bg-transparent text-white placeholder-transparent focus:outline-none"
                    placeholder="Ordered Date"
                  />
                  <label
                    htmlFor="ordered_date"
                    className="absolute left-10 -top-2.5 bg-gray-800 px-2 text-sm font-medium text-blue-400"
                  >
                    Ordered Date
                  </label>
                </div>
              </div>

              <div className="relative">
                <div className="relative border-2 border-blue-500/50 rounded-xl bg-gray-800/50 backdrop-blur-sm">
                  <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
                    <Calendar className="h-5 w-5 text-blue-400" />
                  </div>
                  <input
                    type="date"
                    id="delivery_date"
                    name="delivery_date"
                    value={formData.delivery_date}
                    onChange={handleChange}
                    className="w-full pl-12 pr-4 py-4 bg-transparent text-white placeholder-transparent focus:outline-none"
                    placeholder="Delivery Date"
                  />
                  <label
                    htmlFor="delivery_date"
                    className="absolute left-10 -top-2.5 bg-gray-800 px-2 text-sm font-medium text-blue-400"
                  >
                    Delivery Date
                  </label>
                </div>
              </div>

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
                    <option value="ordered" className="bg-gray-800 text-white">Ordered</option>
                    <option value="partially delivered" className="bg-gray-800 text-white">Partially Delivered</option>
                    <option value="fully received" className="bg-gray-800 text-white">Fully Received</option>
                    <option value="collected" className="bg-gray-800 text-white">Collected</option>
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
                    className="w-full pl-12 pr-4 py-4 bg-transparent text-white focus:outline-none appearance-none"
                  >
                    <option value="AMEX Plat" className="bg-gray-800 text-white">AMEX Plat</option>
                    <option value="AMEX Gold" className="bg-gray-800 text-white">AMEX Gold</option>
                    <option value="Tide" className="bg-gray-800 text-white">Tide</option>
                    <option value="Halifax" className="bg-gray-800 text-white">Halifax</option>
                    <option value="Revolut" className="bg-gray-800 text-white">Revolut</option>
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

            {/* Row 2: Supplier, Category, PO Number, Shipping Cost, Directors Loan */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
              <div className="relative">
                <div className="relative border-2 border-blue-500/50 rounded-xl bg-gray-800/50 backdrop-blur-sm">
                  <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
                    <Building2 className="h-5 w-5 text-blue-400" />
                  </div>
                  <select
                    id="supplier_id"
                    name="supplier_id"
                    value={formData.supplier_id}
                    onChange={handleChange}
                    className="w-full pl-12 pr-4 py-4 bg-transparent text-white focus:outline-none appearance-none"
                  >
                    <option value="" className="bg-gray-800 text-white">Select Supplier</option>
                    {suppliers.map(supplier => (
                      <option key={supplier.id} value={supplier.id} className="bg-gray-800 text-white">
                        {supplier.name}
                      </option>
                    ))}
                  </select>
                  <label
                    htmlFor="supplier_id"
                    className="absolute left-10 -top-2.5 bg-gray-800 px-2 text-sm font-medium text-blue-400"
                  >
                    Supplier
                  </label>
                </div>
              </div>

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
                    className="w-full pl-12 pr-4 py-4 bg-transparent text-white focus:outline-none appearance-none"
                  >
                    {purchaseOrderCategories.map(category => (
                      <option key={category} value={category} className="bg-gray-800 text-white">
                        {category}
                      </option>
                    ))}
                  </select>
                  <label
                    htmlFor="category"
                    className="absolute left-10 -top-2.5 bg-gray-800 px-2 text-sm font-medium text-blue-400"
                  >
                    Category
                  </label>
                </div>
              </div>

              <div className="relative">
                <div className="relative border-2 border-blue-500/50 rounded-xl bg-gray-800/50 backdrop-blur-sm">
                  <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
                    <FileText className="h-5 w-5 text-blue-400" />
                  </div>
                  <input
                    type="text"
                    id="po_number"
                    name="po_number"
                    value={formData.po_number}
                    onChange={handleChange}
                    className="w-full pl-12 pr-4 py-4 bg-transparent text-white placeholder-transparent focus:outline-none"
                    placeholder="PO Number"
                  />
                  <label
                    htmlFor="po_number"
                    className="absolute left-10 -top-2.5 bg-gray-800 px-2 text-sm font-medium text-blue-400"
                  >
                    PO Number
                  </label>
                </div>
              </div>

              <div className="relative">
                <div className="relative border-2 border-blue-500/50 rounded-xl bg-gray-800/50 backdrop-blur-sm">
                  <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
                    <span className="text-blue-400">£</span>
                  </div>
                  <input
                    type="number"
                    id="shipping_cost"
                    name="shipping_cost"
                    value={formData.shipping_cost}
                    onChange={handleChange}
                    step="0.01"
                    min="0"
                    className="w-full pl-8 pr-4 py-4 bg-transparent text-white placeholder-transparent focus:outline-none"
                    placeholder="Shipping Cost"
                  />
                  <label
                    htmlFor="shipping_cost"
                    className="absolute left-6 -top-2.5 bg-gray-800 px-2 text-sm font-medium text-blue-400"
                  >
                    Shipping Cost
                  </label>
                </div>
              </div>

              {/* Directors Loan Dropdown */}
              <div className="relative">
                <div className="relative border-2 border-blue-500/50 rounded-xl bg-gray-800/50 backdrop-blur-sm">
                  <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
                    <User className="h-5 w-5 text-blue-400" />
                  </div>
                  <select
                    id="directors_loan"
                    name="directors_loan"
                    value={selectedDirectorsLoan}
                    onChange={(e) => setSelectedDirectorsLoan(e.target.value)}
                    className="w-full pl-12 pr-4 py-4 bg-transparent text-white focus:outline-none appearance-none"
                  >
                    <option value="No" className="bg-gray-800 text-white">No</option>
                    {directors.map(director => (
                      <option key={director} value={director} className="bg-gray-800 text-white">
                        {director}
                      </option>
                    ))}
                  </select>
                  <label
                    htmlFor="directors_loan"
                    className="absolute left-10 -top-2.5 bg-gray-800 px-2 text-sm font-medium text-blue-400"
                  >
                    Directors Loan
                  </label>
                </div>
              </div>
            </div>

            {/* Section Divider */}
            <div className="border-t border-gray-700/50 my-6"></div>

            {/* Line Items Section - Always show for purchase orders */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white">Line Items</h3>
                <button
                  type="button"
                  onClick={handleAddItem}
                  className="bg-blue-600/80 backdrop-blur-sm hover:bg-blue-700 text-white px-4 py-2 rounded-xl transition-all duration-300 hover:scale-102 flex items-center space-x-2"
                >
                  <Plus className="h-4 w-4" />
                  <span>Add Item</span>
                </button>
              </div>

              {items.length === 0 ? (
                <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-600/30 rounded-xl p-8 text-center">
                  <Package className="h-12 w-12 text-gray-500 mx-auto mb-3" />
                  <p className="text-gray-400 mb-4">No items added yet</p>
                  <button
                    type="button"
                    onClick={handleAddItem}
                    className="bg-blue-600/80 backdrop-blur-sm hover:bg-blue-700 text-white px-4 py-2 rounded-xl transition-all duration-300 hover:scale-102"
                  >
                    Add First Item
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {items.map((item, index) => (
                    <div key={item.id || index} className="bg-gray-800/50 backdrop-blur-sm border border-gray-600/30 rounded-xl p-4">
                      <div className="flex items-center space-x-4">
                        {/* ASIN Image */}
                        <div className="w-16 h-16 bg-gray-700/50 rounded-lg flex items-center justify-center flex-shrink-0">
                          {item.asin_details?.image_url ? (
                            <img 
                              src={item.asin_details.image_url} 
                              alt={item.asin_details.title || item.asin}
                              className="w-full h-full object-cover rounded-lg"
                            />
                          ) : (
                            <Package className="h-8 w-8 text-gray-500" />
                          )}
                        </div>

                        {/* Title and ASIN with Category - Brand format */}
                        <div className="flex-1 min-w-0">
                          <div className="text-white font-medium text-sm truncate">
                            {item.asin_details?.title || 'No title'}
                          </div>
                          <div className="text-blue-400 font-mono text-sm">
                            {item.asin_details?.category || 'Stock'} - {item.asin} - {item.asin_details?.brand || 'No brand'}
                          </div>
                        </div>

                        {/* Item Details Boxes */}
                        <div className="flex items-center space-x-3">
                          <div className="bg-blue-900/30 rounded-lg px-3 py-2 text-center">
                            <div className="text-blue-400 text-xs">Qty</div>
                            <div className="text-white font-medium">{item.quantity}</div>
                          </div>
                          <div className="bg-orange-900/30 rounded-lg px-3 py-2 text-center">
                            <div className="text-orange-400 text-xs">COG</div>
                            <div className="text-white font-medium">{formatCurrency(item.buy_price)}</div>
                          </div>
                          <div className="bg-green-900/30 rounded-lg px-3 py-2 text-center">
                            <div className="text-green-400 text-xs">Sell Price</div>
                            <div className="text-white font-medium">{formatCurrency(item.sell_price)}</div>
                          </div>
                          <div className="bg-red-900/30 rounded-lg px-3 py-2 text-center">
                            <div className="text-red-400 text-xs">Est. Fees</div>
                            <div className="text-white font-medium">{formatCurrency(item.est_fees || 0)}</div>
                          </div>
                          <div className="bg-purple-900/30 rounded-lg px-3 py-2 text-center">
                            <div className="text-purple-400 text-xs">Total Cost</div>
                            <div className="text-white font-medium">{formatCurrency(item.totalCost)}</div>
                          </div>
                          <div className={`rounded-lg px-3 py-2 text-center ${totalProfit >=0 ? 'bg-green-900/30' : 'bg-red-900/30'}`}>
                            <div className={`text-xs ${totalProfit >= 0 ? 'text-green-400' : 'text-red-400'}`}>Est. Profit</div>
                            <div className={`font-medium ${item.estimatedProfit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                              {formatCurrency(item.estimatedProfit)}
                            </div>
                          </div>
                          <div className={`rounded-lg px-3 py-2 text-center ${totalProfit >=0 ? 'bg-green-900/30' : 'bg-red-900/30'}`}>
                            <div className={`text-xs ${totalProfit >= 0 ? 'text-green-400' : 'text-red-400'}`}>ROI%</div>
                            <div className={`font-medium ${item.roi >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                              {item.roi.toFixed(1)}%
                            </div>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center space-x-2">
                          <button
                            type="button"
                            onClick={() => handleEditItem(item)}
                            className="text-blue-400 hover:text-blue-300 transition-colors duration-300 flex items-center space-x-1"
                          >
                            <Edit className="h-4 w-4" />
                            <span>Edit</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteItem(item.id)}
                            className="text-red-400 hover:text-red-300 transition-colors duration-300"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Transaction Summary - Always show for purchase orders */}
            <div className="mb-3">
              <h3 className="text-lg font-semibold text-white mb-4">Purchase Order Summary</h3>
              <div className="grid grid-cols-4 gap-4">
                <div className="bg-blue-900/30 backdrop-blur-sm border border-blue-600/30 rounded-xl p-4 text-center">
                  <p className="text-2xl font-bold text-white">{totalItems}</p>
                  <p className="text-blue-400 text-sm">Total Items</p>
                </div>
                <div className="bg-purple-900/30 backdrop-blur-sm border border-purple-600/30 rounded-xl p-4 text-center">
                  <p className="text-2xl font-bold text-white">{formatCurrency(totalCost)}</p>
                  <p className="text-purple-400 text-sm">Total Cost</p>
                </div>
                <div className={`backdrop-blur-sm border rounded-xl p-4 text-center ${totalProfit >=0 ? 'bg-green-900/30 border-green-600/30' : 'bg-red-900/30 border-red-600/30'}`}>
                  <p className={`text-2xl font-bold ${totalProfit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {formatCurrency(totalProfit)}
                  </p>
                  <p className={`text-sm ${totalProfit >= 0 ? 'text-green-400' : 'text-red-400'}`}>Estimated Profit</p>
                </div>
                <div className={`backdrop-blur-sm border rounded-xl p-4 text-center ${totalProfit >=0 ? 'bg-green-900/30 border-green-600/30' : 'bg-red-900/30 border-red-600/30'}`}>
                  <p className={`text-2xl font-bold ${totalROI >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {totalROI.toFixed(1)}%
                  </p>
                  <p className={`text-sm ${totalProfit >= 0 ? 'text-green-400' : 'text-red-400'}`}>ROI%</p>
                </div>
              </div>
            </div>

            {/* Receipt Upload Section */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-white mb-4">Receipt Upload</h3>
              
              {/* Upload Container with improved layout */}
              <div className="border-2 border-dashed border-gray-600/50 rounded-xl bg-gray-800/30 backdrop-blur-sm">
                {receipts.length > 0 ? (
                  <div className="p-6">
                    {/* Receipt Thumbnails */}
                    <div className="space-y-4 mb-6">
                      <div className="flex items-center justify-between">
                        <span className="text-gray-400 text-sm">{receipts.length} receipt(s)</span>
                        {receipts.length > 5 && (
                          <div className="flex items-center space-x-2">
                            <button
                              type="button"
                              onClick={() => setCurrentReceiptIndex(Math.max(0, currentReceiptIndex - 1))}
                              disabled={currentReceiptIndex === 0}
                              className="p-2 bg-gray-700/50 backdrop-blur-sm rounded-lg text-gray-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300"
                            >
                              <ChevronLeft className="h-4 w-4" />
                            </button>
                            <span className="text-gray-400 text-sm">
                              {Math.floor(currentReceiptIndex / 5) + 1} of {Math.ceil(receipts.length / 5)}
                            </span>
                            <button
                              type="button"
                              onClick={() => setCurrentReceiptIndex(Math.min(receipts.length - 5, currentReceiptIndex + 5))}
                              disabled={currentReceiptIndex + 5 >= receipts.length}
                              className="p-2 bg-gray-700/50 backdrop-blur-sm rounded-lg text-gray-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300"
                            >
                              <ChevronRight className="h-4 w-4" />
                            </button>
                          </div>
                        )}
                      </div>
                      
                      <div className="flex space-x-4 overflow-x-auto pb-2">
                        {receipts.slice(currentReceiptIndex, currentReceiptIndex + 5).map((receipt, index) => 
                          renderReceiptThumbnail(receipt, currentReceiptIndex + index)
                        )}
                      </div>
                    </div>

                    {/* Upload Button at Bottom */}
                    <label className="block">
                      <button
                        type="button"
                        className="w-full bg-blue-600/80 backdrop-blur-sm hover:bg-blue-700 text-white px-4 py-3 rounded-xl transition-all duration-300 hover:scale-102 flex items-center justify-center space-x-2"
                        onClick={() => document.getElementById('receipt-upload')?.click()}
                      >
                        <Upload className="h-5 w-5" />
                        <span>Click here to upload</span>
                      </button>
                      <input
                        id="receipt-upload"
                        type="file"
                        multiple
                        accept=".jpg,.jpeg,.png,.pdf"
                        onChange={(e) => e.target.files && handleFileUpload(e.target.files)}
                        className="hidden"
                      />
                    </label>
                  </div>
                ) : (
                  <label className="block p-6 text-center cursor-pointer hover:border-blue-500/50 transition-colors duration-300">
                    <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-gray-300 mb-1">Click to upload receipts</p>
                    <p className="text-gray-500 text-sm">JPG, PNG, PDF up to 10MB</p>
                    <input
                      type="file"
                      multiple
                      accept=".jpg,.jpeg,.png,.pdf"
                      onChange={(e) => e.target.files && handleFileUpload(e.target.files)}
                      className="hidden"
                    />
                  </label>
                )}
              </div>
            </div>

            {/* Notes Section */}
            <div className="mb-6">
              <div className="relative">
                <div className="relative border-2 border-blue-500/50 rounded-xl bg-gray-800/50 backdrop-blur-sm">
                  <textarea
                    id="notes"
                    name="notes"
                    value={formData.notes}
                    onChange={handleChange}
                    rows={3}
                    className="w-full px-4 py-4 bg-transparent text-white placeholder-transparent focus:outline-none resize-none"
                    placeholder="Notes"
                  />
                  <label
                    htmlFor="notes"
                    className="absolute left-3 -top-2.5 bg-gray-800 px-2 text-sm font-medium text-blue-400"
                  >
                    Notes
                  </label>
                </div>
              </div>
            </div>

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
                disabled={loading || items.length === 0}
                className="bg-blue-600/80 backdrop-blur-sm hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white px-6 py-3 rounded-xl transition-all duration-300 hover:scale-102 flex items-center space-x-2"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <span>{transaction ? 'Update' : 'Create'} Purchase Order</span>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Preview Modal */}
      {showPreviewModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
          <div className="relative max-w-4xl max-h-[90vh] w-full">
            <button
              onClick={() => setShowPreviewModal(false)}
              className="absolute top-4 right-4 z-10 p-2 bg-black/50 backdrop-blur-sm rounded-full text-white hover:bg-black/70 transition-all duration-300"
            >
              <X className="h-6 w-6" />
            </button>
            {previewUrl.toLowerCase().endsWith('.pdf') ? (
              <iframe
                src={previewUrl}
                className="w-full h-[80vh] rounded-xl"
                title="Receipt Preview"
              />
            ) : (
              <img
                src={previewUrl}
                alt="Receipt Preview"
                className="max-w-full max-h-[80vh] object-contain rounded-xl mx-auto"
              />
            )}
          </div>
        </div>
      )}

      {/* Transaction Item Modal */}
      <TransactionItemModal
        isOpen={showItemModal}
        onClose={() => setShowItemModal(false)}
        onSuccess={handleItemSuccess}
        item={editingItem}
      />
    </>
  );
};

export default TransactionModal;