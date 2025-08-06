/**
 * Canvas Layout Debugger Component
 * Displays layout validation information and helps debug positioning issues
 */

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle, AlertTriangle, XCircle, Info } from 'lucide-react';

interface CanvasLayoutDebuggerProps {
  layoutStats: {
    totalNodes: number;
    containerDimensions: { width: number; height: number };
    density: number;
    isValid: boolean;
    errorCount: number;
  };
  validationErrors: string[];
  isVisible?: boolean;
}

export const CanvasLayoutDebugger: React.FC<CanvasLayoutDebuggerProps> = ({
  layoutStats,
  validationErrors,
  isVisible = false
}) => {
  if (!isVisible) return null;

  const getStatusIcon = () => {
    if (layoutStats.isValid) {
      return <CheckCircle className="h-4 w-4 text-green-600" />;
    }
    if (layoutStats.errorCount > 0) {
      return <XCircle className="h-4 w-4 text-red-600" />;
    }
    return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
  };

  const getStatusColor = () => {
    if (layoutStats.isValid) return 'green';
    if (layoutStats.errorCount > 0) return 'red';
    return 'yellow';
  };

  return (
    <Card className="fixed top-4 right-4 w-80 z-50 bg-background/95 backdrop-blur-sm border shadow-lg">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          {getStatusIcon()}
          Canvas Layout Debug
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-3">
        {/* Layout Status */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Status:</span>
          <Badge variant={layoutStats.isValid ? 'default' : 'destructive'}>
            {layoutStats.isValid ? 'Valid' : 'Issues Found'}
          </Badge>
        </div>

        {/* Layout Stats */}
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div>
            <span className="text-muted-foreground">Nodes:</span>
            <div className="font-medium">{layoutStats.totalNodes}</div>
          </div>
          <div>
            <span className="text-muted-foreground">Errors:</span>
            <div className="font-medium text-red-600">{layoutStats.errorCount}</div>
          </div>
          <div className="col-span-2">
            <span className="text-muted-foreground">Container:</span>
            <div className="font-medium">
              {Math.round(layoutStats.containerDimensions.width)} × {Math.round(layoutStats.containerDimensions.height)}
            </div>
          </div>
          <div className="col-span-2">
            <span className="text-muted-foreground">Density:</span>
            <div className="font-medium">{layoutStats.density.toFixed(3)} nodes/M²</div>
          </div>
        </div>

        {/* Validation Errors */}
        {validationErrors.length > 0 && (
          <div className="space-y-1">
            <div className="text-sm font-medium text-red-600 flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" />
              Layout Issues:
            </div>
            {validationErrors.slice(0, 3).map((error, index) => (
              <Alert key={index} variant="destructive" className="py-1 px-2">
                <AlertDescription className="text-xs">{error}</AlertDescription>
              </Alert>
            ))}
            {validationErrors.length > 3 && (
              <div className="text-xs text-muted-foreground">
                +{validationErrors.length - 3} more issues...
              </div>
            )}
          </div>
        )}

        {/* Success State */}
        {layoutStats.isValid && (
          <Alert className="py-1 px-2">
            <Info className="h-3 w-3" />
            <AlertDescription className="text-xs">
              Layout is valid - all nodes properly positioned
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
};