import React from 'react';
import { Badge } from './badge';
import { Card } from './card';

/**
 * ✅ PHASE 2: Debug utilities for development
 */

interface DebugPanelProps {
  title: string;
  data: any;
  className?: string;
}

export const DebugPanel: React.FC<DebugPanelProps> = ({ title, data, className = '' }) => {
  if (process.env.NODE_ENV !== 'development') {
    return null;
  }

  return (
    <Card className={`p-3 bg-muted/50 border-dashed ${className}`}>
      <div className="flex items-center gap-2 mb-2">
        <Badge variant="outline" className="text-xs">DEBUG</Badge>
        <span className="text-sm font-semibold">{title}</span>
      </div>
      <pre className="text-xs text-muted-foreground overflow-auto max-h-32 whitespace-pre-wrap">
        {JSON.stringify(data, null, 2)}
      </pre>
    </Card>
  );
};

interface DebugLogProps {
  logs: string[];
  maxLines?: number;
  className?: string;
}

export const DebugLog: React.FC<DebugLogProps> = ({ logs, maxLines = 10, className = '' }) => {
  if (process.env.NODE_ENV !== 'development') {
    return null;
  }

  const displayLogs = logs.slice(-maxLines);

  return (
    <Card className={`p-3 bg-muted/50 border-dashed ${className}`}>
      <div className="flex items-center gap-2 mb-2">
        <Badge variant="outline" className="text-xs">LOGS</Badge>
        <span className="text-sm font-semibold">Debug Output</span>
      </div>
      <div className="text-xs text-muted-foreground max-h-32 overflow-auto">
        {displayLogs.map((log, index) => (
          <div key={index} className="font-mono">{log}</div>
        ))}
      </div>
    </Card>
  );
};