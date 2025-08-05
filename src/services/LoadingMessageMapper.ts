/**
 * COMPREHENSIVE LOADING MESSAGE MAPPER
 * Replaces generic messages with specific technical steps
 * Provides context-aware progress messaging for better user experience
 */

import { AnalysisContext } from '@/types/contextTypes';

interface LoadingMessageConfig {
  main: string;
  subSteps?: string[];
  icon?: string;
  color?: string;
  estimatedDuration?: number; // in milliseconds
}

interface StageConfig {
  [key: string]: LoadingMessageConfig;
}

export class LoadingMessageMapper {
  private static instance: LoadingMessageMapper;
  private messageConfig: Map<string, StageConfig> = new Map();
  private contextSpecificMessages: Map<string, Map<string, LoadingMessageConfig>> = new Map();

  private constructor() {
    this.initializeBaseMessages();
    this.initializeContextSpecificMessages();
  }

  public static getInstance(): LoadingMessageMapper {
    if (!LoadingMessageMapper.instance) {
      LoadingMessageMapper.instance = new LoadingMessageMapper();
    }
    return LoadingMessageMapper.instance;
  }

  /**
   * Get contextual loading message based on stage, progress, and analysis context
   */
  getContextualMessage(
    stage: string, 
    progress: number, 
    context?: AnalysisContext,
    metadata?: any
  ): LoadingMessageConfig {
    // Get base message for stage
    const stageConfig = this.messageConfig.get(stage);
    if (!stageConfig) {
      return this.getGenericMessage(stage, progress);
    }

    // Determine progress sub-stage
    const subStage = this.getSubStageFromProgress(stage, progress);
    let message = stageConfig[subStage] || stageConfig.default;

    // Apply context-specific overrides
    if (context) {
      const contextKey = `${context.image.primaryType}-${context.image.domain}`;
      const contextMessages = this.contextSpecificMessages.get(contextKey);
      if (contextMessages?.has(stage)) {
        message = { ...message, ...contextMessages.get(stage)! };
      }
    }

    // Apply metadata-based enhancements
    if (metadata) {
      message = this.enhanceMessageWithMetadata(message, metadata);
    }

    return message;
  }

  /**
   * Initialize base technical loading messages
   */
  private initializeBaseMessages(): void {
    // Google Vision Metadata Extraction
    this.messageConfig.set('google-vision', {
      starting: {
        main: 'Initializing Google Vision API connection...',
        subSteps: ['Authenticating with Vision service', 'Preparing image for analysis'],
        icon: 'eye',
        color: 'blue',
        estimatedDuration: 2000
      },
      processing: {
        main: 'Extracting visual elements and metadata...',
        subSteps: [
          'Detecting text content and OCR processing',
          'Identifying UI components and interactive elements', 
          'Analyzing color palette and visual hierarchy',
          'Mapping interface layout and structure'
        ],
        icon: 'scan',
        color: 'blue',
        estimatedDuration: 5000
      },
      completing: {
        main: 'Finalizing visual metadata extraction...',
        subSteps: ['Consolidating detected elements', 'Preparing context for analysis'],
        icon: 'check',
        color: 'green',
        estimatedDuration: 1000
      },
      default: {
        main: 'Processing visual metadata...',
        icon: 'loader',
        color: 'blue'
      }
    });

    // Context Detection
    this.messageConfig.set('context-detection', {
      starting: {
        main: 'Initializing intelligent context detection...',
        subSteps: ['Loading AI models', 'Preparing analysis pipeline'],
        icon: 'brain',
        color: 'purple',
        estimatedDuration: 1500
      },
      analyzing: {
        main: 'Analyzing interface type and user context...',
        subSteps: [
          'Detecting interface patterns and design systems',
          'Identifying domain-specific elements',
          'Inferring user role and technical expertise',
          'Calculating context confidence scores'
        ],
        icon: 'search',
        color: 'purple',
        estimatedDuration: 8000
      },
      validating: {
        main: 'Validating context detection results...',
        subSteps: ['Checking confidence thresholds', 'Preparing analysis strategy'],
        icon: 'shield-check',
        color: 'green',
        estimatedDuration: 2000
      },
      default: {
        main: 'Detecting interface context...',
        icon: 'brain',
        color: 'purple'
      }
    });

    // AI Analysis (Multi-Model)
    this.messageConfig.set('ai-analysis', {
      initializing: {
        main: 'Preparing multi-model AI analysis pipeline...',
        subSteps: [
          'Configuring OpenAI GPT-4 Vision',
          'Setting up Claude 3.5 Sonnet',
          'Preparing context-aware prompts'
        ],
        icon: 'cpu',
        color: 'orange',
        estimatedDuration: 3000
      },
      'vision-analysis': {
        main: 'Running computer vision analysis...',
        subSteps: [
          'Processing image through neural networks',
          'Identifying UI patterns and components',
          'Extracting accessibility markers',
          'Mapping user interaction flows'
        ],
        icon: 'eye',
        color: 'blue',
        estimatedDuration: 15000
      },
      'deep-analysis': {
        main: 'Performing deep UX analysis...',
        subSteps: [
          'Evaluating usability heuristics',
          'Analyzing information architecture',
          'Assessing cognitive load factors',
          'Identifying conversion optimization opportunities'
        ],
        icon: 'layers',
        color: 'indigo',
        estimatedDuration: 12000
      },
      'multi-model': {
        main: 'Synthesizing insights from multiple AI models...',
        subSteps: [
          'Comparing OpenAI and Claude analyses',
          'Identifying consensus findings',
          'Resolving conflicting recommendations',
          'Calculating confidence scores'
        ],
        icon: 'network',
        color: 'violet',
        estimatedDuration: 8000
      },
      default: {
        main: 'Running AI analysis...',
        icon: 'cpu',
        color: 'orange'
      }
    });

    // Strategic Insights Generation
    this.messageConfig.set('strategic-insights', {
      analyzing: {
        main: 'Generating strategic business insights...',
        subSteps: [
          'Evaluating business impact potential',
          'Calculating ROI estimates',
          'Prioritizing recommendations by value',
          'Creating implementation roadmap'
        ],
        icon: 'trending-up',
        color: 'emerald',
        estimatedDuration: 6000
      },
      default: {
        main: 'Generating strategic insights...',
        icon: 'lightbulb',
        color: 'yellow'
      }
    });

    // Synthesis and Finalization
    this.messageConfig.set('synthesis', {
      consolidating: {
        main: 'Consolidating multi-model analysis results...',
        subSteps: [
          'Merging vision and context analyses',
          'Resolving recommendation conflicts',
          'Calculating final confidence scores',
          'Preparing structured output'
        ],
        icon: 'layers',
        color: 'blue',
        estimatedDuration: 4000
      },
      validating: {
        main: 'Validating analysis completeness...',
        subSteps: [
          'Checking required data fields',
          'Validating recommendation quality',
          'Ensuring accessibility coverage'
        ],
        icon: 'check-circle',
        color: 'green',
        estimatedDuration: 2000
      },
      default: {
        main: 'Synthesizing final results...',
        icon: 'combine',
        color: 'purple'
      }
    });

    // Finalization
    this.messageConfig.set('finalizing', {
      saving: {
        main: 'Saving analysis to secure database...',
        subSteps: [
          'Encrypting sensitive data',
          'Creating analysis snapshots',
          'Updating project metadata'
        ],
        icon: 'database',
        color: 'blue',
        estimatedDuration: 3000
      },
      generating: {
        main: 'Generating shareable insights...',
        subSteps: [
          'Creating visual annotations',
          'Formatting recommendations',
          'Preparing export options'
        ],
        icon: 'share',
        color: 'green',
        estimatedDuration: 2000
      },
      default: {
        main: 'Finalizing analysis...',
        icon: 'check',
        color: 'green'
      }
    });

    // Error States
    this.messageConfig.set('error', {
      'api-error': {
        main: 'API service temporarily unavailable',
        subSteps: ['Retrying connection...', 'Switching to backup service'],
        icon: 'alert-circle',
        color: 'red'
      },
      'timeout': {
        main: 'Analysis taking longer than expected',
        subSteps: ['Optimizing processing...', 'Reducing complexity'],
        icon: 'clock',
        color: 'amber'
      },
      default: {
        main: 'Analysis encountered an issue',
        icon: 'x-circle',
        color: 'red'
      }
    });

    // Completion
    this.messageConfig.set('complete', {
      default: {
        main: 'Analysis completed successfully!',
        subSteps: ['Results ready for review'],
        icon: 'check-circle',
        color: 'green'
      }
    });
  }

  /**
   * Initialize context-specific message overrides
   */
  private initializeContextSpecificMessages(): void {
    // Dashboard-Finance specific messages
    this.contextSpecificMessages.set('dashboard-finance', new Map([
      ['ai-analysis', {
        main: 'Analyzing financial dashboard for compliance and usability...',
        subSteps: [
          'Evaluating data visualization clarity',
          'Checking regulatory compliance indicators',
          'Assessing risk communication effectiveness',
          'Analyzing decision-support features'
        ],
        icon: 'bar-chart',
        color: 'green'
      }]
    ]));

    // Landing Page-Marketing specific messages
    this.contextSpecificMessages.set('landing-general', new Map([
      ['ai-analysis', {
        main: 'Optimizing landing page for maximum conversion...',
        subSteps: [
          'Analyzing psychological triggers and persuasion elements',
          'Evaluating call-to-action effectiveness',
          'Assessing trust signals and social proof',
          'Mapping conversion funnel optimization opportunities'
        ],
        icon: 'target',
        color: 'orange'
      }]
    ]));

    // Mobile App specific messages
    this.contextSpecificMessages.set('mobile-general', new Map([
      ['ai-analysis', {
        main: 'Evaluating mobile interface for touch accessibility...',
        subSteps: [
          'Analyzing touch target sizes and spacing',
          'Evaluating gesture patterns and navigation',
          'Assessing thumb reach and one-handed usability',
          'Checking platform-specific design guidelines'
        ],
        icon: 'smartphone',
        color: 'blue'
      }]
    ]));

    // E-commerce specific messages
    this.contextSpecificMessages.set('ecommerce-retail', new Map([
      ['ai-analysis', {
        main: 'Optimizing e-commerce experience for sales conversion...',
        subSteps: [
          'Analyzing product presentation and discovery',
          'Evaluating checkout flow and cart abandonment',
          'Assessing trust signals and security perception',
          'Identifying cross-selling and upselling opportunities'
        ],
        icon: 'shopping-cart',
        color: 'emerald'
      }]
    ]));

    // Healthcare specific messages
    this.contextSpecificMessages.set('app-healthcare', new Map([
      ['ai-analysis', {
        main: 'Ensuring healthcare interface meets HIPAA and accessibility standards...',
        subSteps: [
          'Evaluating patient data privacy indicators',
          'Checking WCAG 2.1 AA compliance',
          'Analyzing clinical workflow efficiency',
          'Assessing emergency action visibility'
        ],
        icon: 'heart',
        color: 'red'
      }]
    ]));
  }

  /**
   * Determine sub-stage based on progress percentage
   */
  private getSubStageFromProgress(stage: string, progress: number): string {
    if (progress <= 10) return 'starting';
    if (progress <= 30) return 'initializing';
    if (progress <= 70) {
      // Determine specific processing stage
      switch (stage) {
        case 'ai-analysis':
          if (progress <= 40) return 'vision-analysis';
          if (progress <= 60) return 'deep-analysis';
          return 'multi-model';
        case 'context-detection':
          return progress <= 50 ? 'analyzing' : 'validating';
        case 'google-vision':
          return 'processing';
        case 'synthesis':
          return 'consolidating';
        default:
          return 'processing';
      }
    }
    if (progress <= 90) {
      switch (stage) {
        case 'synthesis': return 'validating';
        case 'finalizing': return 'saving';
        default: return 'completing';
      }
    }
    if (progress < 100) {
      return stage === 'finalizing' ? 'generating' : 'completing';
    }
    return 'default';
  }

  /**
   * Enhance message with metadata information
   */
  private enhanceMessageWithMetadata(
    message: LoadingMessageConfig, 
    metadata: any
  ): LoadingMessageConfig {
    const enhanced = { ...message };

    if (metadata.interfaceType && enhanced.main) {
      enhanced.main = enhanced.main.replace(/interface/g, `${metadata.interfaceType} interface`);
    }

    if (metadata.detectedElements && Array.isArray(metadata.detectedElements)) {
      const elementCount = metadata.detectedElements.length;
      if (elementCount > 0 && enhanced.subSteps) {
        enhanced.subSteps = [
          ...enhanced.subSteps,
          `Processing ${elementCount} detected UI elements`
        ];
      }
    }

    if (metadata.contextConfidence && enhanced.subSteps) {
      const confidence = Math.round(metadata.contextConfidence * 100);
      enhanced.subSteps = enhanced.subSteps.map(step => 
        step.includes('confidence') 
          ? `Context confidence: ${confidence}%`
          : step
      );
    }

    return enhanced;
  }

  /**
   * Fallback for unknown stages
   */
  private getGenericMessage(stage: string, progress: number): LoadingMessageConfig {
    return {
      main: `Processing ${stage.replace(/-/g, ' ')}...`,
      icon: 'loader',
      color: 'blue'
    };
  }

  /**
   * Get estimated completion time for stage
   */
  getEstimatedDuration(stage: string, progress: number): number | null {
    const stageConfig = this.messageConfig.get(stage);
    if (!stageConfig) return null;

    const subStage = this.getSubStageFromProgress(stage, progress);
    const config = stageConfig[subStage] || stageConfig.default;
    
    return config?.estimatedDuration || null;
  }

  /**
   * Get all substeps for a stage (for detailed progress display)
   */
  getStageSubSteps(stage: string): string[] {
    const stageConfig = this.messageConfig.get(stage);
    if (!stageConfig) return [];

    const allSubSteps: string[] = [];
    Object.values(stageConfig).forEach(config => {
      if (config.subSteps) {
        allSubSteps.push(...config.subSteps);
      }
    });

    return Array.from(new Set(allSubSteps)); // Remove duplicates
  }
}

export default LoadingMessageMapper;