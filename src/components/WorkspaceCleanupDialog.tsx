import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Trash2, Image, BarChart3, AlertTriangle } from 'lucide-react';
import { useAppState } from '@/hooks/useAppState';

interface WorkspaceCleanupDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirmCleanup: (options: CleanupOptions) => Promise<void>;
}

export interface CleanupOptions {
  clearImages: boolean;
  clearAnalyses: boolean;
  clearGroups: boolean;
}

export const WorkspaceCleanupDialog: React.FC<WorkspaceCleanupDialogProps> = ({
  isOpen,
  onClose,
  onConfirmCleanup
}) => {
  const { uploadedImages, analyses, imageGroups } = useAppState();
  const [isProcessing, setIsProcessing] = useState(false);
  const [options, setOptions] = useState<CleanupOptions>({
    clearImages: true,
    clearAnalyses: true,
    clearGroups: true
  });

  const imageCount = uploadedImages?.length || 0;
  const analysisCount = analyses?.length || 0;
  const groupCount = imageGroups?.length || 0;
  const totalItems = imageCount + analysisCount + groupCount;

  const handleConfirm = async () => {
    if (totalItems === 0) {
      onClose();
      return;
    }

    setIsProcessing(true);
    try {
      await onConfirmCleanup(options);
      onClose();
    } catch (error) {
      console.error('Cleanup failed:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleOptionChange = (option: keyof CleanupOptions, checked: boolean) => {
    setOptions(prev => ({ ...prev, [option]: checked }));
  };

  if (totalItems === 0) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Trash2 className="h-5 w-5" />
              Workspace Clean Up
            </DialogTitle>
            <DialogDescription>
              Your default workspace is already clean. There are no items to remove.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Trash2 className="h-5 w-5" />
            Clean Up Default Workspace
          </DialogTitle>
          <DialogDescription>
            Choose what to remove from your default workspace. This will help organize your data and improve performance.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="bg-muted/50 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="h-4 w-4 text-warning" />
              <span className="text-sm font-medium">Current Workspace Contents</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div className="flex items-center gap-2">
                <Image className="h-4 w-4 text-muted-foreground" />
                <Badge variant="outline">{imageCount} images</Badge>
              </div>
              <div className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
                <Badge variant="outline">{analysisCount} analyses</Badge>
              </div>
              <div className="flex items-center gap-2">
                <Trash2 className="h-4 w-4 text-muted-foreground" />
                <Badge variant="outline">{groupCount} groups</Badge>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="clear-images"
                checked={options.clearImages}
                onCheckedChange={(checked) => handleOptionChange('clearImages', !!checked)}
                disabled={imageCount === 0}
              />
              <label htmlFor="clear-images" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                Clear uploaded images ({imageCount})
              </label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="clear-analyses"
                checked={options.clearAnalyses}
                onCheckedChange={(checked) => handleOptionChange('clearAnalyses', !!checked)}
                disabled={analysisCount === 0}
              />
              <label htmlFor="clear-analyses" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                Clear analysis results ({analysisCount})
              </label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="clear-groups"
                checked={options.clearGroups}
                onCheckedChange={(checked) => handleOptionChange('clearGroups', !!checked)}
                disabled={groupCount === 0}
              />
              <label htmlFor="clear-groups" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                Clear image groups ({groupCount})
              </label>
            </div>
          </div>

          <div className="bg-destructive/10 rounded-lg p-3">
            <p className="text-sm text-destructive-foreground">
              <strong>Warning:</strong> This action cannot be undone. Consider creating a new project for your data instead.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isProcessing}>
            Cancel
          </Button>
          <Button 
            variant="destructive" 
            onClick={handleConfirm}
            disabled={isProcessing || (!options.clearImages && !options.clearAnalyses && !options.clearGroups)}
          >
            {isProcessing ? 'Cleaning...' : 'Clean Up Workspace'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};