/**
 * Safe environment variable access that works in both browser and Node
 */
export const env = {
  get(key: string): string | undefined {
    // Browser environment (Vite)
    if (typeof window !== 'undefined' && import.meta?.env) {
      return import.meta.env[key];
    }
    // Node environment (for SSR or edge functions)
    if (typeof process !== 'undefined' && process.env) {
      return process.env[key];
    }
    return undefined;
  },
  
  // Convenience methods for common vars
  get VITE_OPENAI_API_KEY() {
    return this.get('VITE_OPENAI_API_KEY');
  },
  
  get VITE_ANTHROPIC_API_KEY() {
    return this.get('VITE_ANTHROPIC_API_KEY');
  },
  
  get VITE_PERPLEXITY_API_KEY() {
    return this.get('VITE_PERPLEXITY_API_KEY');
  },
  
  get VITE_SUPABASE_URL() {
    return this.get('VITE_SUPABASE_URL');
  },
  
  get VITE_SUPABASE_ANON_KEY() {
    return this.get('VITE_SUPABASE_ANON_KEY');
  }
};