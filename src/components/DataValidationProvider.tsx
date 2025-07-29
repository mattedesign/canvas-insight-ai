import React, { createContext, useContext, useCallback, ReactNode } from 'react';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface ValidationError {
  field: string;
  message: string;
  severity: 'warning' | 'error';
}

interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationError[];
}

interface DataValidationContextType {
  validateImageData: (imageData: any) => ValidationResult;
  validateAnalysisData: (analysisData: any) => ValidationResult;
  validateGroupData: (groupData: any) => ValidationResult;
  logValidationIssue: (issue: ValidationError, context: string) => Promise<void>;
}

const DataValidationContext = createContext<DataValidationContextType | undefined>(undefined);

export const useDataValidation = () => {
  const context = useContext(DataValidationContext);
  if (!context) {
    throw new Error('useDataValidation must be used within DataValidationProvider');
  }
  return context;
};

interface Props {
  children: ReactNode;
}

export const DataValidationProvider: React.FC<Props> = ({ children }) => {
  const { toast } = useToast();

  const validateImageData = useCallback((imageData: any): ValidationResult => {
    const errors: ValidationError[] = [];
    const warnings: ValidationError[] = [];

    // Required fields validation
    if (!imageData.id) {
      errors.push({
        field: 'id',
        message: 'Image ID is required',
        severity: 'error'
      });
    }

    if (!imageData.filename || typeof imageData.filename !== 'string') {
      errors.push({
        field: 'filename',
        message: 'Valid filename is required',
        severity: 'error'
      });
    }

    if (!imageData.storage_path || typeof imageData.storage_path !== 'string') {
      errors.push({
        field: 'storage_path',
        message: 'Storage path is required',
        severity: 'error'
      });
    }

    // Dimensions validation
    if (!imageData.dimensions || typeof imageData.dimensions !== 'object') {
      errors.push({
        field: 'dimensions',
        message: 'Image dimensions are required',
        severity: 'error'
      });
    } else {
      if (!imageData.dimensions.width || !imageData.dimensions.height) {
        errors.push({
          field: 'dimensions',
          message: 'Width and height are required',
          severity: 'error'
        });
      }
    }

    // File size validation
    if (imageData.file_size && imageData.file_size > 52428800) { // 50MB
      warnings.push({
        field: 'file_size',
        message: 'File size exceeds recommended limit (50MB)',
        severity: 'warning'
      });
    }

    // File type validation
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (imageData.file_type && !allowedTypes.includes(imageData.file_type)) {
      errors.push({
        field: 'file_type',
        message: 'Invalid file type. Only JPEG, PNG, WebP, and GIF are allowed',
        severity: 'error'
      });
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }, []);

  const validateAnalysisData = useCallback((analysisData: any): ValidationResult => {
    const errors: ValidationError[] = [];
    const warnings: ValidationError[] = [];

    // Required fields validation
    if (!analysisData.image_id) {
      errors.push({
        field: 'image_id',
        message: 'Image ID is required for analysis',
        severity: 'error'
      });
    }

    // Visual annotations validation
    if (analysisData.visual_annotations) {
      if (!Array.isArray(analysisData.visual_annotations)) {
        errors.push({
          field: 'visual_annotations',
          message: 'Visual annotations must be an array',
          severity: 'error'
        });
      } else {
        analysisData.visual_annotations.forEach((annotation: any, index: number) => {
          if (!annotation.id || !annotation.type || !annotation.title) {
            errors.push({
              field: `visual_annotations[${index}]`,
              message: 'Annotation must have id, type, and title',
              severity: 'error'
            });
          }
          
          if (annotation.x === undefined || annotation.y === undefined) {
            warnings.push({
              field: `visual_annotations[${index}]`,
              message: 'Annotation position (x, y) should be specified',
              severity: 'warning'
            });
          }
        });
      }
    }

    // Suggestions validation
    if (analysisData.suggestions) {
      if (!Array.isArray(analysisData.suggestions)) {
        errors.push({
          field: 'suggestions',
          message: 'Suggestions must be an array',
          severity: 'error'
        });
      } else {
        analysisData.suggestions.forEach((suggestion: any, index: number) => {
          if (!suggestion.id || !suggestion.category || !suggestion.title) {
            errors.push({
              field: `suggestions[${index}]`,
              message: 'Suggestion must have id, category, and title',
              severity: 'error'
            });
          }
        });
      }
    }

    // Summary validation
    if (analysisData.summary) {
      if (typeof analysisData.summary !== 'object') {
        errors.push({
          field: 'summary',
          message: 'Summary must be an object',
          severity: 'error'
        });
      } else {
        if (analysisData.summary.overallScore !== undefined) {
          const score = analysisData.summary.overallScore;
          if (typeof score !== 'number' || score < 0 || score > 100) {
            errors.push({
              field: 'summary.overallScore',
              message: 'Overall score must be a number between 0 and 100',
              severity: 'error'
            });
          }
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }, []);

  const validateGroupData = useCallback((groupData: any): ValidationResult => {
    const errors: ValidationError[] = [];
    const warnings: ValidationError[] = [];

    // Required fields validation
    if (!groupData.name || typeof groupData.name !== 'string') {
      errors.push({
        field: 'name',
        message: 'Group name is required',
        severity: 'error'
      });
    }

    if (!groupData.project_id) {
      errors.push({
        field: 'project_id',
        message: 'Project ID is required for group',
        severity: 'error'
      });
    }

    if (!groupData.color || typeof groupData.color !== 'string') {
      errors.push({
        field: 'color',
        message: 'Group color is required',
        severity: 'error'
      });
    }

    // Position validation
    if (!groupData.position || typeof groupData.position !== 'object') {
      errors.push({
        field: 'position',
        message: 'Group position is required',
        severity: 'error'
      });
    } else {
      if (groupData.position.x === undefined || groupData.position.y === undefined) {
        errors.push({
          field: 'position',
          message: 'Position must include x and y coordinates',
          severity: 'error'
        });
      }
    }

    // Name length validation
    if (groupData.name && groupData.name.length > 100) {
      warnings.push({
        field: 'name',
        message: 'Group name is longer than recommended (100 characters)',
        severity: 'warning'
      });
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }, []);

  const logValidationIssue = useCallback(async (issue: ValidationError, context: string) => {
    try {
      await supabase.from('error_logs').insert({
        error_type: 'data_validation',
        error_message: issue.message,
        url: window.location.href,
        user_agent: navigator.userAgent,
        session_id: `validation-${Date.now()}`,
        metadata: {
          field: issue.field,
          severity: issue.severity,
          context,
          timestamp: new Date().toISOString()
        }
      });
    } catch (dbError) {
      console.error('Failed to log validation issue:', dbError);
    }
  }, []);

  const value: DataValidationContextType = {
    validateImageData,
    validateAnalysisData,
    validateGroupData,
    logValidationIssue
  };

  return (
    <DataValidationContext.Provider value={value}>
      {children}
    </DataValidationContext.Provider>
  );
};