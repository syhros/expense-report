import React from 'react';
import { DivideIcon as LucideIcon } from 'lucide-react';
import Card from '../shared/Card';

interface SummaryCardProps {
  title: string;
  value: string;
  icon: LucideIcon;
  trend?: string;
  trendColor?: string;
}

const SummaryCard: React.FC<SummaryCardProps> = ({ 
  title, 
  value, 
  icon: Icon, 
  trend, 
  trendColor = 'text-green-400' 
}) => {
  return (
    <Card className="p-6 hover:bg-gray-750 transition-colors">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-400">{title}</p>
          <p className="text-2xl font-bold text-white mt-2">{value}</p>
          {trend && (
            <p className={`text-sm mt-1 ${trendColor}`}>{trend}</p>
          )}
        </div>
        <div className="p-3 bg-blue-600 rounded-lg">
          <Icon className="h-6 w-6 text-white" />
        </div>
      </div>
    </Card>
  );
};

export default SummaryCard;