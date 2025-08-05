/**
 * Analysis Integration Service - Standardizes edge function responses
 * Implements Phase 2 of the validation fix plan
 */

import { AnalysisDataMapper } from './AnalysisDataMapper';
import { AnalysisValidator } from '@/utils/analysisValidator';
import { SummaryValidator } from '@/utils/summaryValidation';
import { UXAnalysis } from '@/types/ux-analysis';

export interface IntegrationResponse {
  success: boolean;
  analysis?: UXAnalysis;
  error?: string;
  warnings?: string[];
  metadata?: {
    processingTime?: number;
    dataSource: 'edge-function' | 'cache' | 'fallback';
    validationApplied: boolean;
  };
}

export class AnalysisIntegrationService {
  
  /**
   * Processes edge function response with standardized validation
   */
  static processEdgeFunctionResponse(
    rawResponse: any, 
    bypassValidation: boolean = false
  ): IntegrationResponse {
    const startTime = performance.now();
    const warnings: string[] = [];

    console.log('🔄 AnalysisIntegrationService: Processing edge function response...', {
      hasResponse: !!rawResponse,
      responseType: typeof rawResponse,
      responseKeys: rawResponse ? Object.keys(rawResponse) : [],
      bypassValidation
    });

    try {
      // Handle error responses
      if (rawResponse?.error) {
        return {
          success: false,
          error: rawResponse.error,
          warnings,
          metadata: {
            processingTime: performance.now() - startTime,
            dataSource: 'edge-function',
            validationApplied: false
          }
        };
      }

      // Extract analysis data from various response formats
      let analysisData = rawResponse;
      
      if (rawResponse?.analysis) {
        analysisData = rawResponse.analysis;
      } else if (rawResponse?.data) {
        analysisData = rawResponse.data;
      }

      // Skip validation for natural analysis
      if (bypassValidation || analysisData?._isNaturalAnalysis) {
        console.log('🚀 AnalysisIntegrationService: Bypassing validation for natural analysis');
        return {
          success: true,
          analysis: analysisData,
          warnings,
          metadata: {
            processingTime: performance.now() - startTime,
            dataSource: 'edge-function',
            validationApplied: false
          }
        };
      }

      // Apply data mapping (snake_case to camelCase)
      const mappedData = AnalysisDataMapper.mapBackendToFrontend(analysisData);
      
      // Validate summary structure before full validation
      if (mappedData.summary) {
        const summaryValidation = SummaryValidator.validateSummaryObject(mappedData.summary);
        if (!summaryValidation.isValid) {
          warnings.push(`Summary validation issues: ${summaryValidation.missingProperties.join(', ')}`);
          // Apply summary fix
          mappedData.summary = SummaryValidator.createValidSummary(mappedData.summary, analysisData);
        }
        warnings.push(...summaryValidation.warnings);
      }

      // Apply full validation and normalization
      const validationResult = AnalysisValidator.validateAndNormalize(mappedData);
      warnings.push(...validationResult.warnings);

      console.log('✅ AnalysisIntegrationService: Processing complete', {
        validationApplied: true,
        warningsCount: warnings.length,
        hasValidData: validationResult.isValid
      });

      return {
        success: true,
        analysis: validationResult.data,
        warnings,
        metadata: {
          processingTime: performance.now() - startTime,
          dataSource: 'edge-function',
          validationApplied: true
        }
      };

    } catch (error) {
      console.error('❌ AnalysisIntegrationService: Processing failed', error);
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown processing error',
        warnings,
        metadata: {
          processingTime: performance.now() - startTime,
          dataSource: 'edge-function',
          validationApplied: false
        }
      };
    }
  }

  /**
   * Creates a standardized response wrapper for edge functions
   */
  static createStandardResponse(
    analysis: any, 
    success: boolean = true, 
    metadata: any = {}
  ) {
    return {
      success,
      analysis,
      timestamp: new Date().toISOString(),
      metadata: {
        version: '1.0',
        source: 'enhanced-pipeline',
        ...metadata
      }
    };
  }

  /**
   * Validates required fields for analysis response
   */
  static validateResponseStructure(response: any): { valid: boolean; issues: string[] } {
    const issues: string[] = [];

    if (!response) {
      issues.push('Response is null or undefined');
      return { valid: false, issues };
    }

    if (typeof response !== 'object') {
      issues.push('Response is not an object');
      return { valid: false, issues };
    }

    if (!response.hasOwnProperty('success')) {
      issues.push('Response missing success field');
    }

    if (response.success && !response.analysis) {
      issues.push('Successful response missing analysis data');
    }

    if (!response.success && !response.error) {
      issues.push('Failed response missing error message');
    }

    return { valid: issues.length === 0, issues };
  }
}