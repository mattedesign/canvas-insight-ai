import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle, AlertCircle, RefreshCw } from 'lucide-react';
import { UXAnalysis, UploadedImage } from '@/types/ux-analysis';

type StatusType = UXAnalysis['status'] | UploadedImage['status'];

interface AnalysisStatusIndicatorProps {
  status?: StatusType;
  isProcessing?: boolean;
  onRetry?: () => void;
  compact?: boolean;
}

export const AnalysisStatusIndicator: React.FC<AnalysisStatusIndicatorProps> = ({
  status = 'completed',
  isProcessing = false,
  onRetry,
  compact = false
}) => {
  const getStatusConfig = () => {
    if (isProcessing || status === 'processing') {
      return {
        icon: Loader2,
        label: 'Processing',
        variant: 'secondary' as const,
        className: 'text-blue-600 bg-blue-50 border-blue-200',
        animate: true
      };
    }

    switch (status) {
      case 'analyzing':
        return {
          icon: Loader2,
          label: 'Analyzing',
          variant: 'secondary' as const,
          className: 'text-yellow-600 bg-yellow-50 border-yellow-200',
          animate: true
        };
      case 'completed':
        return {
          icon: CheckCircle,
          label: 'Complete',
          variant: 'default' as const,
          className: 'text-green-600 bg-green-50 border-green-200',
          animate: false
        };
      case 'error':
        return {
          icon: AlertCircle,
          label: 'Failed',
          variant: 'destructive' as const,
          className: 'text-red-600 bg-red-50 border-red-200',
          animate: false
        };
      // New status for immediate upload flow
      case 'uploading':
        return {
          icon: Loader2,
          label: 'Uploading',
          variant: 'outline' as const,
          className: 'text-blue-500 bg-blue-50 border-blue-200',
          animate: true
        };
      case 'uploaded':
        return {
          icon: CheckCircle,
          label: 'Uploaded',
          variant: 'outline' as const,
          className: 'text-green-500 bg-green-50 border-green-200',
          animate: false
        };
      case 'syncing':
        return {
          icon: Loader2,
          label: 'Syncing',
          variant: 'outline' as const,
          className: 'text-orange-500 bg-orange-50 border-orange-200',
          animate: true
        };
      default:
        return {
          icon: CheckCircle,
          label: 'Ready',
          variant: 'outline' as const,
          className: 'text-muted-foreground',
          animate: false
        };
    }
  };

  const config = getStatusConfig();
  const Icon = config.icon;

  if (compact) {
    return (
      <div className="flex items-center gap-1">
        <Icon 
          className={`w-3 h-3 ${config.className} ${config.animate ? 'animate-spin' : ''}`} 
        />
        {status === 'error' && onRetry && (
          <Button
            size="sm"
            variant="ghost"
            onClick={onRetry}
            className="h-4 w-4 p-0 hover:bg-red-100"
          >
            <RefreshCw className="w-3 h-3" />
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Badge variant={config.variant} className={`${config.className} gap-1`}>
        <Icon 
          className={`w-3 h-3 ${config.animate ? 'animate-spin' : ''}`} 
        />
        {config.label}
      </Badge>
      
      {status === 'error' && onRetry && (
        <Button
          size="sm"
          variant="outline"
          onClick={onRetry}
          className="h-6 px-2 gap-1"
        >
          <RefreshCw className="w-3 h-3" />
          Retry
        </Button>
      )}
    </div>
  );
};