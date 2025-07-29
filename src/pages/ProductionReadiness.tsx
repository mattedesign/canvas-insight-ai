import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ProductionReadinessDashboard } from '@/components/production/ProductionReadinessDashboard';
import { Sidebar } from '@/components/Sidebar';

const ProductionReadiness = () => {
  const navigate = useNavigate();

  return (
    <div className="flex h-screen bg-background">
      <Sidebar 
        selectedView="summary"
        onViewChange={(view) => {
          if (view === 'canvas') navigate('/canvas');
          else if (view === 'gallery') navigate('/projects');
        }}
        uploadedImages={[]}
        analyses={[]}
        onClearCanvas={() => {}}
        onAddImages={() => {}}
        onImageSelect={() => {}}
        onToggleAnnotations={() => {}}
        onNavigateToPreviousAnalyses={() => navigate('/projects')}
        selectedImageId={null}
        showAnnotations={false}
      />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="border-b bg-background/95 backdrop-blur">
          <div className="max-w-7xl mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold">Production Readiness</h1>
                <p className="text-muted-foreground">Comprehensive production deployment analysis</p>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-auto">
          <div className="max-w-7xl mx-auto p-6">
            <ProductionReadinessDashboard />
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductionReadiness;