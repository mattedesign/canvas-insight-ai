/**
 * Analysis Notifications Hook
 * Specialized toast notifications for analysis version management and constraint handling
 */

import React from 'react';
import { toast } from '@/hooks/use-toast';
import { ToastAction } from '@/components/ui/toast';
import { 
  CheckCircle, 
  AlertCircle, 
  Clock, 
  Layers, 
  Database,
  RefreshCw,
  Eye,
  Trash2,
  Plus
} from 'lucide-react';

export interface AnalysisNotificationOptions {
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

class AnalysisNotificationService {
  
  // Existing Analysis Detection Notifications
  showExistingAnalysisDetected(options: {
    imageId: string;
    analysisVersion: number;
    createdAt: string;
    analysisId: string;
    onViewExisting?: () => void;
    onCreateNew?: () => void;
  }) {
    const timeAgo = this.getTimeAgo(new Date(options.createdAt));
    
    toast({
      title: "📋 Recent Analysis Found",
      description: `Version ${options.analysisVersion} was created ${timeAgo}. View existing or create new version?`,
      duration: 8000,
      action: options.onViewExisting ? (
        <ToastAction altText="View existing analysis" onClick={options.onViewExisting}>
          View
        </ToastAction>
      ) : undefined,
    });
  }

  // Version Management Action Notifications
  showNewAnalysisCreated(options: {
    analysisId: string;
    version: number;
    isNew: boolean;
    processingTime?: number;
  }) {
    const icon = options.isNew ? Plus : RefreshCw;
    const title = options.isNew ? "✅ New Analysis Created" : "🔄 Analysis Updated";
    const description = `Version ${options.version} completed${options.processingTime ? ` in ${Math.round(options.processingTime/1000)}s` : ''}`;
    
    toast({
      title,
      description,
      duration: 5000,
    });
  }

  showAnalysisVersionDeleted(options: {
    analysisId: string;
    version?: number;
    remainingVersions: number;
  }) {
    const description = options.version 
      ? `Version ${options.version} deleted. ${options.remainingVersions} versions remaining.`
      : `Analysis deleted. ${options.remainingVersions} versions remaining.`;
      
    toast({
      title: "🗑️ Analysis Version Deleted",
      description,
      duration: 4000,
    });
  }

  showAnalysisHistoryLoaded(options: {
    imageId: string;
    versionCount: number;
    latestVersion: number;
  }) {
    if (options.versionCount === 0) {
      toast({
        title: "📊 No Analysis History",
        description: "This image hasn't been analyzed yet. Create your first analysis!",
        duration: 4000,
      });
    } else if (options.versionCount === 1) {
      toast({
        title: "📊 Analysis Available",
        description: `1 analysis version found (v${options.latestVersion})`,
        duration: 3000,
      });
    } else {
      toast({
        title: "📊 Analysis History Loaded",
        description: `${options.versionCount} versions available (latest: v${options.latestVersion})`,
        duration: 4000,
      });
    }
  }

  // Constraint Violation Notifications
  showConstraintViolation(options: {
    type: 'unique_constraint' | 'recent_analysis' | 'version_conflict';
    conflictingVersion?: number;
    existingAnalysisId?: string;
    onViewExisting?: () => void;
    onForceNew?: () => void;
  }) {
    let title: string;
    let description: string;
    
    switch (options.type) {
      case 'unique_constraint':
        title = "⚠️ Analysis Conflict";
        description = `Duplicate analysis detected${options.conflictingVersion ? ` (v${options.conflictingVersion})` : ''}. Use existing or force new version.`;
        break;
      
      case 'recent_analysis':
        title = "⏰ Recent Analysis Exists";
        description = "A recent analysis was found for this image. View existing or create new version?";
        break;
      
      case 'version_conflict':
        title = "🔄 Version Conflict";
        description = "Another analysis version was created simultaneously. Please refresh and try again.";
        break;
      
      default:
        title = "⚠️ Analysis Conflict";
        description = "An analysis conflict was detected.";
    }
    
    toast({
      title,
      description,
      duration: 7000,
      action: options.onViewExisting ? (
        <ToastAction altText="View existing analysis" onClick={options.onViewExisting}>
          View Existing
        </ToastAction>
      ) : undefined,
    });
  }

  // Analysis Progress and Status Notifications
  showAnalysisProgress(options: {
    stage: string;
    progress: number;
    message: string;
    imageId: string;
  }) {
    // Only show progress notifications for significant milestones
    if (options.progress % 25 === 0 || options.progress >= 90) {
      toast({
        title: `🔄 ${options.stage}`,
        description: `${options.message} (${options.progress}%)`,
        duration: 2000,
      });
    }
  }

  showAnalysisComplete(options: {
    analysisId: string;
    imageId: string;
    version: number;
    duration: number;
    hasMultipleVersions: boolean;
    onViewResults?: () => void;
  }) {
    const title = options.hasMultipleVersions 
      ? `✅ Analysis Complete (v${options.version})`
      : "✅ Analysis Complete";
    
    const description = `Completed in ${Math.round(options.duration/1000)}s${options.hasMultipleVersions ? '. Multiple versions available.' : ''}`;
    
    toast({
      title,
      description,
      duration: 6000,
      action: options.onViewResults ? (
        <ToastAction altText="View analysis results" onClick={options.onViewResults}>
          View Results
        </ToastAction>
      ) : undefined,
    });
  }

  showAnalysisError(options: {
    error: string;
    errorType: 'api_error' | 'network_error' | 'validation_error' | 'storage_error' | 'unknown';
    retryCount?: number;
    maxRetries?: number;
    onRetry?: () => void;
  }) {
    let title: string;
    
    switch (options.errorType) {
      case 'api_error':
        title = "🔑 API Configuration Error";
        break;
      case 'network_error':
        title = "🌐 Network Error";
        break;
      case 'validation_error':
        title = "⚠️ Validation Error";
        break;
      case 'storage_error':
        title = "💾 Storage Error";
        break;
      default:
        title = "❌ Analysis Error";
    }
    
    const description = `${options.error}${options.retryCount && options.maxRetries ? ` (Attempt ${options.retryCount}/${options.maxRetries})` : ''}`;
    
    toast({
      title,
      description,
      variant: "destructive",
      duration: 8000,
      action: options.onRetry ? (
        <ToastAction altText="Retry analysis" onClick={options.onRetry}>
          Retry
        </ToastAction>
      ) : undefined,
    });
  }

  // Storage and Database Notifications
  showStorageOperationSuccess(options: {
    operation: 'save' | 'delete' | 'update' | 'load';
    analysisId: string;
    version?: number;
    details?: string;
  }) {
    const icons = {
      save: "💾",
      delete: "🗑️", 
      update: "🔄",
      load: "📂"
    };
    
    const actions = {
      save: "Saved",
      delete: "Deleted", 
      update: "Updated",
      load: "Loaded"
    };
    
    const title = `${icons[options.operation]} Analysis ${actions[options.operation]}`;
    const description = `${options.details || `Analysis ${options.operation} completed successfully`}${options.version ? ` (v${options.version})` : ''}`;
    
    toast({
      title,
      description,
      duration: 3000,
    });
  }

  showStorageOperationError(options: {
    operation: 'save' | 'delete' | 'update' | 'load';
    error: string;
    analysisId?: string;
    onRetry?: () => void;
  }) {
    const title = `❌ Failed to ${options.operation} analysis`;
    
    toast({
      title,
      description: options.error,
      variant: "destructive", 
      duration: 6000,
      action: options.onRetry ? (
        <ToastAction altText={`Retry ${options.operation}`} onClick={options.onRetry}>
          Retry
        </ToastAction>
      ) : undefined,
    });
  }

  // Utility Functions
  private getTimeAgo(date: Date): string {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins} minute${diffMins !== 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
    return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
  }

  // Clear all analysis-related notifications
  clearAnalysisNotifications() {
    // Note: The toast library doesn't provide a direct way to clear specific toasts
    // This is a placeholder for future implementation if needed
    console.log('Analysis notifications cleared');
  }
}

// Create singleton instance
export const analysisNotifications = new AnalysisNotificationService();

// Hook for easy access in components
export function useAnalysisNotifications() {
  return analysisNotifications;
}
