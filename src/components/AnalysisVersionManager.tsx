/**
 * Analysis Version Manager Component
 * Displays analysis history and provides re-analysis options
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AlertCircle, Clock, RotateCcw, Trash2, Eye } from 'lucide-react';
import { enhancedAnalysisStorage } from '@/services/EnhancedAnalysisStorage';
import { analysisService } from '@/services/TypeSafeAnalysisService';
import { toast } from 'sonner';

interface AnalysisVersionManagerProps {
  imageId: string;
  currentAnalysisId?: string;
  onAnalysisSelected?: (analysisId: string) => void;
  onNewAnalysis?: () => void;
}

interface AnalysisHistoryItem {
  id: string;
  version: number;
  status: string;
  created_at: string;
  analysis_type: string;
  user_context?: string;
}

export const AnalysisVersionManager: React.FC<AnalysisVersionManagerProps> = ({
  imageId,
  currentAnalysisId,
  onAnalysisSelected,
  onNewAnalysis
}) => {
  const [history, setHistory] = useState<AnalysisHistoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [reAnalyzing, setReAnalyzing] = useState(false);
  const [existingAnalysis, setExistingAnalysis] = useState<any>(null);

  useEffect(() => {
    loadAnalysisHistory();
    checkExistingAnalysis();
  }, [imageId]);

  const loadAnalysisHistory = async () => {
    try {
      setLoading(true);
      const historyData = await enhancedAnalysisStorage.getAnalysisHistory(imageId);
      setHistory(historyData);
    } catch (error) {
      console.error('Failed to load analysis history:', error);
      toast.error('Failed to load analysis history');
    } finally {
      setLoading(false);
    }
  };

  const checkExistingAnalysis = async () => {
    try {
      const existing = await enhancedAnalysisStorage.checkExistingAnalysis(imageId);
      setExistingAnalysis(existing);
    } catch (error) {
      console.error('Failed to check existing analysis:', error);
    }
  };

  const handleReAnalyze = async () => {
    if (!confirm('Are you sure you want to create a new analysis? This will create a new version.')) {
      return;
    }

    try {
      setReAnalyzing(true);
      
      // Trigger new analysis
      const response = await analysisService.analyzeImage({
        imageUrl: `image-${imageId}`, // This will be resolved by the service
        priority: 'high'
      });

      if (response.success) {
        toast.success('New analysis created successfully');
        await loadAnalysisHistory();
        onNewAnalysis?.();
      } else {
        toast.error(`Analysis failed: ${response.error}`);
      }
    } catch (error) {
      console.error('Re-analysis failed:', error);
      toast.error('Failed to create new analysis');
    } finally {
      setReAnalyzing(false);
    }
  };

  const handleDeleteVersion = async (analysisId: string) => {
    if (!confirm('Are you sure you want to delete this analysis version? This action cannot be undone.')) {
      return;
    }

    try {
      const success = await enhancedAnalysisStorage.deleteAnalysisVersion(analysisId);
      
      if (success) {
        toast.success('Analysis version deleted');
        await loadAnalysisHistory();
      } else {
        toast.error('Failed to delete analysis version');
      }
    } catch (error) {
      console.error('Delete failed:', error);
      toast.error('Failed to delete analysis version');
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'default';
      case 'processing':
        return 'secondary';
      case 'failed':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  return (
    <Card className="w-full">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle className="text-lg font-semibold">Analysis Management</CardTitle>
        <div className="flex gap-2">
          {existingAnalysis?.hasRecent && (
            <Badge variant="secondary" className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              Recent analysis available
            </Badge>
          )}
          <Button
            onClick={handleReAnalyze}
            disabled={reAnalyzing}
            size="sm"
            variant="outline"
            className="flex items-center gap-2"
          >
            <RotateCcw className={`h-4 w-4 ${reAnalyzing ? 'animate-spin' : ''}`} />
            {reAnalyzing ? 'Analyzing...' : 'New Analysis'}
          </Button>
        </div>
      </CardHeader>

      <CardContent>
        {existingAnalysis?.hasRecent && (
          <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
              <div className="text-sm">
                <p className="font-medium text-blue-900 dark:text-blue-100">
                  Recent Analysis Found
                </p>
                <p className="text-blue-700 dark:text-blue-300 mt-1">
                  This image has a recent analysis (version {existingAnalysis.latestVersion}) from{' '}
                  {existingAnalysis.createdAt && formatDate(existingAnalysis.createdAt)}.
                  You can view it or create a new analysis version.
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-medium">Analysis History</h4>
            <Badge variant="outline">{history.length} versions</Badge>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : history.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No analysis history available</p>
              <p className="text-sm">Create your first analysis to get started</p>
            </div>
          ) : (
            <ScrollArea className="h-64">
              <div className="space-y-2">
                {history.map((item, index) => (
                  <div
                    key={item.id}
                    className={`p-3 rounded-lg border transition-colors ${
                      item.id === currentAnalysisId
                        ? 'bg-primary/10 border-primary/20'
                        : 'bg-background hover:bg-muted/50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          v{item.version}
                        </Badge>
                        <Badge variant={getStatusColor(item.status)} className="text-xs">
                          {item.status}
                        </Badge>
                        <span className="text-sm font-medium">
                          {item.analysis_type.replace('_', ' ')}
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-1">
                        {item.status === 'completed' && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => onAnalysisSelected?.(item.id)}
                            className="h-7 w-7 p-0"
                          >
                            <Eye className="h-3 w-3" />
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDeleteVersion(item.id)}
                          className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                    
                    <div className="mt-2 text-xs text-muted-foreground">
                      {formatDate(item.created_at)}
                      {item.user_context && (
                        <span className="ml-2 italic">
                          "{item.user_context.substring(0, 50)}..."
                        </span>
                      )}
                    </div>

                    {index < history.length - 1 && <Separator className="mt-3" />}
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </div>
      </CardContent>
    </Card>
  );
};