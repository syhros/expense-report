import React, { useState, useEffect } from 'react';
import { Package, ExternalLink } from 'lucide-react';
import { PackGroupItemWithASINDetails, Box } from '../../types/database';
import { formatCurrency } from '../../utils/formatters';

interface ProductCardProps {
  item: PackGroupItemWithASINDetails;
  boxes: Box[];
  onQuantityChange: (itemId: string, boxId: string, quantity: number) => void;
}

const ProductCard: React.FC<ProductCardProps> = ({
  item,
  boxes,
  onQuantityChange
}) => {
  const [boxQuantities, setBoxQuantities] = useState<{ [boxId: string]: number }>({});

  // Initialize box quantities from item data
  useEffect(() => {
    const initialQuantities: { [boxId: string]: number } = {};
    boxes.forEach(box => {
      initialQuantities[box.id] = item.boxed_quantities[box.id] || 0;
    });
    setBoxQuantities(initialQuantities);
  }, [item.boxed_quantities, boxes]);

  const handleQuantityChange = (boxId: string, value: string) => {
    const quantity = parseInt(value) || 0;
    const validQuantity = Math.max(0, quantity);
    
    setBoxQuantities(prev => ({
      ...prev,
      [boxId]: validQuantity
    }));
    
    onQuantityChange(item.id, boxId, validQuantity);
  };

  const totalBoxed = Object.values(boxQuantities).reduce((sum, qty) => sum + qty, 0);
  const remaining = item.expected_quantity - totalBoxed;
  const weight = item.asin_details?.weight || 0;
  const weightUnit = item.asin_details?.weight_unit || 'g';
  const totalWeight = weight * totalBoxed;

  // Status color based on remaining quantity
  const getStatusColor = (): string => {
    if (remaining === 0) return 'text-green-400';
    if (remaining < 0) return 'text-red-400';
    return 'text-yellow-400';
  };

  const getStatusBgColor = (): string => {
    if (remaining === 0) return 'bg-green-900/30';
    if (remaining < 0) return 'bg-red-900/30';
    return 'bg-yellow-900/30';
  };

  return (
    <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-600/30 rounded-xl p-4">
      {/* Product Image Container with Weight and Prep Type */}
      <div className="relative mb-4 flex justify-center">
        {/* Weight Bubble - positioned above image */}
        <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 z-10 bg-blue-600/90 backdrop-blur-sm text-white px-3 py-1 rounded-full text-xs font-medium">
          Weight: {totalWeight > 0 ? `${totalWeight.toFixed(1)}${weightUnit}` : '0g'}
        </div>
        
        {/* Product Image with small padding */}
        <div className="w-80 h-80 p-2">
          <div className="relative w-full h-full bg-gray-700/50 rounded-lg flex items-center justify-center overflow-hidden">
            {item.asin_details?.image_url ? (
              <img
                src={item.asin_details.image_url}
                alt={item.title}
                className="w-full h-full object-cover rounded-lg"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                  e.currentTarget.nextElementSibling!.style.display = 'flex';
                }}
              />
            ) : null}
            <div className={`w-full h-full flex items-center justify-center ${item.asin_details?.image_url ? 'hidden' : 'flex'}`}>
              <Package className="h-16 w-16 text-gray-500" />
            </div>
            
            {/* Prep Type Badge - positioned on image */}
            <div className="absolute bottom-2 left-2 bg-gray-900/80 backdrop-blur-sm text-white px-2 py-1 rounded text-xs font-medium">
              Prep: {item.prep_type}
            </div>
          </div>
        </div>
      </div>

      {/* Product Info Below Image */}
      <div className="mb-4 text-left">
        <h3 className="text-white font-medium text-sm leading-tight mb-2 line-clamp-2">
          {item.title}
        </h3>
        
        <div className="text-xs">
          <div className="flex flex-wrap lg:block">
            <div className="flex-none whitespace-nowrap">
              <span className="text-gray-400">FNSKU:</span>
              <span className="text-blue-400 ml-1 font-mono">
                {item.asin_details?.fnsku || 'N/A'}
              </span>
            </div>
            <div className="flex-none ml-2 whitespace-nowrap lg:ml-0 lg:mt-1">
              <span className="text-gray-400">ASIN:</span>
              <div className="inline-flex items-center space-x-2 ml-1">
                <span className="text-blue-400 font-mono">{item.asin}</span>
                <a 
                  href={`https://www.amazon.co.uk/dp/${item.asin}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-400 hover:text-blue-300 transition-colors"
                  onClick={(e) => e.stopPropagation()}
                >
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Box Quantity Inputs */}
      <div className="mb-4">
        <h4 className="text-sm font-medium text-gray-400 mb-2">Box Quantities</h4>
        <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-2 gap-2">
          {boxes.map((box) => (
            <div key={box.id} className="relative">
              <input
                type="number"
                min="0"
                value={boxQuantities[box.id] || ''}
                onChange={(e) => handleQuantityChange(box.id, e.target.value)}
                className="w-full bg-gray-700/50 border border-gray-600/50 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="0"
              />
              <label className="absolute -top-2 left-2 bg-gray-800 px-1 text-xs text-gray-400">
                {box.name}
              </label>
            </div>
          ))}
        </div>
      </div>

      {/* Status Row */}
      <div className="grid grid-cols-3 gap-4 text-center">
        <div className="bg-blue-900/30 rounded-lg p-2">
          <p className="text-blue-400 text-xs">Expected</p>
          <p className="text-white font-bold">{item.expected_quantity}</p>
        </div>
        <div className="bg-purple-900/30 rounded-lg p-2">
          <p className="text-purple-400 text-xs">Boxed</p>
          <p className="text-white font-bold">{totalBoxed}</p>
        </div>
        <div className={`rounded-lg p-2 ${getStatusBgColor()}`}>
          <p className={`text-xs ${getStatusColor()}`}>Left</p>
          <p className={`font-bold ${getStatusColor()}`}>{remaining}</p>
        </div>
      </div>
    </div>
  );
};

export default ProductCard;