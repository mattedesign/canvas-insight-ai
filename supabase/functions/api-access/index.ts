import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-api-key',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS'
};

interface APIKeyRecord {
  id: string;
  user_id: string;
  key_name: string;
  api_key: string;
  rate_limit: number;
  requests_made: number;
  created_at: string;
  expires_at?: string;
  is_active: boolean;
}

interface AnalysisRequest {
  imageUrl: string;
  imageName?: string;
  userContext?: string;
  aiModel?: string;
  analysisType?: string;
}

// Initialize Supabase client with service role key
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function validateApiKey(apiKey: string): Promise<APIKeyRecord | null> {
  try {
    const { data, error } = await supabase
      .from('api_keys')
      .select('*')
      .eq('api_key', apiKey)
      .eq('is_active', true)
      .single();

    if (error || !data) {
      console.log('API key validation failed:', error?.message);
      return null;
    }

    // Check if API key has expired
    if (data.expires_at && new Date(data.expires_at) < new Date()) {
      console.log('API key has expired');
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error validating API key:', error);
    return null;
  }
}

async function checkRateLimit(apiKeyRecord: APIKeyRecord): Promise<boolean> {
  // Check if within rate limit
  if (apiKeyRecord.requests_made >= apiKeyRecord.rate_limit) {
    return false;
  }

  // Increment request count
  try {
    await supabase
      .from('api_keys')
      .update({ 
        requests_made: apiKeyRecord.requests_made + 1,
        last_used_at: new Date().toISOString()
      })
      .eq('id', apiKeyRecord.id);
    
    return true;
  } catch (error) {
    console.error('Error updating request count:', error);
    return false;
  }
}

async function logApiRequest(apiKeyRecord: APIKeyRecord, endpoint: string, success: boolean, responseTime: number) {
  try {
    await supabase
      .from('api_logs')
      .insert({
        api_key_id: apiKeyRecord.id,
        user_id: apiKeyRecord.user_id,
        endpoint,
        success,
        response_time_ms: responseTime,
        timestamp: new Date().toISOString()
      });
  } catch (error) {
    console.error('Error logging API request:', error);
  }
}

async function performAnalysis(request: AnalysisRequest): Promise<any> {
  try {
    const { data, error } = await supabase.functions.invoke('ux-analysis', {
      body: {
        type: 'ANALYZE_IMAGE',
        payload: {
          imageId: crypto.randomUUID(),
          imageUrl: request.imageUrl,
          imageName: request.imageName || 'api-analysis',
          userContext: request.userContext
        },
        aiModel: request.aiModel || 'auto'
      }
    });

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Analysis error:', error);
    throw error;
  }
}

serve(async (req) => {
  const startTime = Date.now();
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const path = url.pathname;

    // Extract API key from header
    const apiKey = req.headers.get('x-api-key') || req.headers.get('authorization')?.replace('Bearer ', '');
    
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: 'API key required. Provide via x-api-key header or Authorization: Bearer <key>' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Validate API key
    const apiKeyRecord = await validateApiKey(apiKey);
    if (!apiKeyRecord) {
      return new Response(
        JSON.stringify({ error: 'Invalid or expired API key' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Check rate limit
    const withinRateLimit = await checkRateLimit(apiKeyRecord);
    if (!withinRateLimit) {
      const responseTime = Date.now() - startTime;
      await logApiRequest(apiKeyRecord, path, false, responseTime);
      
      return new Response(
        JSON.stringify({ 
          error: 'Rate limit exceeded',
          limit: apiKeyRecord.rate_limit,
          requests_made: apiKeyRecord.requests_made + 1
        }),
        { 
          status: 429, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    let response;
    let success = true;

    // Route API requests
    switch (path) {
      case '/analyze':
        if (req.method !== 'POST') {
          throw new Error('Method not allowed. Use POST for /analyze');
        }
        
        const analysisRequest: AnalysisRequest = await req.json();
        
        if (!analysisRequest.imageUrl) {
          throw new Error('imageUrl is required');
        }
        
        const analysisResult = await performAnalysis(analysisRequest);
        
        response = {
          success: true,
          data: analysisResult.data,
          usage: {
            requests_remaining: apiKeyRecord.rate_limit - (apiKeyRecord.requests_made + 1),
            rate_limit: apiKeyRecord.rate_limit
          }
        };
        break;

      case '/status':
        if (req.method !== 'GET') {
          throw new Error('Method not allowed. Use GET for /status');
        }
        
        response = {
          success: true,
          status: 'operational',
          version: '1.0.0',
          usage: {
            requests_made: apiKeyRecord.requests_made + 1,
            requests_remaining: apiKeyRecord.rate_limit - (apiKeyRecord.requests_made + 1),
            rate_limit: apiKeyRecord.rate_limit
          }
        };
        break;

      case '/models':
        if (req.method !== 'GET') {
          throw new Error('Method not allowed. Use GET for /models');
        }
        
        response = {
          success: true,
          models: [
            {
              id: 'auto',
              name: 'Auto-Select Best Model',
              description: 'Automatically selects the best AI model for the analysis'
            },
            {
              id: 'openai',
              name: 'OpenAI GPT-4o Vision',
              description: 'Advanced vision analysis using OpenAI GPT-4o'
            },
            {
              id: 'claude-vision',
              name: 'Claude 3.5 Sonnet',
              description: 'Comprehensive UX analysis using Anthropic Claude'
            },
            {
              id: 'google-vision',
              name: 'Google Vision AI',
              description: 'Object detection and text recognition with Google Vision'
            },
            {
              id: 'stability-ai',
              name: 'Stability.ai',
              description: 'Design concept generation and visual analysis'
            }
          ]
        };
        break;

      default:
        throw new Error('Endpoint not found. Available endpoints: /analyze, /status, /models');
    }

    const responseTime = Date.now() - startTime;
    await logApiRequest(apiKeyRecord, path, success, responseTime);

    return new Response(
      JSON.stringify(response),
      {
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json',
          'X-RateLimit-Limit': apiKeyRecord.rate_limit.toString(),
          'X-RateLimit-Remaining': (apiKeyRecord.rate_limit - (apiKeyRecord.requests_made + 1)).toString(),
          'X-Response-Time': responseTime.toString()
        },
        status: 200
      }
    );

  } catch (error) {
    const responseTime = Date.now() - startTime;
    
    // Try to log the error if we have an API key record
    const apiKey = req.headers.get('x-api-key') || req.headers.get('authorization')?.replace('Bearer ', '');
    if (apiKey) {
      const apiKeyRecord = await validateApiKey(apiKey);
      if (apiKeyRecord) {
        await logApiRequest(apiKeyRecord, new URL(req.url).pathname, false, responseTime);
      }
    }

    console.error('API error:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error'
      }),
      {
        status: error.message.includes('not allowed') ? 405 :
               error.message.includes('not found') ? 404 :
               error.message.includes('required') ? 400 : 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});