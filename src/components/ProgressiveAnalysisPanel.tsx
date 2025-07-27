import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Play, 
  Pause, 
  Square, 
  Trash2, 
  Clock, 
  CheckCircle, 
  XCircle, 
  Loader2,
  BarChart3,
  Zap,
  AlertTriangle
} from 'lucide-react';

interface ProgressiveAnalysisItem {
  id: string;
  imageId: string;
  imageUrl: string;
  imageName: string;
  userContext?: string;
  status: 'pending' | 'processing' | 'completed' | 'error';
  result?: any;
  error?: string;
  startTime?: number;
  duration?: number;
}

interface ProgressiveAnalysisPanelProps {
  queue: ProgressiveAnalysisItem[];
  activeAnalyses: ProgressiveAnalysisItem[];
  completedAnalyses: ProgressiveAnalysisItem[];
  isProcessing: boolean;
  progress: {
    total: number;
    completed: number;
    processing: number;
    pending: number;
    errors: number;
    successful: number;
    percentage: number;
    avgDuration: number;
  };
  onStart: () => void;
  onStop: () => void;
  onClear: () => void;
  batchSize: number;
  concurrentLimit: number;
  currentBatch: number;
}

export function ProgressiveAnalysisPanel({
  queue,
  activeAnalyses,
  completedAnalyses,
  isProcessing,
  progress,
  onStart,
  onStop,
  onClear,
  batchSize,
  concurrentLimit,
  currentBatch
}: ProgressiveAnalysisPanelProps) {

  const getStatusIcon = (status: ProgressiveAnalysisItem['status']) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'processing':
        return <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />;
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-red-500" />;
    }
  };

  const getStatusColor = (status: ProgressiveAnalysisItem['status']) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'processing':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'completed':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'error':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
    }
  };

  const allItems = [...queue, ...activeAnalyses, ...completedAnalyses];

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5" />
              Progressive Analysis Queue
            </CardTitle>
            <CardDescription>
              Batch processing with {concurrentLimit} concurrent analyses
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={onClear}
              disabled={isProcessing}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Clear
            </Button>
            {isProcessing ? (
              <Button
                variant="destructive"
                size="sm"
                onClick={onStop}
              >
                <Square className="h-4 w-4 mr-2" />
                Stop
              </Button>
            ) : (
              <Button
                size="sm"
                onClick={onStart}
                disabled={progress.total === 0}
              >
                <Play className="h-4 w-4 mr-2" />
                Start
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Progress Overview */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              <span className="text-sm font-medium">Overall Progress</span>
            </div>
            <span className="text-sm text-muted-foreground">
              {progress.completed}/{progress.total} ({progress.percentage}%)
            </span>
          </div>
          
          <Progress value={progress.percentage} className="h-2" />
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-lg font-bold text-yellow-600">{progress.pending}</div>
              <div className="text-xs text-muted-foreground">Pending</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-blue-600">{progress.processing}</div>
              <div className="text-xs text-muted-foreground">Processing</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-green-600">{progress.successful}</div>
              <div className="text-xs text-muted-foreground">Completed</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-red-600">{progress.errors}</div>
              <div className="text-xs text-muted-foreground">Errors</div>
            </div>
          </div>
        </div>

        <Separator />

        {/* Performance Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center">
            <div className="text-sm text-muted-foreground">Current Batch</div>
            <div className="text-xl font-bold">{currentBatch}</div>
          </div>
          <div className="text-center">
            <div className="text-sm text-muted-foreground">Batch Size</div>
            <div className="text-xl font-bold">{batchSize}</div>
          </div>
          <div className="text-center">
            <div className="text-sm text-muted-foreground">Avg Duration</div>
            <div className="text-xl font-bold">{progress.avgDuration}ms</div>
          </div>
        </div>

        <Separator />

        {/* Queue Items */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium">Analysis Queue</h4>
            <Badge variant="outline" className="text-xs">
              {allItems.length} items
            </Badge>
          </div>

          {allItems.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Zap className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No items in analysis queue</p>
              <p className="text-xs">Upload images to start progressive analysis</p>
            </div>
          ) : (
            <ScrollArea className="h-64">
              <div className="space-y-2">
                {allItems.map((item, index) => (
                  <div 
                    key={item.id}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <div className="text-xs text-muted-foreground w-6">
                        #{index + 1}
                      </div>
                      {getStatusIcon(item.status)}
                      <div>
                        <div className="font-medium text-sm">{item.imageName}</div>
                        <div className="text-xs text-muted-foreground">
                          {item.userContext ? `Context: ${item.userContext.slice(0, 30)}...` : 'No context'}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Badge 
                        className={`text-xs ${getStatusColor(item.status)}`}
                        variant="outline"
                      >
                        {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
                      </Badge>
                      
                      {item.duration && (
                        <Badge variant="outline" className="text-xs">
                          {item.duration}ms
                        </Badge>
                      )}
                      
                      {item.error && (
                        <AlertTriangle className="h-4 w-4 text-red-500" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </div>

        {/* Processing Status */}
        {isProcessing && (
          <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
              <span className="font-medium text-blue-700 dark:text-blue-300">
                Processing in Progress
              </span>
            </div>
            <p className="text-sm text-blue-600 dark:text-blue-400">
              Running batch {currentBatch} with {activeAnalyses.length} concurrent analyses
            </p>
          </div>
        )}

        {/* Error Summary */}
        {progress.errors > 0 && !isProcessing && (
          <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="h-4 w-4 text-red-500" />
              <span className="font-medium text-red-700 dark:text-red-300">
                {progress.errors} Analysis Error{progress.errors > 1 ? 's' : ''}
              </span>
            </div>
            <p className="text-sm text-red-600 dark:text-red-400">
              Some analyses failed and may need manual retry
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}