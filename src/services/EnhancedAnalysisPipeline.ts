import { supabase } from '@/integrations/supabase/client';
import { ContextDetectionService } from './ContextDetectionService';
import { AnalysisContext, ImageContext } from '@/types/contextTypes';
import { PipelineError } from '@/types/pipelineErrors';

export interface AnalysisProgress {
  stage: string;
  progress: number;
  message: string;
  metadata?: {
    interfaceType?: string;
    detectedElements?: string[];
    contextConfidence?: number;
    requiresClarification?: boolean;
  };
}

export interface EnhancedAnalysisResult {
  success: boolean;
  data?: any;
  error?: string;
  analysisContext?: AnalysisContext;
  progress?: AnalysisProgress;
  requiresClarification?: boolean;
  clarificationQuestions?: string[];
}

export class EnhancedAnalysisPipeline {
  private contextService = new ContextDetectionService();
  private progressCallback?: (progress: AnalysisProgress) => void;

  constructor(onProgress?: (progress: AnalysisProgress) => void) {
    this.progressCallback = onProgress;
  }

  /**
   * Execute context-aware analysis pipeline with Google Vision metadata
   */
  async executeContextAwareAnalysis(
    imageId: string,
    imageUrl: string,
    imageName: string,
    userContext?: string
  ): Promise<EnhancedAnalysisResult> {
    try {
      // Phase 1: Extract Google Vision metadata for context-specific progress
      this.updateProgress('google-vision', 10, 'Extracting visual metadata...', {});
      
      const visionMetadata = await this.extractGoogleVisionMetadata(imageId, imageUrl);
      const interfaceType = this.inferInterfaceTypeFromMetadata(visionMetadata);
      
      this.updateProgress('google-vision', 20, `Analyzing ${interfaceType} interface...`, {
        interfaceType,
        detectedElements: this.extractKeyElements(visionMetadata)
      });

      // Phase 2: Context detection with metadata-informed prompts
      this.updateProgress('context-detection', 35, `Understanding ${interfaceType} context and user needs...`, {
        interfaceType
      });

      const imageContext = await this.contextService.detectImageContext(imageUrl);
      const userContextData = this.contextService.inferUserContext(userContext || '');
      const analysisContext = this.contextService.createAnalysisContext(imageContext, userContextData);

      // Phase 3: Check if clarification is needed
      if (analysisContext.clarificationNeeded || analysisContext.confidence < 0.7) {
        this.updateProgress('clarification-needed', 40, 'Additional context needed for optimal analysis', {
          interfaceType: analysisContext.image.primaryType,
          contextConfidence: analysisContext.confidence,
          requiresClarification: true
        });

        return {
          success: true,
          requiresClarification: true,
          clarificationQuestions: analysisContext.clarificationQuestions,
          analysisContext,
          progress: {
            stage: 'clarification-needed',
            progress: 40,
            message: 'Please provide additional context for better analysis',
            metadata: {
              interfaceType: analysisContext.image.primaryType,
              contextConfidence: analysisContext.confidence,
              requiresClarification: true
            }
          }
        };
      }

      // Phase 4: Context-aware AI analysis with specific progress messages
      const specificMessage = this.getContextSpecificMessage(analysisContext, visionMetadata);
      this.updateProgress('ai-analysis', 60, specificMessage, {
        interfaceType: analysisContext.image.primaryType,
        detectedElements: this.extractKeyElements(visionMetadata),
        contextConfidence: analysisContext.confidence
      });

      const analysisResult = await this.performContextAwareAnalysis(
        imageUrl,
        imageId,
        imageName,
        analysisContext,
        visionMetadata,
        userContext
      );

      // Phase 5: Final processing and storage
      this.updateProgress('finalizing', 90, 'Finalizing analysis and generating insights...', {
        interfaceType: analysisContext.image.primaryType
      });

      await this.storeEnhancedAnalysis(imageId, analysisResult, analysisContext);

      this.updateProgress('complete', 100, `${analysisContext.image.primaryType} analysis completed`, {
        interfaceType: analysisContext.image.primaryType,
        contextConfidence: analysisContext.confidence
      });

      return {
        success: true,
        data: analysisResult,
        analysisContext,
        progress: {
          stage: 'complete',
          progress: 100,
          message: `${analysisContext.image.primaryType} analysis completed`,
          metadata: {
            interfaceType: analysisContext.image.primaryType,
            contextConfidence: analysisContext.confidence
          }
        }
      };

    } catch (error) {
      console.error('Enhanced analysis pipeline failed:', error);
      
      this.updateProgress('error', 0, `Analysis failed: ${error.message}`, {});
      
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Extract Google Vision metadata with enhanced URL handling
   */
  private async extractGoogleVisionMetadata(imageId: string, imageUrl: string): Promise<any> {
    try {
      // PHASE 2: Enhanced URL processing for edge functions
      let processedImageUrl = imageUrl;
      let imageBase64: string | undefined;

      // Handle blob URLs - convert to base64 for edge function compatibility
      if (imageUrl.startsWith('blob:')) {
        try {
          const { BlobUrlReplacementService } = await import('./BlobUrlReplacementService');
          imageBase64 = await BlobUrlReplacementService.blobUrlToBase64(imageUrl);
          console.log('[EnhancedAnalysisPipeline] Converted blob URL to base64 for edge function');
        } catch (conversionError) {
          console.warn('[EnhancedAnalysisPipeline] Failed to convert blob URL to base64:', conversionError);
          return this.createFallbackMetadata();
        }
      }

      const requestBody: any = {
        imageId,
        imageUrl: processedImageUrl,
        features: ['labels', 'objects', 'text', 'faces', 'properties']
      };

      // Include base64 data if available
      if (imageBase64) {
        requestBody.imageBase64 = imageBase64;
      }

      const { data, error } = await supabase.functions.invoke('google-vision-metadata', {
        body: requestBody
      });

      if (error) {
        console.warn('Google Vision metadata extraction failed:', error);
        return this.createFallbackMetadata();
      }

      return data.metadata || this.createFallbackMetadata();
    } catch (error) {
      console.warn('Google Vision API unavailable, using fallback metadata:', error);
      return this.createFallbackMetadata();
    }
  }

  /**
   * Infer interface type from Google Vision metadata
   */
  private inferInterfaceTypeFromMetadata(metadata: any): string {
    if (!metadata || !metadata.labels) return 'interface';

    const labels = metadata.labels.map((l: any) => l.description.toLowerCase());
    const objects = metadata.objects?.map((o: any) => o.name.toLowerCase()) || [];
    const allElements = [...labels, ...objects];

    // Dashboard indicators
    if (allElements.some(el => ['chart', 'graph', 'dashboard', 'table', 'data'].includes(el))) {
      return 'dashboard';
    }

    // Mobile app indicators
    if (allElements.some(el => ['mobile', 'app', 'touchscreen', 'phone'].includes(el))) {
      return 'mobile app';
    }

    // Landing page indicators
    if (allElements.some(el => ['website', 'landing', 'hero', 'banner'].includes(el))) {
      return 'landing page';
    }

    // E-commerce indicators
    if (allElements.some(el => ['product', 'cart', 'shop', 'price', 'buy'].includes(el))) {
      return 'e-commerce site';
    }

    // Form indicators
    if (allElements.some(el => ['form', 'input', 'field', 'submit'].includes(el))) {
      return 'form';
    }

    return 'interface';
  }

  /**
   * Extract key visual elements for progress messages
   */
  private extractKeyElements(metadata: any): string[] {
    const elements: string[] = [];

    // Add navigation elements
    if (metadata.objects?.some((o: any) => o.name.toLowerCase().includes('navigation'))) {
      elements.push('navigation menu');
    }

    // Add content elements
    if (metadata.labels?.some((l: any) => l.description.toLowerCase().includes('text'))) {
      elements.push('text content');
    }

    // Add interactive elements
    if (metadata.objects?.some((o: any) => ['button', 'link'].includes(o.name.toLowerCase()))) {
      elements.push('interactive elements');
    }

    // Add visual elements
    if (metadata.objects?.some((o: any) => o.name.toLowerCase().includes('image'))) {
      elements.push('images');
    }

    return elements.length > 0 ? elements : ['UI components'];
  }

  /**
   * Generate context-specific progress message
   */
  private getContextSpecificMessage(context: AnalysisContext, metadata: any): string {
    const interfaceType = context.image.primaryType;
    const elements = this.extractKeyElements(metadata);
    const domain = context.image.domain !== 'general' ? ` for ${context.image.domain}` : '';

    if (elements.length > 0) {
      return `Analyzing ${interfaceType}${domain} with ${elements.join(', ')}...`;
    }

    switch (interfaceType) {
      case 'dashboard':
        return `Analyzing dashboard layout and data visualization patterns${domain}...`;
      case 'landing':
        return `Analyzing landing page conversion elements and messaging${domain}...`;
      case 'mobile':
        return `Analyzing mobile interface touch targets and gesture patterns${domain}...`;
      case 'ecommerce':
        return `Analyzing e-commerce user journey and trust signals${domain}...`;
      case 'form':
        return `Analyzing form usability and completion flow${domain}...`;
      default:
        return `Analyzing ${interfaceType} usability and design patterns${domain}...`;
    }
  }

  /**
   * Perform context-aware AI analysis with enhanced URL handling
   */
  private async performContextAwareAnalysis(
    imageUrl: string,
    imageId: string,
    imageName: string,
    context: AnalysisContext,
    metadata: any,
    userContext?: string
  ): Promise<any> {
    // PHASE 2: Enhanced URL processing for edge functions
    let processedImageUrl = imageUrl;
    let imageBase64: string | undefined;

    // Handle blob URLs - convert to base64 for edge function compatibility
    if (imageUrl.startsWith('blob:')) {
      try {
        const { BlobUrlReplacementService } = await import('./BlobUrlReplacementService');
        imageBase64 = await BlobUrlReplacementService.blobUrlToBase64(imageUrl);
        console.log('[EnhancedAnalysisPipeline] Converted blob URL to base64 for analysis');
      } catch (conversionError) {
        console.warn('[EnhancedAnalysisPipeline] Failed to convert blob URL to base64:', conversionError);
        throw new PipelineError('Failed to process image URL for analysis', 'url-processing', { stage: 'blob-conversion' });
      }
    }

    // Create context-enhanced prompt
    const enhancedPrompt = this.buildContextEnhancedPrompt(context, metadata, userContext);

    const requestPayload: any = {
      imageId,
      imageUrl: processedImageUrl,
      imageName,
      analysisContext: context,
      metadata,
      prompt: enhancedPrompt,
      userContext
    };

    // Include base64 data if available
    if (imageBase64) {
      requestPayload.imageBase64 = imageBase64;
    }

    const { data, error } = await supabase.functions.invoke('ux-analysis', {
      body: {
        action: 'ENHANCED_CONTEXT_ANALYSIS',
        payload: requestPayload
      }
    });

    if (error) throw new PipelineError(error.message, 'enhanced-analysis', { stage: 'api-call' });
    if (!data?.success) throw new PipelineError(data?.error || 'Analysis failed', 'enhanced-analysis', { stage: 'data-validation' });

    return data.data;
  }

  /**
   * Build context-enhanced analysis prompt
   */
  private buildContextEnhancedPrompt(context: AnalysisContext, metadata: any, userContext?: string): string {
    const interfaceType = context.image.primaryType;
    const domain = context.image.domain;
    const userRole = context.user.inferredRole || 'user';
    const focusAreas = context.focusAreas;

    let prompt = `You are analyzing a ${interfaceType}`;
    if (domain !== 'general') prompt += ` in the ${domain} domain`;
    
    prompt += ` for a ${userRole}.\n\n`;

    // Add detected visual elements
    if (metadata.objects?.length > 0) {
      prompt += `Visual elements detected: ${metadata.objects.map((o: any) => o.name).join(', ')}\n`;
    }

    // Add focus areas
    if (focusAreas.length > 0) {
      prompt += `Focus areas: ${focusAreas.join(', ')}\n`;
    }

    // Add user context
    if (userContext) {
      prompt += `User context: ${userContext}\n`;
    }

    // Add interface-specific analysis guidelines
    prompt += this.getInterfaceSpecificGuidelines(interfaceType, domain);

    return prompt;
  }

  /**
   * Get interface-specific analysis guidelines
   */
  private getInterfaceSpecificGuidelines(interfaceType: string, domain: string): string {
    const guidelines: Record<string, string> = {
      dashboard: `
Focus on:
- Data visualization clarity and cognitive load
- Information hierarchy and scanning patterns
- Real-time data handling and update patterns
- KPI accessibility and decision support`,

      landing: `
Focus on:
- Value proposition clarity and positioning
- Conversion funnel optimization
- Trust signals and social proof
- Call-to-action effectiveness`,

      mobile: `
Focus on:
- Touch target sizing (minimum 44x44px)
- Thumb-friendly navigation patterns
- Gesture compatibility and discoverability
- Performance on mobile networks`,

      ecommerce: `
Focus on:
- Product discovery and search functionality
- Cart and checkout flow optimization
- Trust signals and security perception
- Mobile commerce experience`,

      form: `
Focus on:
- Field validation and error prevention
- Progress indication and completion rates
- Accessibility and keyboard navigation
- Multi-step flow optimization`
    };

    return guidelines[interfaceType] || `
Focus on:
- Overall usability and user experience
- Visual hierarchy and information architecture
- Accessibility and inclusive design
- Performance and technical considerations`;
  }

  /**
   * Store enhanced analysis with context
   */
  private async storeEnhancedAnalysis(imageId: string, analysis: any, context: AnalysisContext): Promise<void> {
    // Add context metadata to analysis
    const enhancedAnalysis = {
      ...analysis,
      analysisContext: context,
      metadata: {
        ...analysis.metadata,
        contextConfidence: context.confidence,
        interfaceType: context.image.primaryType,
        domain: context.image.domain,
        userRole: context.user.inferredRole,
        focusAreas: context.focusAreas,
        enhancedAt: new Date().toISOString()
      }
    };

    const { error } = await supabase
      .from('ux_analyses')
      .upsert({
        id: analysis.id,
        image_id: imageId,
        user_context: context.user.goals?.join(', ') || '',
        visual_annotations: enhancedAnalysis.visualAnnotations,
        suggestions: enhancedAnalysis.suggestions,
        summary: enhancedAnalysis.summary,
        metadata: enhancedAnalysis.metadata,
        status: 'completed',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });

    if (error) {
      console.error('Failed to store enhanced analysis:', error);
      throw new PipelineError('Failed to store analysis results', 'storage', { stage: 'database-storage' });
    }
  }

  /**
   * Create fallback metadata when Google Vision is unavailable
   */
  private createFallbackMetadata(): any {
    return {
      labels: [
        { description: 'Interface', score: 0.8 },
        { description: 'User Interface', score: 0.7 },
        { description: 'Design', score: 0.6 }
      ],
      objects: [
        { name: 'Interface element', score: 0.8 }
      ],
      text: [],
      faces: 0,
      properties: {}
    };
  }

  /**
   * Update progress with enhanced metadata
   */
  private updateProgress(stage: string, progress: number, message: string, metadata: any): void {
    if (this.progressCallback) {
      this.progressCallback({
        stage,
        progress,
        message,
        metadata
      });
    }
  }

  /**
   * Process clarification responses and continue analysis
   */
  async processClarificationAndContinue(
    imageId: string,
    imageUrl: string,
    imageName: string,
    originalContext: AnalysisContext,
    clarificationResponses: Record<string, string>,
    userContext?: string
  ): Promise<EnhancedAnalysisResult> {
    try {
      // Enhance context with clarification responses
      const enhancedContext = await this.contextService.processClarificationResponses(
        originalContext,
        clarificationResponses
      );

      this.updateProgress('enhanced-analysis', 50, 'Analyzing with enhanced context...', {
        interfaceType: enhancedContext.image.primaryType,
        contextConfidence: enhancedContext.enhancedConfidence
      });

      // Continue with enhanced context
      const visionMetadata = await this.extractGoogleVisionMetadata(imageId, imageUrl);
      
      const specificMessage = this.getContextSpecificMessage(enhancedContext, visionMetadata);
      this.updateProgress('ai-analysis', 70, specificMessage, {
        interfaceType: enhancedContext.image.primaryType,
        contextConfidence: enhancedContext.enhancedConfidence
      });

      const analysisResult = await this.performContextAwareAnalysis(
        imageUrl,
        imageId,
        imageName,
        enhancedContext,
        visionMetadata,
        userContext
      );

      this.updateProgress('finalizing', 90, 'Finalizing enhanced analysis...', {
        interfaceType: enhancedContext.image.primaryType
      });

      await this.storeEnhancedAnalysis(imageId, analysisResult, enhancedContext);

      this.updateProgress('complete', 100, `Enhanced ${enhancedContext.image.primaryType} analysis completed`, {
        interfaceType: enhancedContext.image.primaryType,
        contextConfidence: enhancedContext.enhancedConfidence
      });

      return {
        success: true,
        data: analysisResult,
        analysisContext: enhancedContext,
        progress: {
          stage: 'complete',
          progress: 100,
          message: `Enhanced ${enhancedContext.image.primaryType} analysis completed`,
          metadata: {
            interfaceType: enhancedContext.image.primaryType,
            contextConfidence: enhancedContext.enhancedConfidence
          }
        }
      };

    } catch (error) {
      console.error('Enhanced analysis with clarification failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}