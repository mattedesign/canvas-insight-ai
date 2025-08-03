import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { imageUrl, imageBase64, prompt, model = 'gpt-4o', maxTokens = 1000 } = await req.json();

    // Handle image data - prioritize base64 from frontend over URL fetching
    let processedImageUrl = null;
    
    if (imageBase64) {
      console.log('Using provided base64 image data for context detection, length:', imageBase64.length);
      processedImageUrl = `data:image/jpeg;base64,${imageBase64}`;
    } else if (imageUrl && imageUrl.startsWith('data:')) {
      console.log('Using existing data URL for context detection');
      processedImageUrl = imageUrl;
    } else if (imageUrl && !imageUrl.startsWith('blob:')) {
      console.log('Using provided image URL for context detection');
      processedImageUrl = imageUrl;
    } else {
      throw new Error('No valid image data provided. Blob URLs cannot be accessed from edge functions.');
    }

    // Quick context detection using OpenAI
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('OPENAI_API_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages: [{
          role: 'user',
          content: [
            {
              type: 'text',
              text: prompt
            },
            {
              type: 'image_url',
              image_url: { url: processedImageUrl }
            }
          ]
        }],
        max_tokens: maxTokens,
        temperature: 0.3, // Lower temperature for consistent classification
        response_format: { type: 'json_object' }
      })
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const contextData = JSON.parse(data.choices[0].message.content);

    return new Response(
      JSON.stringify(contextData),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Context detection error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});