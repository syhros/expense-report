import React from 'react';
import { PackGroupWithDetails } from '../../types/database';

interface PackGroupTabsProps {
  packGroups: PackGroupWithDetails[];
  activePackGroupId: string | null;
  onPackGroupSelect: (packGroupId: string) => void;
}

const PackGroupTabs: React.FC<PackGroupTabsProps> = ({
  packGroups,
  activePackGroupId,
  onPackGroupSelect
}) => {
  if (packGroups.length === 0) {
    return null;
  }

  return (
    <div className="flex space-x-2 overflow-x-auto pb-2">
      {packGroups.map((packGroup) => {
        const isActive = packGroup.id === activePackGroupId;
        
        return (
          <button
            key={packGroup.id}
            onClick={() => onPackGroupSelect(packGroup.id)}
            className={`flex-shrink-0 px-4 py-2 rounded-xl font-medium transition-all duration-300 hover:scale-102 ${
              isActive
                ? 'bg-blue-600/80 backdrop-blur-sm text-white shadow-lg'
                : 'bg-gray-700/50 backdrop-blur-sm text-gray-300 hover:bg-gray-600/50 hover:text-white'
            }`}
          >
            <span className="mr-2">{packGroup.name}</span>
            <span className="text-xs opacity-75">
              ({packGroup.total_boxes} boxes, {packGroup.total_units} units)
            </span>
          </button>
        );
      })}
    </div>
  );
};

export default PackGroupTabs;