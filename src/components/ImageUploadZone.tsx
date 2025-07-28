import React, { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, Image, FileText, Loader2 } from 'lucide-react';

interface ImageUploadZoneProps {
  onImageUpload: (files: File[]) => void;
  isUploading?: boolean;
}

export const ImageUploadZone: React.FC<ImageUploadZoneProps> = ({ onImageUpload, isUploading = false }) => {
  const onDrop = useCallback((acceptedFiles: File[]) => {
    onImageUpload(acceptedFiles);
  }, [onImageUpload]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg', '.svg', '.gif'],
      'text/html': ['.html'],
    },
    multiple: true,
    disabled: isUploading,
  });

  return (
    <div
      {...getRootProps()}
      className={`
        max-w-lg mx-auto p-12 border-2 border-dashed rounded-2xl 
        transition-all duration-300 cursor-pointer
        ${isDragActive 
          ? 'border-primary bg-primary/5 scale-105' 
          : 'border-border bg-card hover:border-primary/50 hover:bg-accent/20'
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
            {isUploading ? 'Processing files...' : 
             isDragActive ? 'Drop your files here' : 'Upload Design Files'}
          </h3>
          <p className="text-muted-foreground">
            {isUploading ? 'Uploading and analyzing your images' :
             'Drag and drop your design files or click to browse'}
          </p>
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
          Multiple files supported • Max 10MB per file
        </div>
      </div>
    </div>
  );
};