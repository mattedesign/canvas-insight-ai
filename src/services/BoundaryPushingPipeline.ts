import { supabase } from '@/integrations/supabase/client';
import { pipelineConfig } from '@/config/pipelineConfig';
import { PipelineError, ModelExecutionError } from '@/types/pipelineErrors';
import { ContextDetectionService } from './ContextDetectionService';
import { DynamicPromptBuilder } from './DynamicPromptBuilder';
import { AnalysisContext } from '@/types/contextTypes';
import { AdaptiveTimeoutCalculator, ImageComplexity } from '@/config/adaptiveTimeoutConfig';
import { ProgressPersistenceService } from './ProgressPersistenceService';
import { ModelSelectionOptimizer } from './ModelSelectionOptimizer';
import { ValidationService } from './ValidationService';
import { SummaryGenerator } from './SummaryGenerator';
import { ArrayNumericSafety } from '@/utils/ArrayNumericSafety';
import { PipelineRecoveryService } from './PipelineRecoveryService';

interface ModelResult {
  model: string;
  success: boolean;
  data?: any;
  error?: Error;
  metrics: {
    startTime: number;
    endTime: number;
    tokensUsed?: number;
  };
}

interface StageResult {
  stage: string;
  results: ModelResult[];
  fusedData?: any;
  confidence: number;
}

export class BoundaryPushingPipeline {
  private abortController: AbortController | null = null;
  private contextDetector: ContextDetectionService;
  private promptBuilder: DynamicPromptBuilder;
  private analysisContext: AnalysisContext | null = null;
  // PHASE 3: Performance Enhancement Services
  private progressService: ProgressPersistenceService;
  private modelOptimizer: ModelSelectionOptimizer;
  private currentRequestId: string | null = null;
  // PHASE 1: Validation Service
  private validationService: ValidationService;
  // PHASE 2: Summary Generator
  private summaryGenerator: SummaryGenerator;
  // PHASE 3: Array & Numeric Safety
  private arraySafety: ArrayNumericSafety;
  // PHASE 5: Pipeline Recovery Service
  private recoveryService: PipelineRecoveryService;

  constructor() {
    this.contextDetector = new ContextDetectionService();
    this.promptBuilder = new DynamicPromptBuilder();
    // PHASE 3: Initialize performance enhancement services
    this.progressService = ProgressPersistenceService.getInstance();
    this.modelOptimizer = ModelSelectionOptimizer.getInstance();
    // PHASE 1: Initialize validation service
    this.validationService = ValidationService.getInstance();
    // PHASE 2: Initialize summary generator
    this.summaryGenerator = SummaryGenerator.getInstance();
    // PHASE 3: Initialize array & numeric safety
    this.arraySafety = ArrayNumericSafety.getInstance();
    // PHASE 5: Initialize pipeline recovery service
    this.recoveryService = PipelineRecoveryService.getInstance();
  }

  async execute(
    imageUrl: string,
    userContext: string,
    onProgress?: (progress: number, stage: string) => void
  ): Promise<any> {
    this.abortController = new AbortController();
    const startTime = Date.now();
    
    // PHASE 3: Generate request ID and check for resumption
    this.currentRequestId = this.progressService.generateRequestId(imageUrl, userContext);
    const resumption = this.progressService.checkResumption(this.currentRequestId);
    
    console.log('🚀 BoundaryPushingPipeline.execute() called with:', {
      imageUrl: imageUrl ? 'provided' : 'missing',
      userContext: userContext ? `"${userContext.substring(0, 50)}..."` : 'empty',
      hasProgressCallback: !!onProgress,
      requestId: this.currentRequestId,
      canResume: resumption.canResume,
      lastStage: resumption.lastStage,
      timestamp: new Date().toISOString()
    });
    
      console.log('🔧 Pipeline configuration:', {
        contextDetectionEnabled: pipelineConfig.contextDetection.enabled,
        availableModels: {
          vision: pipelineConfig.models.vision.primary,
          analysis: pipelineConfig.models.analysis.primary,
          metadata: pipelineConfig.models.metadata.primary
        },
        qualitySettings: pipelineConfig.quality
      });
    
    try {
      // PHASE 3: Save context detection progress
      this.progressService.saveProgress(this.currentRequestId!, imageUrl, userContext, 'context-detection', 5);
      onProgress?.(2, 'Analyzing image context...');
      
      let imageContext: any;
      try {
        imageContext = await this.contextDetector.detectImageContext(imageUrl);
      } catch (contextError) {
        console.error('[Pipeline] Context detection failed, using fallback:', contextError);
        onProgress?.(4, 'Context detection failed, continuing with fallback...');
        
        // Create a minimal fallback context to continue analysis
        imageContext = {
          primaryType: 'app',
          subTypes: ['fallback'],
          domain: 'general',
          complexity: 'moderate',
          userIntent: ['general analysis'],
          platform: 'web'
        };
      }
      
      onProgress?.(5, 'Understanding user needs...');
      const userContextParsed = this.contextDetector.inferUserContext(userContext);
      
      // Create unified analysis context
      this.analysisContext = this.contextDetector.createAnalysisContext(
        imageContext,
        userContextParsed
      );
      
      console.log('📊 Analysis Context Created:', {
        imageType: this.analysisContext.image.primaryType,
        userRole: this.analysisContext.user.inferredRole,
        confidence: this.analysisContext.confidence,
        focusAreas: this.analysisContext.focusAreas,
        industryStandards: this.analysisContext.industryStandards
      });

      // Check if clarification is needed
      if (this.analysisContext.clarificationNeeded && this.analysisContext.clarificationQuestions) {
        onProgress?.(8, 'Context clarification needed...');
        
        // Return early with clarification request
        return {
          requiresClarification: true,
          questions: this.analysisContext.clarificationQuestions,
          partialContext: this.analysisContext,
          resumeToken: this.generateResumeToken()
        };
      }

      // PHASE 3: Check for resumption from vision stage
      let visionResults: StageResult;
      if (resumption.canResume && resumption.lastStage === 'vision' && resumption.resumeData?.visionData) {
        console.log('📋 Resuming from vision stage with cached data');
        onProgress?.(30, 'Resuming from vision analysis...');
        visionResults = {
          stage: 'vision',
          results: [],
          fusedData: resumption.resumeData.visionData,
          confidence: 0.8
        };
      } else {
        // Stage 1: Vision Extraction with Context (30% progress)
        onProgress?.(10, `Initializing vision models for ${imageContext.primaryType} analysis...`);
        visionResults = await this.executeVisionStage(imageUrl);
        onProgress?.(30, 'Vision analysis complete');
        
        // PHASE 3: Save vision progress
        this.progressService.saveProgress(this.currentRequestId!, imageUrl, userContext, 'vision', 30, visionResults.fusedData);
      }

      // Stage 2: Deep Analysis with Context (60% progress)
      onProgress?.(40, `Performing ${this.analysisContext.user.inferredRole || 'comprehensive'} analysis...`);
      const analysisResults = await this.executeAnalysisStage(
        imageUrl,
        visionResults.fusedData,
        userContext
      );
      onProgress?.(60, 'Deep analysis complete');

      // Stage 3: Synthesis with Context (90% progress)
      onProgress?.(70, 'Synthesizing personalized insights...');
      const synthesisResults = await this.executeSynthesisStage(
        visionResults,
        analysisResults,
        userContext
      );
      onProgress?.(90, 'Synthesis complete');

      // Final: Store Results with Context (100% progress)
      onProgress?.(95, 'Finalizing results...');
      const finalResult = await this.storeResults({
        visionResults,
        analysisResults,
        synthesisResults,
        executionTime: Date.now() - startTime,
        modelsUsed: this.getUsedModels([visionResults, analysisResults, synthesisResults]),
        analysisContext: this.analysisContext // CRITICAL: Store context for display
      });

      onProgress?.(100, 'Analysis complete!');
      return finalResult;

    } catch (error) {
      // PHASE 5: Enhanced error handling with recovery attempts
      console.error('❌ Pipeline execution failed:', error);
      
      // Attempt recovery if error is recoverable
      if (this.recoveryService.isTransientError(error as Error)) {
        console.log('🔄 Attempting pipeline recovery...');
        
        try {
          const recoveryResult = await this.recoveryService.retryWithBackoff(
            () => this.executeRetryableOperation(imageUrl, userContext, onProgress),
            3,
            2000,
            'pipeline-execution'
          );
          
          if (recoveryResult.success && recoveryResult.result) {
            console.log('✅ Pipeline recovery successful');
            return recoveryResult.result;
          }
        } catch (recoveryError) {
          console.warn('⚠️ Pipeline recovery failed:', recoveryError);
        }
      }

      if (error instanceof PipelineError) {
        throw error;
      }
      throw new PipelineError(
        'Pipeline execution failed',
        'unknown',
        { originalError: (error as Error).message },
        false
      );
    }
  }

  /**
   * Resume analysis after clarification
   */
  async resumeWithClarification(
    resumeToken: string,
    clarificationResponses: Record<string, string>,
    imageUrl: string,
    userContext: string,
    onProgress?: (progress: number, stage: string) => void
  ): Promise<any> {
    // Process clarification to enhance context
    const clarifiedContext = await this.contextDetector.processClarificationResponses(
      this.analysisContext!,
      clarificationResponses
    );

    this.analysisContext = clarifiedContext;
    
    console.log('📊 Enhanced Analysis Context after clarification:', {
      imageType: this.analysisContext.image.primaryType,
      userRole: this.analysisContext.user.inferredRole,
      confidence: this.analysisContext.confidence,
      focusAreas: this.analysisContext.focusAreas,
      industryStandards: this.analysisContext.industryStandards
    });
    
    // Continue with enhanced context - skip context detection and go straight to vision
    onProgress?.(10, 'Proceeding with enhanced context...');
    
    try {
      // Stage 1: Vision Extraction with Enhanced Context (30% progress)
      onProgress?.(15, `Analyzing ${this.analysisContext.image.primaryType} interface...`);
      const visionResults = await this.executeVisionStage(imageUrl);
      onProgress?.(30, 'Vision analysis complete');

      // Stage 2: Deep Analysis with Context (80% progress)
      onProgress?.(35, `Performing ${this.analysisContext.analysisDepth} analysis...`);
      const analysisResults = await this.executeAnalysisStage(
        imageUrl,
        visionResults.fusedData,
        userContext
      );
      onProgress?.(80, 'Analysis complete');

      // Stage 3: Synthesis and Recommendations (100% progress)
      onProgress?.(85, 'Generating recommendations...');
      const synthesisResults = await this.executeSynthesisStage(
        visionResults,
        analysisResults,
        userContext
      );
      onProgress?.(100, 'Analysis complete');

      // Store and return final results
      return await this.storeResults({
        visionResults,
        analysisResults,
        synthesisResults,
        executionTime: Date.now() - Date.now(), // Will be calculated properly in real implementation
        modelsUsed: this.getUsedModels([visionResults, analysisResults, synthesisResults]),
        analysisContext: this.analysisContext
      });
      
    } catch (error) {
      console.error('❌ Pipeline execution failed during resume:', error);
      throw new PipelineError(
        'Pipeline execution failed',
        'resume',
        { originalError: error.message },
        false
      );
    }
  }

  private generateResumeToken(): string {
    // Generate a token to resume analysis after clarification
    return `resume_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private async executeVisionStage(imageUrl: string): Promise<StageResult> {
    // PHASE 3: Optimize model selection based on context and performance
    const optimizedSelection = this.modelOptimizer.selectOptimalModels('vision', this.analysisContext);
    const models = [...optimizedSelection.primaryModels, ...optimizedSelection.secondaryModels];
    
    if (models.length === 0) {
      throw new PipelineError(
        'No vision models available. Please configure API keys.',
        'vision',
        { requiredKeys: ['OPENAI_API_KEY', 'ANTHROPIC_API_KEY'] },
        false
      );
    }

    // Build dynamic prompt based on context
    if (!this.analysisContext) {
      throw new PipelineError(
        'Analysis context is required for vision stage execution',
        'vision',
        { missingContext: true },
        false
      );
    }
    
    const dynamicPrompt = await this.promptBuilder.buildContextualPrompt('vision', this.analysisContext);

    // PHASE 3: Use optimized timeout from model selection
    const adaptiveTimeout = optimizedSelection.expectedTimeout || (
      pipelineConfig.execution.adaptiveTimeouts
        ? pipelineConfig.execution.timeoutCalculator.calculateTimeout('vision', 'moderate', models.length)
        : pipelineConfig.models.metadata.timeout
    );

    console.log('👁️ Vision Stage - Optimized execution plan:', {
      selectedModels: models,
      reasoning: optimizedSelection.reasoning,
      expectedTimeout: adaptiveTimeout
    });

    const results = await this.executeModelsInParallel(
      models,
      async (model) => this.executeSingleVisionModel(model, imageUrl, dynamicPrompt),
      adaptiveTimeout
    );

    // PHASE 3: Record model performance for future optimization
    results.forEach(result => {
      const responseTime = result.metrics.endTime - result.metrics.startTime;
      this.modelOptimizer.recordPerformance(
        result.model,
        responseTime,
        result.success,
        result.success ? 0.8 : 0.2 // Simple quality score based on success
      );
    });
    const successfulResults = results.filter(r => r.success);
    if (successfulResults.length === 0) {
      // PHASE 3: Mark request as failed
      if (this.currentRequestId) {
        this.progressService.failRequest(this.currentRequestId, 'All vision models failed');
      }
      
      throw new PipelineError(
        'All vision models failed. Check API keys and try again.',
        'vision',
        { 
          failedModels: results.map(r => ({ model: r.model, error: r.error?.message })),
          requiredKeys: this.checkApiKeys()
        },
        true
      );
    }

    const fusedVision = await this.fuseVisionResults(successfulResults);
    
    return {
      stage: 'vision',
      results,
      fusedData: fusedVision,
      confidence: this.calculateConfidence(successfulResults, results.length)
    };
  }

  private async executeSingleVisionModel(
    model: string,
    imageUrl: string,
    prompt: string
  ): Promise<any> {
    const payload = {
      imageUrl,
      model,
      prompt,
      stage: 'vision',
      systemPrompt: this.getSystemPromptForContext()
    };
    
    console.log('👁️ Vision Stage - Sending payload:', {
      model,
      stage: 'vision',
      hasImage: !!imageUrl,
      promptLength: prompt.length,
      timestamp: new Date().toISOString()
    });
    
    const startTime = Date.now();
    const { data, error } = await supabase.functions.invoke('ux-analysis', {
      body: payload
    });

    if (error) {
      console.error('❌ Vision Stage - Error:', {
        model,
        error: error.message,
        executionTime: Date.now() - startTime
      });
      throw error;
    }
    
    console.log('✅ Vision Stage - Success:', {
      model,
      hasData: !!data,
      executionTime: Date.now() - startTime,
      dataKeys: data ? Object.keys(data) : []
    });
    return data;
  }

  /**
   * PHASE 3: Enhanced Vision Results Fusion with Array Safety
   */
  private async fuseVisionResults(results: ModelResult[]): Promise<any> {
    // PHASE 3: Safe array validation before processing
    if (!this.arraySafety.isValidArray(results, 'fuseVisionResults')) {
      throw new PipelineError(
        'Invalid vision results for fusion',
        'vision-fusion',
        { invalidResults: true },
        false
      );
    }

    const fusedData: any = {
      elements: {},
      layout: {},
      colors: {},
      content: {},
      confidence: {}
    };

    // PHASE 3: Safe element detection merging
    this.arraySafety.safeMap(
      results,
      (result: ModelResult) => {
        const elements = this.arraySafety.safeGetProperty(result, 'data.elements', {}, 'vision-elements');
        if (elements && typeof elements === 'object') {
          Object.entries(elements).forEach(([key, value]) => {
            if (!fusedData.elements[key]) {
              fusedData.elements[key] = [];
            }
            fusedData.elements[key].push({
              ...(value as object),
              detectedBy: result.model
            });
          });
        }
        return result;
      },
      [],
      'vision-element-merging'
    );

    // PHASE 3: Safe layout analysis aggregation
    fusedData.layout = {
      grid: this.detectGridSystem(results),
      hierarchy: this.analyzeHierarchy(results),
      spacing: this.analyzeSpacing(results)
    };

    // PHASE 3: Safe color analysis merging
    const allColors = this.arraySafety.safeFlatMap(
      results,
      (r: ModelResult) => this.arraySafety.safeGetProperty(r, 'data.colors.palette', [], 'color-palette'),
      [],
      'vision-color-merging'
    );

    fusedData.colors = {
      primary: this.findPrimaryColors(allColors),
      secondary: this.findSecondaryColors(allColors),
      contrast: this.analyzeContrast(allColors)
    };

    // PHASE 3: Safe content aggregation
    fusedData.content = this.mergeTextContent(results);
    
    // PHASE 3: Safe confidence score calculation
    fusedData.confidence = {
      overall: this.validationService.safeCalculateConfidence(results),
      byCategory: {
        elements: this.calculateCategoryConfidence(results, 'elements'),
        layout: this.calculateCategoryConfidence(results, 'layout'),
        colors: this.calculateCategoryConfidence(results, 'colors')
      }
    };

    return fusedData;
  }

  private async executeAnalysisStage(
    imageUrl: string,
    visionData: any,
    userContext: string
  ): Promise<StageResult> {
    const models = this.getAvailableModels('analysis');
    
    if (!this.analysisContext) {
      throw new PipelineError(
        'Analysis context is required for analysis stage execution',
        'analysis',
        { missingContext: true },
        false
      );
    }
    
    const dynamicPrompt = await this.promptBuilder.buildContextualPrompt('analysis', this.analysisContext, visionData);

    // PHASE 1: Adaptive Timeout - Calculate timeout based on complexity
    const imageComplexity = pipelineConfig.execution.adaptiveTimeouts
      ? pipelineConfig.execution.timeoutCalculator.detectImageComplexity(visionData)
      : 'moderate';
    
    const adaptiveTimeout = pipelineConfig.execution.adaptiveTimeouts
      ? pipelineConfig.execution.timeoutCalculator.calculateTimeout('analysis', imageComplexity, models.length)
      : pipelineConfig.models.analysis.timeout;

    const results = await this.executeModelsInParallel(
      models,
      async (model) => this.executeSingleAnalysisModel(model, imageUrl, visionData, dynamicPrompt),
      adaptiveTimeout
    );

    // Add Perplexity conversational analysis if available
    if (this.hasPerplexity()) {
      const conversationalAnalysis = await this.executeConversationalAnalysis(
        visionData,
        userContext
      );
      
      results.push({
        model: 'perplexity-sonar',
        success: true,
        data: conversationalAnalysis,
        metrics: {
          startTime: Date.now(),
          endTime: Date.now()
        }
      });
    }

    const successfulResults = results.filter(r => r.success);
    if (successfulResults.length === 0) {
      throw new PipelineError(
        'All analysis models failed', 
        'analysis',
        { results: results.map(r => ({ model: r.model, error: r.error?.message })) },
        true
      );
    }

    const fusedAnalysis = await this.fuseAnalysisResults(successfulResults);
    
    return {
      stage: 'analysis',
      results,
      fusedData: fusedAnalysis,
      confidence: this.calculateConfidence(successfulResults, results.length)
    };
  }

  private async executeSingleAnalysisModel(
    model: string,
    imageUrl: string,
    visionData: any,
    prompt: string
  ): Promise<any> {
    const payload = {
      imageUrl,
      model,
      prompt,
      visionData,
      stage: 'analysis',
      systemPrompt: this.getSystemPromptForContext()
    };
    
    console.log('🧠 Analysis Stage - Sending payload:', {
      model,
      stage: 'analysis',
      hasVisionData: !!visionData,
      promptLength: prompt.length,
      timestamp: new Date().toISOString()
    });
    
    const startTime = Date.now();
    const { data, error } = await supabase.functions.invoke('ux-analysis', {
      body: payload
    });

    if (error) {
      console.error('❌ Analysis Stage - Error:', {
        model,
        error: error.message,
        executionTime: Date.now() - startTime
      });
      throw error;
    }
    
    console.log('✅ Analysis Stage - Success:', {
      model,
      hasData: !!data,
      executionTime: Date.now() - startTime,
      dataKeys: data ? Object.keys(data) : []
    });
    return data;
  }

  /**
   * PHASE 3: Enhanced Analysis Results Fusion with Array Safety
   */
  private async fuseAnalysisResults(results: ModelResult[]): Promise<any> {
    // PHASE 3: Safe array validation
    if (!this.arraySafety.isValidArray(results, 'fuseAnalysisResults')) {
      throw new PipelineError(
        'Invalid analysis results for fusion',
        'analysis-fusion',
        { invalidResults: true },
        false
      );
    }

    const fusedAnalysis: any = {
      usabilityIssues: [],
      accessibilityFindings: [],
      designOpportunities: [],
      businessImpact: {},
      technicalConsiderations: [],
      confidence: {}
    };

    // PHASE 3: Safe merging of all issues with deduplication
    const allUsabilityIssues = this.arraySafety.safeFlatMap(
      results,
      (result: ModelResult) => this.arraySafety.safeGetProperty(result, 'data.usabilityIssues', [], 'usability-issues'),
      [],
      'analysis-usability-merging'
    );

    const allAccessibilityFindings = this.arraySafety.safeFlatMap(
      results,
      (result: ModelResult) => this.arraySafety.safeGetProperty(result, 'data.accessibilityFindings', [], 'accessibility-findings'),
      [],
      'analysis-accessibility-merging'
    );

    const allDesignOpportunities = this.arraySafety.safeFlatMap(
      results,
      (result: ModelResult) => this.arraySafety.safeGetProperty(result, 'data.designOpportunities', [], 'design-opportunities'),
      [],
      'analysis-design-merging'
    );

    // PHASE 3: Safe deduplication
    fusedAnalysis.usabilityIssues = this.deduplicateIssues(allUsabilityIssues);
    fusedAnalysis.accessibilityFindings = this.deduplicateIssues(allAccessibilityFindings);
    fusedAnalysis.designOpportunities = this.deduplicateIssues(allDesignOpportunities);

    // PHASE 3: Safe business impact aggregation
    fusedAnalysis.businessImpact = this.aggregateBusinessImpact(results);

    // PHASE 3: Safe confidence calculation
    fusedAnalysis.confidence = {
      overall: this.validationService.safeCalculateConfidence(results),
      byCategory: {
        usability: this.calculateCategoryConfidence(results, 'usabilityIssues'),
        accessibility: this.calculateCategoryConfidence(results, 'accessibilityFindings'),
        design: this.calculateCategoryConfidence(results, 'designOpportunities')
      }
    };

    return fusedAnalysis;
  }

  private async executeSynthesisStage(
    visionResults: StageResult,
    analysisResults: StageResult,
    userContext: string
  ): Promise<StageResult> {
    const models = this.getAvailableModels('analysis'); // Use analysis models for synthesis
    
    if (!this.analysisContext) {
      throw new PipelineError(
        'Analysis context is required for synthesis stage execution',
        'synthesis',
        { missingContext: true },
        false
      );
    }
    
    const dynamicPrompt = await this.promptBuilder.buildContextualPrompt('synthesis', this.analysisContext, {
      vision: visionResults.fusedData,
      analysis: analysisResults.fusedData
    });

    const results = await this.executeModelsInParallel(
      models,
      async (model) => this.executeSingleSynthesisModel(
        model,
        visionResults.fusedData,
        analysisResults.fusedData,
        dynamicPrompt
      ),
      pipelineConfig.models.analysis.timeout
    );

    const successfulResults = results.filter(r => r.success);
    const fusedSynthesis = await this.fuseSynthesisResults(successfulResults);
    
    return {
      stage: 'synthesis',
      results,
      fusedData: fusedSynthesis,
      confidence: this.calculateConfidence(successfulResults, results.length)
    };
  }

  private async executeSingleSynthesisModel(
    model: string,
    visionData: any,
    analysisData: any,
    prompt: string
  ): Promise<any> {
    const payload = {
      model,
      prompt,
      visionData,
      analysisData,
      stage: 'synthesis',
      systemPrompt: this.getSystemPromptForContext()
    };
    
    console.log('🔬 Synthesis Stage - Sending payload:', {
      model,
      stage: 'synthesis',
      hasVisionData: !!visionData,
      hasAnalysisData: !!analysisData,
      promptLength: prompt.length,
      timestamp: new Date().toISOString()
    });
    
    const startTime = Date.now();
    const { data, error } = await supabase.functions.invoke('ux-analysis', {
      body: payload
    });

    if (error) {
      console.error('❌ Synthesis Stage - Error:', {
        model,
        error: error.message,
        executionTime: Date.now() - startTime
      });
      throw error;
    }
    
    console.log('✅ Synthesis Stage - Success:', {
      model,
      hasData: !!data,
      executionTime: Date.now() - startTime,
      dataKeys: data ? Object.keys(data) : []
    });
    return data;
  }

  private async fuseSynthesisResults(results: ModelResult[]): Promise<any> {
    if (results.length === 0) {
      throw new PipelineError(
        'Synthesis stage failed - no successful model results',
        'synthesis',
        { attemptedModels: results.map(r => r.model) },
        true
      );
    }

    // Use the best result or merge if multiple
    const bestResult = results.reduce((best, current) => {
      return (current.data?.prioritizedActions?.length || 0) > (best.data?.prioritizedActions?.length || 0)
        ? current
        : best;
    });

    const synthesis = bestResult.data;
    if (!synthesis) {
      throw new PipelineError(
        'Synthesis results are invalid - no data returned from models',
        'synthesis',
        { resultModel: bestResult.model },
        true
      );
    }

    // Enhance with priority calculations
    if (synthesis.prioritizedActions) {
      synthesis.prioritizedActions = synthesis.prioritizedActions.map(action => ({
        ...action,
        calculatedPriority: this.calculatePriority(action)
      }));
    }

    // PHASE 2: Enhanced Summary Generation with ValidationService
    if (!synthesis.summary) {
      console.warn('[BoundaryPushingPipeline] Synthesis results missing summary object, generating with SummaryGenerator');
      synthesis.summary = this.summaryGenerator.generateValidSummary({}, synthesis);
    } else {
      // Validate and enhance existing summary
      console.log('[BoundaryPushingPipeline] Validating and enhancing existing summary');
      synthesis.summary = this.summaryGenerator.generateValidSummary(synthesis.summary, synthesis);
    }

    // Log any remaining issues for monitoring
    this.logMissingProperties(synthesis);

    return synthesis;
  }

  private createDefaultSummary(synthesis: any): any {
    return {
      overallScore: this.calculateOverallScore(synthesis),
      categoryScores: this.calculateCategoryScores(synthesis),
      keyIssues: this.extractKeyIssues(synthesis),
      strengths: this.extractStrengths(synthesis),
      confidence: this.calculateConfidence([{ data: synthesis }], 1),
      // Group analysis properties with defaults
      consistency: 0.75,
      thematicCoherence: 0.8,
      userFlowContinuity: 0.7
    };
  }

  private validateAndFixSummary(summary: any, synthesis: any): any {
    const fixedSummary = { ...summary };

    // Handle overallScore
    if (typeof fixedSummary.overallScore !== 'number') {
      console.warn('[BoundaryPushingPipeline] Missing overallScore, calculating fallback');
      fixedSummary.overallScore = this.calculateOverallScore(synthesis);
    }

    // Handle categoryScores
    if (!fixedSummary.categoryScores || typeof fixedSummary.categoryScores !== 'object') {
      console.warn('[BoundaryPushingPipeline] Missing categoryScores, calculating fallback');
      fixedSummary.categoryScores = this.calculateCategoryScores(synthesis);
    }

    // Handle keyIssues
    if (!Array.isArray(fixedSummary.keyIssues)) {
      console.warn('[BoundaryPushingPipeline] Missing or invalid keyIssues, extracting fallback');
      fixedSummary.keyIssues = this.extractKeyIssues(synthesis);
    }

    // Handle strengths (replace keyOpportunities)
    if (!Array.isArray(fixedSummary.strengths)) {
      if (Array.isArray(fixedSummary.keyOpportunities)) {
        console.warn('[BoundaryPushingPipeline] Converting keyOpportunities to strengths');
        fixedSummary.strengths = fixedSummary.keyOpportunities;
        delete fixedSummary.keyOpportunities;
      } else {
        console.warn('[BoundaryPushingPipeline] Missing strengths, extracting fallback');
        fixedSummary.strengths = this.extractStrengths(synthesis);
      }
    }

    // Handle confidence (not confidenceScore)
    if (typeof fixedSummary.confidence !== 'number') {
      if (typeof fixedSummary.confidenceScore === 'number') {
        console.warn('[BoundaryPushingPipeline] Converting confidenceScore to confidence');
        fixedSummary.confidence = fixedSummary.confidenceScore;
        delete fixedSummary.confidenceScore;
      } else {
        console.warn('[BoundaryPushingPipeline] Missing confidence, calculating fallback');
        fixedSummary.confidence = this.calculateConfidence([{ data: synthesis }], 1);
      }
    }

    // Handle group analysis properties with defaults
    if (typeof fixedSummary.consistency !== 'number') {
      fixedSummary.consistency = 0.75;
    }
    if (typeof fixedSummary.thematicCoherence !== 'number') {
      fixedSummary.thematicCoherence = 0.8;
    }
    if (typeof fixedSummary.userFlowContinuity !== 'number') {
      fixedSummary.userFlowContinuity = 0.7;
    }

    return fixedSummary;
  }

  private extractStrengths(synthesis: any): string[] {
    // Extract strengths from prioritized actions or create generic ones
    if (synthesis.prioritizedActions) {
      const positiveActions = synthesis.prioritizedActions
        .filter(action => action.impact === 'high' && action.priority !== 'critical')
        .slice(0, 3)
        .map(action => action.title || action.description)
        .filter(Boolean);
      
      if (positiveActions.length > 0) {
        return positiveActions.map(action => `Good implementation of ${action.toLowerCase()}`);
      }
    }
    
    // Fallback generic strengths
    return [
      'Interface demonstrates clear visual hierarchy',
      'Content is well-organized and accessible',
      'User interaction patterns are intuitive'
    ];
  }

  private logMissingProperties(synthesis: any): void {
    const missingProps: string[] = [];
    
    if (!synthesis.summary) {
      missingProps.push('summary');
    } else {
      if (typeof synthesis.summary.overallScore !== 'number') missingProps.push('summary.overallScore');
      if (!synthesis.summary.categoryScores) missingProps.push('summary.categoryScores');
      if (!Array.isArray(synthesis.summary.keyIssues)) missingProps.push('summary.keyIssues');
      if (!Array.isArray(synthesis.summary.strengths)) missingProps.push('summary.strengths');
      if (typeof synthesis.summary.confidence !== 'number') missingProps.push('summary.confidence');
    }

    if (missingProps.length > 0) {
      console.warn('[BoundaryPushingPipeline] Missing AI response properties:', missingProps);
    }
  }

  private calculateOverallScore(synthesis: any): number {
    // Calculate a reasonable overall score based on available data
    if (synthesis.prioritizedActions && synthesis.prioritizedActions.length > 0) {
      const criticalIssues = synthesis.prioritizedActions.filter(a => a.priority === 'critical').length;
      const highIssues = synthesis.prioritizedActions.filter(a => a.priority === 'high').length;
      
      // Start with base score and reduce based on issues
      let score = 85;
      score -= criticalIssues * 15;
      score -= highIssues * 10;
      
      return Math.max(0, Math.min(100, score));
    }
    
    // Default moderate score if no prioritized actions
    return 70;
  }

  private extractKeyIssues(synthesis: any): string[] {
    if (synthesis.prioritizedActions) {
      return synthesis.prioritizedActions
        .filter(action => action.priority === 'critical' || action.priority === 'high')
        .slice(0, 3)
        .map(action => action.title || action.description)
        .filter(Boolean);
    }
    return [];
  }

  private extractKeyOpportunities(synthesis: any): string[] {
    if (synthesis.prioritizedActions) {
      return synthesis.prioritizedActions
        .filter(action => action.impact === 'high')
        .slice(0, 3)
        .map(action => action.title || action.description)
        .filter(Boolean);
    }
    return [];
  }

  private calculateCategoryScores(synthesis: any): Record<string, number> {
    // Calculate category scores based on available data
    const defaultScores = {
      usability: 75,
      accessibility: 70,
      visual: 80,
      content: 75
    };

    if (synthesis.prioritizedActions && synthesis.prioritizedActions.length > 0) {
      const actions = synthesis.prioritizedActions;
      const categoryMap = {
        usability: ['usability', 'navigation', 'interaction'],
        accessibility: ['accessibility', 'a11y', 'inclusive'],
        visual: ['visual', 'design', 'layout', 'color'],
        content: ['content', 'text', 'copywriting', 'information']
      };

      Object.keys(categoryMap).forEach(category => {
        const relatedActions = actions.filter(action => 
          categoryMap[category].some(keyword => 
            (action.category || action.title || '').toLowerCase().includes(keyword)
          )
        );
        
        if (relatedActions.length > 0) {
          const criticalCount = relatedActions.filter(a => a.priority === 'critical').length;
          const highCount = relatedActions.filter(a => a.priority === 'high').length;
          
          // Reduce score based on issues found
          defaultScores[category] = Math.max(0, Math.min(100, 
            defaultScores[category] - (criticalCount * 20) - (highCount * 10)
          ));
        }
      });
    }

    return defaultScores;
  }

  private mapActionToCategory(action: any): string | null {
    const title = (action.title || '').toLowerCase();
    const description = (action.description || '').toLowerCase();
    const combined = `${title} ${description}`;

    if (combined.includes('accessibility') || combined.includes('wcag') || combined.includes('screen reader') || combined.includes('contrast')) {
      return 'accessibility';
    }
    if (combined.includes('visual') || combined.includes('color') || combined.includes('font') || combined.includes('layout') || combined.includes('design')) {
      return 'visual';
    }
    if (combined.includes('content') || combined.includes('text') || combined.includes('copy') || combined.includes('messaging')) {
      return 'content';
    }
    if (combined.includes('usability') || combined.includes('navigation') || combined.includes('interaction') || combined.includes('user') || combined.includes('flow')) {
      return 'usability';
    }

    // Default to usability if can't categorize
    return 'usability';
  }

  private getIssuePenalty(priority: string): number {
    switch (priority) {
      case 'critical': return 20;
      case 'high': return 15;
      case 'medium': return 10;
      case 'low': return 5;
      default: return 10;
    }
  }

  private async storeResults(data: any): Promise<any> {
    // PHASE 1: Pre-storage validation
    const storageValidation = this.validationService.validateBeforeStorage(data);
    if (!storageValidation.isValid) {
      console.error('[BoundaryPushingPipeline] Storage validation failed:', storageValidation.errors);
      // Log but don't fail - attempt to fix data
      
      // Apply fixes if available
      if (storageValidation.fixedData) {
        console.warn('[BoundaryPushingPipeline] Using fixed data for storage');
        data = storageValidation.fixedData;
      }
    }

    // Build result with safe property access
    const result = {
      success: true,
      data: {
        executiveSummary: this.safeGetProperty(data, 'synthesisResults.fusedData.executiveSummary', 'Analysis completed successfully.'),
        vision: this.safeGetProperty(data, 'visionResults.fusedData', {}),
        analysis: this.safeGetProperty(data, 'analysisResults.fusedData', {}),
        recommendations: this.safeGetProperty(data, 'synthesisResults.fusedData', {}),
        analysisContext: data.analysisContext, // CRITICAL: Include context for UI display
        metadata: {
          executionTime: data.executionTime || 0,
          modelsUsed: data.modelsUsed || [],
          stages: ['vision', 'analysis', 'synthesis'],
          quality: {
            visionConfidence: this.safeGetProperty(data, 'visionResults.confidence', 0),
            analysisConfidence: this.safeGetProperty(data, 'analysisResults.confidence', 0),
            synthesisConfidence: this.safeGetProperty(data, 'synthesisResults.confidence', 0)
          }
        }
      }
    };

    // Final validation of the result
    const finalValidation = this.validationService.validateAnalysisResult(result.data);
    if (!finalValidation.isValid) {
      console.warn('[BoundaryPushingPipeline] Final result validation warnings:', finalValidation.warnings);
      
      // Use fixed data if available
      if (finalValidation.fixedData) {
        result.data = finalValidation.fixedData;
      }
    }

    return result;
  }

  /**
   * PHASE 1: Safe property access helper
   */
  private safeGetProperty(obj: any, path: string, defaultValue: any = null): any {
    if (!obj || typeof obj !== 'object') {
      return defaultValue;
    }

    const keys = path.split('.');
    let current = obj;

    for (const key of keys) {
      if (current === null || current === undefined || !(key in current)) {
        return defaultValue;
      }
      current = current[key];
    }

    return current !== null && current !== undefined ? current : defaultValue;
  }

  private getAvailableModels(stage: 'vision' | 'analysis'): string[] {
    console.log(`Getting available models for stage: ${stage}`);
    
    const config = pipelineConfig.models[stage];
    if (!config) {
      throw new PipelineError(
        `No configuration found for stage: ${stage}`,
        stage,
        { availableStages: Object.keys(pipelineConfig.models) },
        false
      );
    }
    
    const availableModels = [...config.primary, ...config.secondary];
    
    // CRITICAL: Validate that Google Vision is not used for vision/analysis stages
    const invalidModels = availableModels.filter(model => model.includes('google-vision'));
    if (invalidModels.length > 0) {
      throw new PipelineError(
        `Google Vision models are not allowed for ${stage} stage. They are only for metadata extraction.`,
        stage,
        { 
          invalidModels,
          stage,
          note: 'Google Vision should only be configured in pipelineConfig.models.metadata'
        },
        false
      );
    }
    
    console.log(`${stage} models available:`, availableModels);
    return availableModels;
  }

  // Add new method for conversational analysis
  private async executeConversationalAnalysis(
    visionData: any,
    userContext: string
  ): Promise<any> {
    console.log('💬 Executing conversational analysis with Perplexity');
    
    const { data, error } = await supabase.functions.invoke('ux-analysis', {
      body: {
        stage: 'conversational',
        model: 'perplexity-sonar',
        visionData,
        prompt: userContext,
        systemPrompt: 'Analyze conversational UX patterns and user interaction flows'
      }
    });
    
    if (error) throw error;
    return data;
  }

  // Add helper method to check Perplexity availability
  private hasPerplexity(): boolean {
    return pipelineConfig.perplexity.enabled;
  }


  private checkApiKeys(): string[] {
    // Return list of required API keys for error messages
    return ['OPENAI_API_KEY', 'ANTHROPIC_API_KEY', 'GOOGLE_VISION_API_KEY'];
  }

  private async executeModelsInParallel(
    models: string[],
    executor: (model: string) => Promise<any>,
    timeout: number
  ): Promise<ModelResult[]> {
    console.log('Executing models in parallel:', models);
    
    // PHASE 1: Adaptive Timeout - Calculate warning threshold
    const warningThreshold = pipelineConfig.execution.adaptiveTimeouts
      ? pipelineConfig.execution.timeoutCalculator.getWarningThreshold(timeout)
      : timeout * 0.8;
    
    const promises = models.map(async (model) => {
      const startTime = Date.now();
      console.log(`Starting execution for model: ${model} with timeout: ${timeout}ms`);
      
      // Set up warning timer
      const warningTimer = setTimeout(() => {
        console.warn(`⚠️ Model ${model} is taking longer than expected (${warningThreshold}ms)`);
      }, warningThreshold);
      
      try {
        const data = await Promise.race([
          executor(model),
          this.timeout(timeout, model)
        ]);
        
        clearTimeout(warningTimer);
        console.log(`Model ${model} executed successfully in ${Date.now() - startTime}ms`);
        
        return {
          model,
          success: true,
          data,
          metrics: {
            startTime,
            endTime: Date.now()
          }
        };
      } catch (error) {
        clearTimeout(warningTimer);
        console.error(`Model ${model} failed after ${Date.now() - startTime}ms:`, error);
        
        return {
          model,
          success: false,
          error: error instanceof Error ? error : new Error(String(error)),
          metrics: {
            startTime,
            endTime: Date.now()
          }
        };
      }
    });

    const results = await Promise.all(promises);
    console.log('All models execution complete. Results:', results.map(r => ({ 
      model: r.model, 
      success: r.success, 
      duration: r.metrics.endTime - r.metrics.startTime 
    })));
    
    return results;
  }

  private timeout(ms: number, model: string): Promise<never> {
    return new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Model ${model} timed out after ${ms}ms`));
      }, ms);
    });
  }

  private calculateConfidence(successful: any[], total: number): number {
    // PHASE 1: Safe confidence calculation to prevent NaN
    if (!Array.isArray(successful) || total <= 0) {
      this.validationService.debugLog('calculateConfidence: invalid inputs', { successful, total });
      return 0;
    }
    
    const validation = this.validationService.validateArray(successful, 'successfulResults');
    if (!validation.isValid) {
      this.validationService.debugLog('calculateConfidence: array validation failed', validation.errors);
      return 0;
    }
    
    const successRate = successful.length / total;
    const agreementScore = this.calculateAgreement(successful);
    
    // Ensure no NaN values
    if (isNaN(successRate) || isNaN(agreementScore)) {
      this.validationService.debugLog('calculateConfidence: NaN detected', { successRate, agreementScore });
      return 0;
    }
    
    const confidence = (successRate * 0.4 + agreementScore * 0.6);
    return Math.max(0, Math.min(1, confidence));
  }

  private calculateAgreement(results: any[]): number {
    // PHASE 1: Safe agreement calculation with validation
    const validation = this.validationService.validateArray(results, 'agreementResults');
    if (!validation.isValid) {
      return 0.5; // Default moderate agreement
    }
    
    // Filter out null/undefined results
    const validResults = results.filter(r => r && r.data);
    if (validResults.length === 0) {
      return 0.3; // Low agreement for no valid results
    }
    
    // Implement agreement calculation based on result similarity
    // For now, return a simplified score based on valid result count
    return validResults.length > 1 ? 0.85 : 0.65;
  }

  private calculatePriority(suggestion: any): 'critical' | 'high' | 'medium' | 'low' {
    // Calculate priority based on impact and effort
    const impactScore = { high: 3, medium: 2, low: 1 }[suggestion.impact] || 2;
    const effortScore = { low: 3, medium: 2, high: 1 }[suggestion.effort] || 2;
    const score = impactScore * effortScore;
    
    if (score >= 6) return 'critical';
    if (score >= 4) return 'high';
    if (score >= 2) return 'medium';
    return 'low';
  }

  private getUsedModels(stages: StageResult[]): string[] {
    const models = new Set<string>();
    stages.forEach(stage => {
      stage.results.forEach(result => {
        if (result.success) {
          models.add(result.model);
        }
      });
    });
    return Array.from(models);
  }

  // Helper method for system prompts
  private getSystemPromptForContext(): string {
    if (!this.analysisContext) {
      throw new PipelineError(
        'Analysis context is required for system prompt generation',
        'prompt-generation',
        { missingContext: true },
        false
      );
    }

    const { user, image } = this.analysisContext;
    const roleDescriptions = {
      designer: 'You are a senior UX/UI designer with deep expertise in visual design, usability, and design systems.',
      developer: 'You are a senior frontend architect with expertise in implementation, performance, and technical feasibility.',
      business: 'You are a business strategist with expertise in conversion optimization, growth, and ROI analysis.',
      product: 'You are a senior product manager with expertise in user needs, feature prioritization, and product strategy.',
      marketing: 'You are a marketing strategist with expertise in messaging, conversion funnels, and user psychology.'
    };

    const base = roleDescriptions[user.inferredRole || 'designer'] || roleDescriptions.designer;
    
    // PHASE 2.3: Enhanced system prompt with JSON formatting expectations
    const jsonFormatting = 'Always provide your responses in valid JSON format as specified in the user prompt.';
    
    return `${base} You are analyzing a ${image.primaryType} interface in the ${image.domain} domain. 
    Adapt your communication style to ${user.technicalLevel || 'intermediate'} technical level.
    Focus on ${user.outputPreferences?.prioritization || 'impact'}-based prioritization.
    
    ${jsonFormatting}`;
  }

  // Simplified methods for fusion logic
  private deduplicateIssues(issues: any[]): any[] {
    const seen = new Set();
    return issues.filter(issue => {
      const key = `${issue.category}-${issue.element}-${issue.severity}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  private calculateCategoryConfidence(results: any[], category: string): number {
    // PHASE 1: Safe category confidence calculation
    const validation = this.validationService.validateArray(results, 'categoryResults');
    if (!validation.isValid) {
      return 0.5;
    }
    
    const scores = this.validationService.safeArrayMap(
      results.filter(r => r?.data?.[category]),
      (r: any) => {
        const confidence = r.confidence || 0.5;
        const scoreValidation = this.validationService.validateScore(confidence);
        return scoreValidation.isValid ? confidence : 0.5;
      },
      []
    );
    
    return this.validationService.safeCalculateAverage(scores);
  }

  private aggregateBusinessImpact(results: ModelResult[]): any {
    const impacts = results
      .filter(r => r.data?.businessImpact)
      .map(r => r.data.businessImpact);
    
    if (impacts.length === 0) return {};
    
    return {
      conversionOpportunities: impacts.flatMap(i => i.conversionOpportunities || []),
      userExperienceScore: impacts.reduce((sum, i) => sum + (i.userExperienceScore || 0), 0) / impacts.length,
      competitiveAdvantages: impacts.flatMap(i => i.competitiveAdvantages || [])
    };
  }

  // Stub methods for fusion logic - implement based on your needs
  private detectGridSystem(results: ModelResult[]): any { return {}; }
  private analyzeHierarchy(results: ModelResult[]): any { return {}; }
  private analyzeSpacing(results: ModelResult[]): any { return {}; }
  private findPrimaryColors(colors: any[]): any[] { return []; }
  private findSecondaryColors(colors: any[]): any[] { return []; }
  private analyzeContrast(colors: any[]): any { return {}; }
  private mergeTextContent(results: ModelResult[]): any { return {}; }


  reset(): void {
    this.abortController?.abort();
    this.abortController = null;
    this.analysisContext = null;
    // PHASE 3: Reset current request tracking
    this.currentRequestId = null;
  }

  cancel(): void {
    this.abortController?.abort();
    // PHASE 3: Mark request as cancelled if active
    if (this.currentRequestId) {
      this.progressService.failRequest(this.currentRequestId, 'Request cancelled by user');
    }
    }
  }

  /**
   * PHASE 5: Simple retry for transient errors
   */
  private async executeRetryableOperation(
    imageUrl: string,
    userContext: string,
    onProgress?: (progress: number, stage: string) => void
  ): Promise<any> {
    return this.execute(imageUrl, userContext, onProgress);
  }
}
  private async executeRetryableOperation(
    imageUrl: string,
    userContext: string,
    onProgress?: (progress: number, stage: string) => void
  ): Promise<any> {
    // Re-execute the main pipeline logic without the outer try-catch
    // to allow the recovery service to handle retries properly
    const startTime = Date.now();
    
    this.currentRequestId = this.progressService.generateRequestId(imageUrl, userContext);
    onProgress?.(2, 'Retrying analysis...');
    
    // Continue with pipeline execution...
    let imageContext: any;
    try {
      imageContext = await this.contextDetector.detectImageContext(imageUrl);
    } catch (contextError) {
      imageContext = {
        primaryType: 'app',
        subTypes: ['fallback'],
        domain: 'general',
        complexity: 'moderate',
        userIntent: ['general analysis'],
        platform: 'web'
      };
    }
    
    const userContextParsed = this.contextDetector.inferUserContext(userContext);
    this.analysisContext = this.contextDetector.createAnalysisContext(imageContext, userContextParsed);
    
    if (this.analysisContext.clarificationNeeded && this.analysisContext.clarificationQuestions) {
      return {
        requiresClarification: true,
        questions: this.analysisContext.clarificationQuestions,
        partialContext: this.analysisContext,
        resumeToken: this.generateResumeToken()
      };
    }

    const visionResults = await this.executeVisionStage(imageUrl);
    const analysisResults = await this.executeAnalysisStage(imageUrl, visionResults.fusedData, userContext);
    const synthesisResults = await this.executeSynthesisStage(visionResults, analysisResults, userContext);
    
    return await this.storeResults({
      visionResults,
      analysisResults,
      synthesisResults,
      executionTime: Date.now() - startTime,
      modelsUsed: this.getUsedModels([visionResults, analysisResults, synthesisResults]),
      analysisContext: this.analysisContext
    });
  }
}