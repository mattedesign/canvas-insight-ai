import React from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface SelectionDebuggerProps {
  multiSelection: {
    state: {
      selectedIds: string[];
      isMultiSelectMode: boolean;
      lastSelectedId?: string;
    };
  };
}

export const SelectionDebugger: React.FC<SelectionDebuggerProps> = ({ multiSelection }) => {
  if (process.env.NODE_ENV === 'production') {
    return null;
  }

  const { selectedIds, isMultiSelectMode, lastSelectedId } = multiSelection.state;

  return (
    <Card className="fixed top-4 right-4 p-3 bg-background/95 backdrop-blur-sm border z-50 max-w-xs">
      <h4 className="font-semibold text-sm mb-2">Selection Debug</h4>
      <div className="space-y-2 text-xs">
        <div className="flex items-center gap-2">
          <span>Count:</span>
          <Badge variant="secondary">{selectedIds.length}</Badge>
        </div>
        <div className="flex items-center gap-2">
          <span>Multi-mode:</span>
          <Badge variant={isMultiSelectMode ? "default" : "outline"}>
            {isMultiSelectMode ? "On" : "Off"}
          </Badge>
        </div>
        {lastSelectedId && (
          <div className="flex items-center gap-2">
            <span>Last:</span>
            <Badge variant="outline" className="text-xs">
              {lastSelectedId.substring(0, 8)}...
            </Badge>
          </div>
        )}
        {selectedIds.length > 0 && (
          <div>
            <span className="block mb-1">Selected IDs:</span>
            <div className="max-h-20 overflow-y-auto space-y-1">
              {selectedIds.map(id => (
                <Badge key={id} variant="outline" className="text-xs block">
                  {id.substring(0, 12)}...
                </Badge>
              ))}
            </div>
          </div>
        )}
      </div>
    </Card>
  );
};