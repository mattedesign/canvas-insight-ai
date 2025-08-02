import { supabase } from '@/integrations/supabase/client';
import { pipelineConfig } from '@/config/pipelineConfig';
import { PipelineError, ModelExecutionError } from '@/types/pipelineErrors';
import { ContextDetectionService } from './ContextDetectionService';
import { DynamicPromptBuilder } from './DynamicPromptBuilder';
import { AnalysisContext } from '@/types/contextTypes';

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

  constructor() {
    this.contextDetector = new ContextDetectionService();
    this.promptBuilder = new DynamicPromptBuilder();
  }

  async execute(
    imageUrl: string,
    userContext: string,
    onProgress?: (progress: number, stage: string) => void
  ): Promise<any> {
    this.abortController = new AbortController();
    const startTime = Date.now();
    
    console.log('🚀 BoundaryPushingPipeline.execute() called with:', {
      imageUrl: imageUrl ? 'provided' : 'missing',
      userContext: userContext ? `"${userContext.substring(0, 50)}..."` : 'empty',
      hasProgressCallback: !!onProgress,
      timestamp: new Date().toISOString()
    });
    
    console.log('🔧 Pipeline configuration:', {
      contextDetectionEnabled: pipelineConfig.contextDetection.enabled,
      availableModels: {
        vision: pipelineConfig.models.vision.primary,
        analysis: pipelineConfig.models.analysis.primary
      },
      qualitySettings: pipelineConfig.quality
    });
    
    try {
      // CRITICAL: Context Detection Phase (5% progress) - THIS IS PRIORITY
      onProgress?.(2, 'Analyzing image context...');
      const imageContext = await this.contextDetector.detectImageContext(imageUrl);
      
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

      // Stage 1: Vision Extraction with Context (30% progress)
      onProgress?.(10, `Initializing vision models for ${imageContext.primaryType} analysis...`);
      const visionResults = await this.executeVisionStage(imageUrl);
      onProgress?.(30, 'Vision analysis complete');

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
      if (error instanceof PipelineError) {
        throw error;
      }
      throw new PipelineError(
        'Pipeline execution failed',
        'unknown',
        { originalError: error.message },
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
    const models = this.getAvailableModels('vision');
    
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

    const results = await this.executeModelsInParallel(
      models,
      async (model) => this.executeSingleVisionModel(model, imageUrl, dynamicPrompt),
      pipelineConfig.models.vision.timeout
    );

    const successfulResults = results.filter(r => r.success);
    if (successfulResults.length === 0) {
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

  private async fuseVisionResults(results: ModelResult[]): Promise<any> {
    // Intelligent fusion of multiple model outputs
    const fusedData: any = {
      elements: {},
      layout: {},
      colors: {},
      content: {},
      confidence: {}
    };

    // Merge element detections
    results.forEach(result => {
      if (result.data?.elements) {
        Object.entries(result.data.elements).forEach(([key, value]) => {
          if (!fusedData.elements[key]) {
            fusedData.elements[key] = [];
          }
        fusedData.elements[key].push({
          ...(value as object),
          detectedBy: result.model
        });
        });
      }
    });

    // Aggregate layout analysis
    fusedData.layout = {
      grid: this.detectGridSystem(results),
      hierarchy: this.analyzeHierarchy(results),
      spacing: this.analyzeSpacing(results)
    };

    // Merge color analysis
    const allColors = results.flatMap(r => r.data?.colors?.palette || []);
    fusedData.colors = {
      primary: this.findPrimaryColors(allColors),
      secondary: this.findSecondaryColors(allColors),
      contrast: this.analyzeContrast(allColors)
    };

    // Aggregate content
    fusedData.content = this.mergeTextContent(results);
    
    // Calculate confidence scores
    fusedData.confidence = {
      overall: this.calculateAgreement(results),
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

    const results = await this.executeModelsInParallel(
      models,
      async (model) => this.executeSingleAnalysisModel(model, imageUrl, visionData, dynamicPrompt),
      pipelineConfig.models.analysis.timeout
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

  private async fuseAnalysisResults(results: ModelResult[]): Promise<any> {
    const fusedAnalysis: any = {
      usabilityIssues: [],
      accessibilityFindings: [],
      designOpportunities: [],
      businessImpact: {},
      technicalConsiderations: [],
      confidence: {}
    };

    // Merge all issues and deduplicate
    results.forEach(result => {
      if (result.data?.usabilityIssues) {
        fusedAnalysis.usabilityIssues.push(...result.data.usabilityIssues);
      }
      if (result.data?.accessibilityFindings) {
        fusedAnalysis.accessibilityFindings.push(...result.data.accessibilityFindings);
      }
      if (result.data?.designOpportunities) {
        fusedAnalysis.designOpportunities.push(...result.data.designOpportunities);
      }
    });

    // Deduplicate issues
    fusedAnalysis.usabilityIssues = this.deduplicateIssues(fusedAnalysis.usabilityIssues);
    fusedAnalysis.accessibilityFindings = this.deduplicateIssues(fusedAnalysis.accessibilityFindings);
    fusedAnalysis.designOpportunities = this.deduplicateIssues(fusedAnalysis.designOpportunities);

    // Aggregate business impact
    fusedAnalysis.businessImpact = this.aggregateBusinessImpact(results);

    // Calculate confidence
    fusedAnalysis.confidence = {
      overall: this.calculateAgreement(results),
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

    return synthesis;
  }

  private async storeResults(data: any): Promise<any> {
    // Store results and return final formatted output
    return {
      success: true,
      data: {
        executiveSummary: data.synthesisResults.fusedData?.executiveSummary || 'Analysis completed successfully.',
        vision: data.visionResults.fusedData,
        analysis: data.analysisResults.fusedData,
        recommendations: data.synthesisResults.fusedData,
        analysisContext: data.analysisContext, // CRITICAL: Include context for UI display
        metadata: {
          executionTime: data.executionTime,
          modelsUsed: data.modelsUsed,
          stages: ['vision', 'analysis', 'synthesis'],
          quality: {
            visionConfidence: data.visionResults.confidence,
            analysisConfidence: data.analysisResults.confidence,
            synthesisConfidence: data.synthesisResults.confidence
          }
        }
      }
    };
  }

  private readonly ANALYSIS_MODELS = [
    'gpt-4-turbo-preview',
    'claude-opus-4',
    'perplexity-sonar' // ADD THIS
  ];

  private getAvailableModels(stage: 'vision' | 'analysis'): string[] {
    console.log(`Getting available models for stage: ${stage}`);
    
    if (stage === 'vision') {
      // For vision, we only use vision-capable models
      const visionModels = ['gpt-4o', 'anthropic-vision'];
      console.log('Vision models available:', visionModels);
      return visionModels;
    } else {
      // For analysis and synthesis, use text models
      const analysisModels = ['gpt-4o', 'claude-opus-4-20250514'];
      console.log('Analysis models available:', analysisModels);
      return analysisModels;
    }
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
    
    const promises = models.map(async (model) => {
      const startTime = Date.now();
      console.log(`Starting execution for model: ${model}`);
      
      try {
        const data = await Promise.race([
          executor(model),
          this.timeout(timeout, model)
        ]);
        
        console.log(`Model ${model} executed successfully`);
        
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
        console.error(`Model ${model} failed:`, error);
        
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
    console.log('All models execution complete. Results:', results.map(r => ({ model: r.model, success: r.success })));
    
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
    const successRate = successful.length / total;
    const agreementScore = this.calculateAgreement(successful);
    return (successRate * 0.4 + agreementScore * 0.6);
  }

  private calculateAgreement(results: any[]): number {
    // Implement agreement calculation based on result similarity
    // For now, return a simplified score
    return results.length > 1 ? 0.85 : 0.65;
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
    
    return `${base} You are analyzing a ${image.primaryType} interface in the ${image.domain} domain. 
    Adapt your communication style to ${user.technicalLevel || 'intermediate'} technical level.
    Focus on ${user.outputPreferences?.prioritization || 'impact'}-based prioritization.`;
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
    const scores = results
      .filter(r => r.data?.[category])
      .map(r => r.confidence || 0.5);
    
    return scores.length > 0 
      ? scores.reduce((a, b) => a + b) / scores.length
      : 0.5;
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
  }

  cancel(): void {
    this.abortController?.abort();
  }
}