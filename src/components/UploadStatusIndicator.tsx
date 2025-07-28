import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Loader2, CheckCircle, AlertCircle, Upload } from 'lucide-react';

interface UploadStatusIndicatorProps {
  isUploading: boolean;
  progress?: number;
  currentFile?: string;
  error?: string;
  success?: boolean;
}

export const UploadStatusIndicator: React.FC<UploadStatusIndicatorProps> = ({
  isUploading,
  progress = 0,
  currentFile,
  error,
  success
}) => {
  if (!isUploading && !error && !success) {
    return null;
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          {isUploading && (
            <>
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
              <div className="flex-1">
                <div className="text-sm font-medium">
                  {currentFile ? `Processing ${currentFile}...` : 'Uploading files...'}
                </div>
                <Progress value={progress} className="mt-2 h-2" />
              </div>
            </>
          )}
          
          {success && (
            <>
              <CheckCircle className="h-5 w-5 text-green-500" />
              <div className="text-sm font-medium text-green-700">
                Upload completed successfully!
              </div>
            </>
          )}
          
          {error && (
            <>
              <AlertCircle className="h-5 w-5 text-destructive" />
              <div className="flex-1">
                <div className="text-sm font-medium text-destructive">
                  Upload failed
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  {error}
                </div>
              </div>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
};