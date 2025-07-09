import React from 'react';
import { Package, Trash2 } from 'lucide-react';
import { Shipment } from '../../types/database';
import { formatDate } from '../../utils/formatters';

interface ShipmentCardProps {
  shipment: Shipment;
  onView: (shipmentId: string) => void;
  onDelete: (shipmentId: string) => void;
}

const ShipmentCard: React.FC<ShipmentCardProps> = ({ 
  shipment, 
  onView, 
  onDelete 
}) => {
  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm(`Are you sure you want to delete "${shipment.name}"? This action cannot be undone.`)) {
      onDelete(shipment.id);
    }
  };

  return (
    <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-6 hover:bg-white/15 transition-all duration-300 cursor-pointer group">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-blue-600/80 backdrop-blur-sm rounded-xl">
            <Package className="h-5 w-5 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white group-hover:text-blue-300 transition-colors">
              {shipment.name}
            </h3>
            <p className="text-gray-400 text-sm">
              Created {formatDate(shipment.created_at)}
            </p>
          </div>
        </div>
        
        <button
          onClick={handleDelete}
          className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-300 transition-all duration-300 p-2 hover:bg-red-900/20 rounded-lg"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-4">
        <div className="text-center">
          <p className="text-2xl font-bold text-white">{shipment.total_asins}</p>
          <p className="text-gray-400 text-sm">ASINs</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-white">{shipment.total_units}</p>
          <p className="text-gray-400 text-sm">Units</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-white">
            {(shipment.total_weight / 1000).toFixed(2)} kg
          </p>
          <p className="text-gray-400 text-sm">Weight</p>
        </div>
      </div>

      {/* View Details Button */}
      <button
        onClick={() => onView(shipment.id)}
        className="w-full bg-blue-600/80 backdrop-blur-sm hover:bg-blue-700 text-white py-3 rounded-xl transition-all duration-300 hover:scale-102 font-medium"
      >
        View Details
      </button>
    </div>
  );
};

export default ShipmentCard;