import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { BarChart3, Settings } from 'lucide-react';
import { PerformanceDashboard } from './legacy/LegacyPerformanceDashboard';
import { LoggingControls } from './LoggingControls';

export const PerformanceToggle: React.FC = () => {
  const [showDashboard, setShowDashboard] = useState(false);
  const [showLoggingControls, setShowLoggingControls] = useState(false);
  
  return (
    <>
      <div className="fixed bottom-4 left-4 z-50 flex flex-col gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowDashboard(!showDashboard)}
          className="shadow-lg"
          title="Toggle Performance Dashboard"
        >
          <BarChart3 className="h-4 w-4" />
        </Button>
        
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowLoggingControls(!showLoggingControls)}
          className="shadow-lg"
          title="Toggle Logging Controls"
        >
          <Settings className="h-4 w-4" />
        </Button>
      </div>
      
      <PerformanceDashboard 
        isVisible={showDashboard} 
        onClose={() => setShowDashboard(false)} 
      />
      
      {showLoggingControls && <LoggingControls />}
    </>
  );
};