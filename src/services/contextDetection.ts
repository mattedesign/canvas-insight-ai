import { createClient } from '@supabase/supabase-js';

// Get API key from process.env for Node environment
const OPENAI_API_KEY = process.env.VITE_OPENAI_API_KEY || process.env.OPENAI_API_KEY;
const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';

export interface DetectionResult {
  domain: string;
  interfaceType: string;
  confidence: number;
  elements: string[];
  description: string;
}

export class ContextDetectionService {
  async detectImageContext(imageUrl: string): Promise<DetectionResult> {
    try {
      console.log('🔍 Analyzing image context:', imageUrl);
      
      if (!OPENAI_API_KEY) {
        console.warn('⚠️ OpenAI API key not found, using mock data');
        return this.getMockResult();
      }
      
      // Call OpenAI Vision API
      const response = await fetch(OPENAI_API_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4-vision-preview',
          messages: [
            {
              role: 'system',
              content: 'You are a UX/UI expert. Analyze the image and identify the domain (website, mobile app, desktop app), interface type (landing page, dashboard, form, etc.), and key UI elements present.'
            },
            {
              role: 'user',
              content: [
                {
                  type: 'text',
                  text: 'Analyze this interface and provide: 1) Domain type, 2) Interface type, 3) Key UI elements present. Respond in JSON format.'
                },
                {
                  type: 'image_url',
                  image_url: {
                    url: imageUrl
                  }
                }
              ]
            }
          ],
          response_format: { type: 'json_object' },
          max_tokens: 300
        })
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.statusText}`);
      }

      const data = await response.json();
      const result = JSON.parse(data.choices[0].message.content);

      return {
        domain: result.domain || 'unknown',
        interfaceType: result.interface_type || 'unknown',
        confidence: result.confidence || 0.8,
        elements: result.elements || [],
        description: result.description || 'No description available'
      };
      
    } catch (error) {
      console.error('❌ Context detection failed:', error);
      return this.getMockResult();
    }
  }
  
  private getMockResult(): DetectionResult {
    // Fallback mock data for testing
    return {
      domain: 'website',
      interfaceType: 'landing-page',
      confidence: 0.95,
      elements: ['hero-section', 'navigation', 'features'],
      description: 'Mock detection - add OpenAI API key for real analysis'
    };
  }
}
