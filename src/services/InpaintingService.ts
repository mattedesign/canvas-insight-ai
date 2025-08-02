import { supabase } from '@/integrations/supabase/client';

export interface ImageMask {
  x: number;
  y: number;
  width: number;
  height: number;
  toBase64(): string;
}

export interface UXSuggestion {
  id: string;
  title: string;
  description: string;
  inpaintingPrompt: string;
  maskArea: ImageMask;
}

export class InpaintingService {
  private readonly STABILITY_API_KEY = import.meta.env.VITE_STABILITY_API_KEY;
  
  async generateInpaintingSuggestion(
    imageUrl: string,
    mask: ImageMask,
    suggestion: UXSuggestion
  ): Promise<string> {
    if (!this.STABILITY_API_KEY) {
      throw new Error('Stability API key not configured');
    }

    try {
      // Convert image URL to base64
      const imageResponse = await fetch(imageUrl);
      const imageBlob = await imageResponse.blob();
      const imageBase64 = await this.blobToBase64(imageBlob);

      // Call Stability AI inpainting API
      const response = await fetch(
        'https://api.stability.ai/v1/generation/stable-diffusion-xl-1024-v1-0/image-to-image/masking',
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.STABILITY_API_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            init_image: imageBase64,
            mask_image: mask.toBase64(),
            text_prompts: [{
              text: suggestion.inpaintingPrompt,
              weight: 1
            }],
            cfg_scale: 7,
            samples: 1,
            steps: 30
          })
        }
      );

      if (!response.ok) {
        throw new Error(`Stability API error: ${response.statusText}`);
      }

      const data = await response.json();
      
      // Upload to Supabase storage
      const inpaintedImage = data.artifacts[0].base64;
      const fileName = `inpainted_${suggestion.id}_${Date.now()}.png`;
      
      const { data: uploadData, error } = await supabase.storage
        .from('analysis-results')
        .upload(fileName, this.base64ToBlob(inpaintedImage), {
          contentType: 'image/png'
        });

      if (error) throw error;

      // Return public URL
      const { data: { publicUrl } } = supabase.storage
        .from('analysis-results')
        .getPublicUrl(fileName);

      return publicUrl;
    } catch (error) {
      console.error('Inpainting generation failed:', error);
      throw error;
    }
  }

  private async blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  private base64ToBlob(base64: string): Blob {
    const byteString = atob(base64);
    const ab = new ArrayBuffer(byteString.length);
    const ia = new Uint8Array(ab);
    
    for (let i = 0; i < byteString.length; i++) {
      ia[i] = byteString.charCodeAt(i);
    }
    
    return new Blob([ab], { type: 'image/png' });
  }
}