/**
 * API Status Service - Real-time API Key Configuration Checker
 * Provides live feedback on API configuration and availability
 */

import { supabase } from '@/integrations/supabase/client';

export interface APIStatus {
  name: string;
  configured: boolean;
  working: boolean;
  error?: string;
  lastChecked: Date;
}

export interface PipelineStage {
  stage: string;
  model: string;
  success: boolean;
  error?: string;
  warning?: string;
}

export interface APIStatusResult {
  availableAPIs: string[];
  configuredAPIs: APIStatus[];
  stages: PipelineStage[];
  isReady: boolean;
  errors: string[];
}

class APIStatusService {
  private lastCheck: Date | null = null;
  private checkInterval = 30000; // 30 seconds
  private cachedResult: APIStatusResult | null = null;

  /**
   * Check API configuration status in real-time
   */
  async checkAPIStatus(force = false): Promise<APIStatusResult> {
    // Return cached result if recent and not forced
    if (!force && this.cachedResult && this.lastCheck && 
        Date.now() - this.lastCheck.getTime() < this.checkInterval) {
      return this.cachedResult;
    }

    try {
      console.log('🔍 APIStatusService: Checking API configuration...');
      
      const { data, error } = await supabase.functions.invoke('ux-analysis', {
        body: {
          type: 'API_STATUS_CHECK'
        }
      });

      if (error) {
        console.error('❌ API status check failed:', error);
        return this.createErrorResult(`API status check failed: ${error.message}`);
      }

      if (!data) {
        return this.createErrorResult('No response from API status check');
      }

      // Parse the response
      const result = this.parseAPIStatusResponse(data);
      
      // Cache the result
      this.cachedResult = result;
      this.lastCheck = new Date();
      
      console.log('✅ API status check completed:', {
        availableAPIs: result.availableAPIs.length,
        configuredAPIs: result.configuredAPIs.length,
        isReady: result.isReady
      });

      return result;
    } catch (error) {
      console.error('❌ APIStatusService error:', error);
      return this.createErrorResult(
        error instanceof Error ? error.message : 'Unknown API status check error'
      );
    }
  }

  /**
   * Test analysis pipeline with a lightweight request
   */
  async testAnalysisPipeline(): Promise<{
    success: boolean;
    availableModels: string[];
    errors: string[];
    stages: PipelineStage[];
  }> {
    try {
      console.log('🧪 Testing analysis pipeline...');
      
      const { data, error } = await supabase.functions.invoke('ux-analysis', {
        body: {
          type: 'PIPELINE_TEST',
          payload: {
            // Use a small test image URL or base64
            testMode: true
          }
        }
      });

      if (error) {
        return {
          success: false,
          availableModels: [],
          errors: [error.message],
          stages: []
        };
      }

      return {
        success: data.success || false,
        availableModels: data.availableModels || [],
        errors: data.errors || [],
        stages: data.stages || []
      };
    } catch (error) {
      return {
        success: false,
        availableModels: [],
        errors: [error instanceof Error ? error.message : 'Pipeline test failed'],
        stages: []
      };
    }
  }

  /**
   * Get quick API availability without full status check
   */
  async getQuickAPICheck(): Promise<{ 
    hasAnyAPI: boolean; 
    apis: string[];
    needsConfiguration: boolean;
  }> {
    try {
      const { data, error } = await supabase.functions.invoke('ux-analysis', {
        body: { type: 'QUICK_API_CHECK' }
      });

      if (error || !data) {
        return { hasAnyAPI: false, apis: [], needsConfiguration: true };
      }

      const apis = data.availableAPIs || [];
      return {
        hasAnyAPI: apis.length > 0,
        apis,
        needsConfiguration: apis.length === 0
      };
    } catch (error) {
      console.error('Quick API check failed:', error);
      return { hasAnyAPI: false, apis: [], needsConfiguration: true };
    }
  }

  private parseAPIStatusResponse(data: any): APIStatusResult {
    const availableAPIs = data.availableAPIs || [];
    const configuredAPIs = this.parseConfiguredAPIs(data.configuredAPIs || data.apis || {});
    const stages = data.stages || [];
    const errors = data.errors || [];

    return {
      availableAPIs,
      configuredAPIs,
      stages,
      isReady: availableAPIs.length > 0,
      errors
    };
  }

  private parseConfiguredAPIs(apisData: any): APIStatus[] {
    const apis = ['openai', 'anthropic', 'google', 'perplexity'];
    
    return apis.map(api => {
      const apiInfo = apisData[api] || {};
      return {
        name: api,
        configured: apiInfo.configured || false,
        working: apiInfo.working || false,
        error: apiInfo.error,
        lastChecked: new Date()
      };
    });
  }

  private createErrorResult(error: string): APIStatusResult {
    return {
      availableAPIs: [],
      configuredAPIs: [],
      stages: [],
      isReady: false,
      errors: [error]
    };
  }

  /**
   * Get configuration instructions for missing APIs
   */
  getConfigurationInstructions(): {
    title: string;
    instructions: string[];
    links: Array<{ name: string; url: string; }>;
  } {
    return {
      title: 'API Configuration Required',
      instructions: [
        'Go to Supabase Edge Function secrets (link below)',
        'Add at least one API key from the list below',
        'Retry the analysis after configuration'
      ],
      links: [
        {
          name: 'Supabase Edge Function Secrets',
          url: 'https://supabase.com/dashboard/project/sdcmbfdtafkzpimwjpij/settings/functions'
        },
        {
          name: 'OpenAI API Keys',
          url: 'https://platform.openai.com/api-keys'
        },
        {
          name: 'Anthropic API Keys',
          url: 'https://console.anthropic.com/settings/keys'
        },
        {
          name: 'Google Cloud Vision API',
          url: 'https://console.cloud.google.com/apis/credentials'
        }
      ]
    };
  }

  /**
   * Clear cached results to force fresh check
   */
  clearCache(): void {
    this.cachedResult = null;
    this.lastCheck = null;
  }
}

export const apiStatusService = new APIStatusService();