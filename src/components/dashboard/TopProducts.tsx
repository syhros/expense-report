import React from 'react';
import Card from '../shared/Card';

interface Product {
  title: string;
  asin: string;
  units: number;
  profit: string;
  roi: string;
}

interface TopProductsProps {
  products: Product[];
}

const TopProducts: React.FC<TopProductsProps> = ({ products }) => {
  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-white">Top Performing Products</h3>
      </div>
      
      <div className="space-y-4">
        {products.map((product, index) => (
          <div key={product.asin} className="border border-gray-700 rounded-lg p-4">
            <div className="flex items-start justify-between mb-2">
              <div className="flex-1">
                <h4 className="text-white font-medium text-sm leading-tight mb-1">
                  {product.title}
                </h4>
                <p className="text-gray-400 text-sm">{product.asin} • {product.units} units</p>
              </div>
              <div className="text-right ml-4">
                <p className="text-green-400 font-bold text-lg">£{product.profit.replace('£', '')}</p>
                <p className="text-gray-400 text-sm">{product.roi} ROI</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
};

export default TopProducts;