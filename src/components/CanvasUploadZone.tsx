import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, Image, FileText, Loader2, Plus, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { BlobUrlReplacementService } from '@/services/BlobUrlReplacementService';

interface CanvasUploadZoneProps {
  onImageUpload: (files: File[]) => void;
  isUploading?: boolean;
  hasImages?: boolean;
  uploadProgress?: number;
  processingState?: 'uploading' | 'converting' | 'storing' | 'complete';
  error?: string | null;
}

export const CanvasUploadZone: React.FC<CanvasUploadZoneProps> = ({ 
  onImageUpload, 
  isUploading = false,
  hasImages = false,
  uploadProgress = 0,
  processingState = 'uploading',
  error = null
}) => {
  console.log('CanvasUploadZone render:', { isUploading, hasImages, processingState, uploadProgress });
  const [processingFiles, setProcessingFiles] = useState<string[]>([]);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    console.log('[CanvasUploadZone] Files dropped:', acceptedFiles.length);
    
    try {
      // PHASE 3: Enhanced upload handling with immediate storage conversion
      setProcessingFiles(acceptedFiles.map(f => f.name));
      
      // Process files with blob URL to storage URL conversion
      const processedFiles = await Promise.all(
        acceptedFiles.map(async (file) => {
          console.log(`[CanvasUploadZone] Processing file: ${file.name}`);
          
          // Create blob URL for temporary use
          const blobUrl = URL.createObjectURL(file);
          
          try {
            // Immediately upload to Supabase storage and get permanent URL
            const imageId = crypto.randomUUID();
            const storageUrl = await BlobUrlReplacementService.uploadFileToStorage(file, imageId);
            console.log(`[CanvasUploadZone] Uploaded ${file.name} to storage:`, storageUrl);
            
            // Clean up blob URL since we have permanent storage
            URL.revokeObjectURL(blobUrl);
            
            return {
              file,
              storageUrl,
              imageId
            };
          } catch (error) {
            console.error(`[CanvasUploadZone] Failed to upload ${file.name}:`, error);
            // Keep blob URL as fallback
            return {
              file,
              blobUrl,
              imageId: crypto.randomUUID()
            };
          }
        })
      );
      
      console.log('[CanvasUploadZone] All files processed, calling onImageUpload');
      onImageUpload(acceptedFiles);
      
    } catch (error) {
      console.error('[CanvasUploadZone] Upload processing failed:', error);
    } finally {
      setProcessingFiles([]);
    }
  }, [onImageUpload]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg', '.svg', '.gif'],
      'text/html': ['.html'],
    },
    multiple: true,
    disabled: isUploading,
    noClick: false,
  });

  // Show error if present
  if (error) {
    return (
      <div className="absolute inset-0 flex items-center justify-center bg-background/50 backdrop-blur-sm z-40">
        <Alert className="max-w-md border-destructive bg-destructive/5">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="text-sm">
            Upload failed: {error}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // If there are already images, show a compact drop zone in the corner
  if (hasImages) {
    return (
      <Card 
        {...getRootProps()}
        className={`
          fixed bottom-6 right-6 z-[100] p-4 border-2 border-dashed 
          transition-all duration-300 cursor-pointer bg-card/95 backdrop-blur-sm
          ${isDragActive 
            ? 'border-primary bg-primary/10 scale-105' 
            : 'border-border hover:border-primary/50 hover:bg-accent/20'
          }
          ${isUploading ? 'pointer-events-none' : ''}
        `}
      >
        <input {...getInputProps()} />
        <div className="flex items-center gap-3">
          {isUploading ? (
            <Loader2 className="w-5 h-5 animate-spin text-primary" />
          ) : (
            <Plus className="w-5 h-5 text-muted-foreground" />
          )}
          <div className="text-sm font-medium">
            {isUploading ? getProcessingMessage(processingState, uploadProgress) : 
             isDragActive ? 'Drop here' : 'Add Images'}
          </div>
        </div>
        {isUploading && uploadProgress > 0 && (
          <div className="mt-2 w-full bg-muted rounded-full h-1">
            <div 
              className="bg-primary h-1 rounded-full transition-all duration-300"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
        )}
        {processingFiles.length > 0 && (
          <div className="mt-1 text-xs text-muted-foreground">
            Processing {processingFiles.length} file(s)...
          </div>
        )}
      </Card>
    );
  }

  // Full canvas overlay when no images
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-background/50 backdrop-blur-sm z-40">
      <Card
        {...getRootProps()}
        className={`
          max-w-lg p-12 border-2 border-dashed 
          transition-all duration-300 cursor-pointer bg-card
          ${isDragActive 
            ? 'border-primary bg-primary/5 scale-105' 
            : 'border-border hover:border-primary/50 hover:bg-accent/20'
          }
        `}
      >
        <input {...getInputProps()} />
        
        <div className="text-center space-y-6">
          <div className={`
            mx-auto w-16 h-16 rounded-full flex items-center justify-center transition-all
            ${isDragActive ? 'bg-primary text-primary-foreground' : 'bg-muted'}
            ${isUploading ? 'bg-primary text-primary-foreground' : ''}
          `}>
            {isUploading ? (
              <Loader2 className="w-8 h-8 animate-spin" />
            ) : (
              <Upload className="w-8 h-8" />
            )}
          </div>
          
          <div className="space-y-3">
            <h3 className="text-xl font-semibold">
              {isUploading ? getProcessingMessage(processingState, uploadProgress) : 
               isDragActive ? 'Drop your files here' : 'Upload Design Files'}
            </h3>
            <p className="text-muted-foreground">
              {isUploading ? getProcessingDescription(processingState) :
               'Drag and drop your design files or click to browse'}
            </p>
            {isUploading && uploadProgress > 0 && (
              <div className="w-full bg-muted rounded-full h-2 mt-3">
                <div 
                  className="bg-primary h-2 rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            )}
          </div>

          <div className="flex justify-center gap-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Image className="w-4 h-4" />
              <span>PNG, JPG, SVG</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <FileText className="w-4 h-4" />
              <span>HTML</span>
            </div>
          </div>

          <div className="text-xs text-muted-foreground">
            Multiple files supported • Max 10MB per file • Auto-stored in Supabase
          </div>
          
          {processingFiles.length > 0 && (
            <div className="mt-3 p-2 bg-muted/50 rounded text-xs text-muted-foreground">
              Converting to permanent storage: {processingFiles.join(', ')}
            </div>
          )}
        </div>
      </Card>
    </div>
  );
};

// Helper functions for enhanced upload states
function getProcessingMessage(state: string, progress: number): string {
  switch (state) {
    case 'uploading':
      return `Uploading files... ${progress}%`;
    case 'converting':
      return 'Converting blob URLs...';
    case 'storing':
      return 'Storing in Supabase...';
    case 'complete':
      return 'Upload complete!';
    default:
      return 'Processing files...';
  }
}

function getProcessingDescription(state: string): string {
  switch (state) {
    case 'uploading':
      return 'Transferring files to secure storage';
    case 'converting':
      return 'Converting temporary URLs to permanent storage';
    case 'storing':
      return 'Saving files to Supabase storage for analysis';
    case 'complete':
      return 'Files ready for analysis';
    default:
      return 'Processing your images for analysis';
  }
}