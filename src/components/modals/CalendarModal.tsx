import React, { useState, useMemo } from 'react';
import { X, Calendar, ChevronLeft, ChevronRight, Package } from 'lucide-react';
import { TransactionWithMetrics } from '../../types/database';
import { formatDate, formatCurrency } from '../../utils/formatters';

interface CalendarModalProps {
  isOpen: boolean;
  onClose: () => void;
  transactions: TransactionWithMetrics[];
}

interface CalendarDay {
  date: Date;
  isCurrentMonth: boolean;
  transactions: TransactionWithMetrics[];
}

const CalendarModal: React.FC<CalendarModalProps> = ({ 
  isOpen, 
  onClose, 
  transactions 
}) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [hoveredTransaction, setHoveredTransaction] = useState<TransactionWithMetrics | null>(null);
  const [hoverPosition, setHoverPosition] = useState({ x: 0, y: 0 });

  // Generate calendar days
  const calendarDays = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    // First day of the month
    const firstDay = new Date(year, month, 1);
    // Last day of the month
    const lastDay = new Date(year, month + 1, 0);
    
    // Start from the first Sunday of the week containing the first day
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - startDate.getDay());
    
    // End at the last Saturday of the week containing the last day
    const endDate = new Date(lastDay);
    endDate.setDate(endDate.getDate() + (6 - endDate.getDay()));
    
    const days: CalendarDay[] = [];
    const currentDateIter = new Date(startDate);
    
    while (currentDateIter <= endDate) {
      const dayTransactions = transactions.filter(transaction => {
        if (!transaction.delivery_date) return false;
        const deliveryDate = new Date(transaction.delivery_date);
        return deliveryDate.toDateString() === currentDateIter.toDateString();
      });
      
      days.push({
        date: new Date(currentDateIter),
        isCurrentMonth: currentDateIter.getMonth() === month,
        transactions: dayTransactions
      });
      
      currentDateIter.setDate(currentDateIter.getDate() + 1);
    }
    
    return days;
  }, [currentDate, transactions]);

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      if (direction === 'prev') {
        newDate.setMonth(newDate.getMonth() - 1);
      } else {
        newDate.setMonth(newDate.getMonth() + 1);
      }
      return newDate;
    });
  };

  const handleTransactionHover = (transaction: TransactionWithMetrics, event: React.MouseEvent) => {
    setHoveredTransaction(transaction);
    setHoverPosition({ x: event.clientX, y: event.clientY });
  };

  const handleTransactionLeave = () => {
    setHoveredTransaction(null);
  };

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800/90 backdrop-blur-xl border border-gray-600/30 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700/50">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-purple-600/80 backdrop-blur-sm rounded-xl">
              <Calendar className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-white">Delivery Calendar</h2>
              <p className="text-sm text-gray-400">Pending orders with delivery dates</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors duration-300 hover:scale-102"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Calendar Content */}
        <div className="p-6">
          {/* Calendar Header */}
          <div className="flex items-center justify-between mb-6">
            <button
              onClick={() => navigateMonth('prev')}
              className="p-2 bg-gray-700/50 hover:bg-gray-600/50 rounded-xl transition-all duration-300 hover:scale-102"
            >
              <ChevronLeft className="h-5 w-5 text-white" />
            </button>
            
            <h3 className="text-xl font-semibold text-white">
              {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
            </h3>
            
            <button
              onClick={() => navigateMonth('next')}
              className="p-2 bg-gray-700/50 hover:bg-gray-600/50 rounded-xl transition-all duration-300 hover:scale-102"
            >
              <ChevronRight className="h-5 w-5 text-white" />
            </button>
          </div>

          {/* Day Headers */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {dayNames.map(day => (
              <div key={day} className="p-3 text-center text-sm font-medium text-gray-400">
                {day}
              </div>
            ))}
          </div>

          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-1">
            {calendarDays.map((day, index) => (
              <div
                key={index}
                className={`min-h-[120px] p-2 border border-gray-700/30 rounded-lg ${
                  day.isCurrentMonth 
                    ? 'bg-gray-800/30' 
                    : 'bg-gray-800/10'
                } ${
                  day.date.toDateString() === new Date().toDateString()
                    ? 'ring-2 ring-blue-500/50'
                    : ''
                }`}
              >
                {/* Day Number */}
                <div className={`text-sm font-medium mb-2 ${
                  day.isCurrentMonth ? 'text-white' : 'text-gray-500'
                }`}>
                  {day.date.getDate()}
                </div>

                {/* Transaction Cards */}
                <div className="space-y-1">
                  {day.transactions.map((transaction) => (
                    <div
                      key={transaction.id}
                      className="bg-blue-600/80 backdrop-blur-sm text-white p-2 rounded text-xs cursor-pointer hover:bg-blue-700/80 transition-colors"
                      onMouseEnter={(e) => handleTransactionHover(transaction, e)}
                      onMouseLeave={handleTransactionLeave}
                    >
                      <div className="font-medium truncate">
                        {transaction.po_number || transaction.id.slice(0, 8).toUpperCase()}
                      </div>
                      <div className="text-blue-200 truncate">
                        {formatDate(transaction.ordered_date)}
                      </div>
                      <div className="text-blue-200 truncate">
                        {transaction.supplier?.name || 'N/A'}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Empty State */}
          {transactions.length === 0 && (
            <div className="text-center py-12">
              <Package className="h-16 w-16 text-gray-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-white mb-2">No Pending Orders</h3>
              <p className="text-gray-400">
                No pending orders with delivery dates found.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Hover Tooltip */}
      {hoveredTransaction && (
        <div
          className="fixed z-[60] bg-gray-900/95 backdrop-blur-xl border border-gray-600/50 rounded-xl p-4 shadow-2xl pointer-events-none"
          style={{
            left: hoverPosition.x + 10,
            top: hoverPosition.y - 10,
            transform: 'translateY(-100%)'
          }}
        >
          <div className="space-y-3">
            <div>
              <h4 className="text-white font-semibold">
                {hoveredTransaction.po_number || hoveredTransaction.id.slice(0, 8).toUpperCase()}
              </h4>
              <p className="text-gray-400 text-sm">
                Ordered: {formatDate(hoveredTransaction.ordered_date)}
              </p>
              <p className="text-gray-400 text-sm">
                Supplier: {hoveredTransaction.supplier?.name || 'N/A'}
              </p>
            </div>

            {/* Line Items */}
            {hoveredTransaction.items && hoveredTransaction.items.length > 0 && (
              <div>
                <h5 className="text-gray-300 font-medium text-sm mb-2">Line Items:</h5>
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {hoveredTransaction.items.slice(0, 5).map((item, index) => (
                    <div key={index} className="text-xs">
                      <div className="text-white truncate" style={{ maxWidth: '200px' }}>
                        {item.asin_details?.title && item.asin_details.title.length > 24 
                          ? `${item.asin_details.title.substring(0, 24)}...`
                          : item.asin_details?.title || 'No title'
                        }
                      </div>
                      <div className="text-gray-400">
                        {item.asin} • Qty: {item.quantity}
                      </div>
                    </div>
                  ))}
                  {hoveredTransaction.items.length > 5 && (
                    <div className="text-xs text-gray-500">
                      +{hoveredTransaction.items.length - 5} more items
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Notes */}
            {hoveredTransaction.notes && (
              <div>
                <h5 className="text-gray-300 font-medium text-sm mb-1">Notes:</h5>
                <p className="text-gray-400 text-xs">
                  {hoveredTransaction.notes}
                </p>
              </div>
            )}

            {/* Total Cost */}
            <div className="pt-2 border-t border-gray-700/50">
              <div className="flex justify-between items-center">
                <span className="text-gray-400 text-sm">Total Cost:</span>
                <span className="text-white font-medium">
                  {formatCurrency(hoveredTransaction.totalCost)}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CalendarModal;