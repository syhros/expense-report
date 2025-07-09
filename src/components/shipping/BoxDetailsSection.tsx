import React, { useState, useEffect } from 'react';
import { Package } from 'lucide-react';
import { Box } from '../../types/database';

interface BoxDetailsSectionProps {
  boxes: Box[];
  onBoxUpdate: (boxId: string, updates: Partial<Box>) => void;
}

const BoxDetailsSection: React.FC<BoxDetailsSectionProps> = ({
  boxes,
  onBoxUpdate
}) => {
  const [boxData, setBoxData] = useState<{ [boxId: string]: Partial<Box> }>({});

  // Initialize box data
  useEffect(() => {
    const initialData: { [boxId: string]: Partial<Box> } = {};
    boxes.forEach(box => {
      initialData[box.id] = {
        weight: box.weight || 0,
        width: box.width || 0,
        length: box.length || 0,
        height: box.height || 0
      };
    });
    setBoxData(initialData);
  }, [boxes]);

  const handleInputChange = (boxId: string, field: keyof Box, value: string) => {
    const numericValue = parseFloat(value) || 0;
    const validValue = Math.max(0, numericValue);
    
    setBoxData(prev => ({
      ...prev,
      [boxId]: {
        ...prev[boxId],
        [field]: validValue
      }
    }));
    
    onBoxUpdate(boxId, { [field]: validValue });
  };

  if (boxes.length === 0) {
    return (
      <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-600/30 rounded-xl p-8 text-center">
        <Package className="h-12 w-12 text-gray-500 mx-auto mb-3" />
        <p className="text-gray-400">No boxes available</p>
      </div>
    );
  }

  return (
    <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-600/30 rounded-xl p-6">
      <div className="flex items-center space-x-2 mb-6">
        <Package className="h-5 w-5 text-blue-400" />
        <h3 className="text-lg font-semibold text-white">Box Details</h3>
      </div>

      <div className="space-y-4">
        {boxes.map((box) => (
          <div key={box.id} className="bg-gray-700/30 rounded-xl p-4">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-white font-medium">{box.name}</h4>
              <span className="text-gray-400 text-sm">
                {box.total_units} units
              </span>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {/* Weight */}
              <div className="relative">
                <input
                  type="number"
                  step="0.001"
                  min="0"
                  value={boxData[box.id]?.weight || ''}
                  onChange={(e) => handleInputChange(box.id, 'weight', e.target.value)}
                  className="w-full bg-gray-600/50 border border-gray-500/50 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="0.000"
                />
                <label className="absolute -top-2 left-2 bg-gray-700 px-1 text-xs text-gray-400">
                  Weight (kg)
                </label>
              </div>

              {/* Width */}
              <div className="relative">
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  value={boxData[box.id]?.width || ''}
                  onChange={(e) => handleInputChange(box.id, 'width', e.target.value)}
                  className="w-full bg-gray-600/50 border border-gray-500/50 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="0.0"
                />
                <label className="absolute -top-2 left-2 bg-gray-700 px-1 text-xs text-gray-400">
                  Width (cm)
                </label>
              </div>

              {/* Length */}
              <div className="relative">
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  value={boxData[box.id]?.length || ''}
                  onChange={(e) => handleInputChange(box.id, 'length', e.target.value)}
                  className="w-full bg-gray-600/50 border border-gray-500/50 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="0.0"
                />
                <label className="absolute -top-2 left-2 bg-gray-700 px-1 text-xs text-gray-400">
                  Length (cm)
                </label>
              </div>

              {/* Height */}
              <div className="relative">
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  value={boxData[box.id]?.height || ''}
                  onChange={(e) => handleInputChange(box.id, 'height', e.target.value)}
                  className="w-full bg-gray-600/50 border border-gray-500/50 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="0.0"
                />
                <label className="absolute -top-2 left-2 bg-gray-700 px-1 text-xs text-gray-400">
                  Height (cm)
                </label>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default BoxDetailsSection;