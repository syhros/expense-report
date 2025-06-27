import React from 'react';
import Card from '../shared/Card';

interface MetricCardProps {
  title: string;
  value: string;
  trend: string;
  description?: string;
  trendColor?: string;
}

const MetricCard: React.FC<MetricCardProps> = ({ title, value, trend, description, trendColor = 'text-green-400' }) => {
  return (
    <Card className="p-6 hover:bg-gray-750 transition-colors">
      <div className="flex items-center justify-between mb-2">
        <p className="text-sm font-medium text-gray-400">{title}</p>
        <span className={`text-sm font-medium ${trendColor}`}>
          {trend}
        </span>
      </div>
      <p className="text-2xl font-bold text-white">{value}</p>
      {description && (
        <p className="text-xs text-gray-500 mt-1">{description}</p>
      )}
    </Card>
  );
};

export default MetricCard;