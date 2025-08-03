/**
 * Debug panel for monitoring analysis flow in real-time
 * Only visible in development mode or when manually enabled
 */

import React, { useState, useEffect } from 'react';
import { AnalysisDebugger } from '@/utils/analysisDebugging';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, Bug, Trash2, Download } from 'lucide-react';

interface AnalysisFlowDebuggerProps {
  imageId?: string;
  visible?: boolean;
}

export const AnalysisFlowDebugger: React.FC<AnalysisFlowDebuggerProps> = ({
  imageId,
  visible = false
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [autoRefresh, setAutoRefresh] = useState(true);

  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      if (imageId) {
        setLogs(AnalysisDebugger.getAnalysisFlow(imageId));
      } else {
        setLogs(AnalysisDebugger.getCanvasFlow());
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [imageId, autoRefresh]);

  const handleClearLogs = () => {
    AnalysisDebugger.clearLogs();
    setLogs([]);
  };

  const handleExportLogs = () => {
    const logData = AnalysisDebugger.exportLogs();
    const blob = new Blob([logData], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `analysis-logs-${new Date().toISOString().split('T')[0]}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 w-96">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <Card className="bg-background/95 backdrop-blur border-primary/20">
          <CollapsibleTrigger asChild>
            <Button 
              variant="ghost" 
              className="w-full flex items-center justify-between p-4"
            >
              <div className="flex items-center gap-2">
                <Bug className="h-4 w-4" />
                <span className="font-semibold">Analysis Debug</span>
                {logs.length > 0 && (
                  <span className="text-xs bg-primary/20 px-2 py-1 rounded">
                    {logs.length}
                  </span>
                )}
              </div>
              <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </Button>
          </CollapsibleTrigger>
          
          <CollapsibleContent>
            <div className="p-4 pt-0 space-y-3">
              <div className="flex items-center gap-2">
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={handleClearLogs}
                >
                  <Trash2 className="h-3 w-3 mr-1" />
                  Clear
                </Button>
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={handleExportLogs}
                >
                  <Download className="h-3 w-3 mr-1" />
                  Export
                </Button>
                <label className="flex items-center gap-1 text-xs">
                  <input
                    type="checkbox"
                    checked={autoRefresh}
                    onChange={(e) => setAutoRefresh(e.target.checked)}
                    className="w-3 h-3"
                  />
                  Auto-refresh
                </label>
              </div>
              
              <div className="bg-muted/50 rounded p-2 max-h-64 overflow-y-auto">
                <div className="text-xs font-mono space-y-1">
                  {logs.length === 0 ? (
                    <div className="text-muted-foreground italic">
                      No logs {imageId ? `for image ${imageId}` : 'available'}
                    </div>
                  ) : (
                    logs.map((log, index) => (
                      <div 
                        key={index} 
                        className={`${
                          log.includes('ERROR') ? 'text-destructive' :
                          log.includes('COMPLETED') ? 'text-emerald-600' :
                          log.includes('STARTED') ? 'text-blue-600' :
                          'text-foreground'
                        }`}
                      >
                        {log}
                      </div>
                    ))
                  )}
                </div>
              </div>
              
              {imageId && (
                <div className="text-xs text-muted-foreground">
                  Tracking: {imageId}
                </div>
              )}
            </div>
          </CollapsibleContent>
        </Card>
      </Collapsible>
    </div>
  );
};