import React from 'react';
import { ProductionReadinessDashboard } from '@/components/production/ProductionReadinessDashboard';

const ProductionReadiness = () => {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <ProductionReadinessDashboard />
      </div>
    </div>
  );
};

export default ProductionReadiness;