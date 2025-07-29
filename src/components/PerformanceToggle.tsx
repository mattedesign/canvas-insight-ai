import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { BarChart3 } from 'lucide-react';
import { PerformanceDashboard } from './PerformanceDashboard';

export const PerformanceToggle: React.FC = () => {
  const [showDashboard, setShowDashboard] = useState(false);
  
  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setShowDashboard(!showDashboard)}
        className="fixed bottom-4 left-4 z-50 shadow-lg"
        title="Toggle Performance Dashboard"
      >
        <BarChart3 className="h-4 w-4" />
      </Button>
      
      <PerformanceDashboard 
        isVisible={showDashboard} 
        onClose={() => setShowDashboard(false)} 
      />
    </>
  );
};