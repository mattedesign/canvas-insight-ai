import { supabase } from '@/integrations/supabase/client';
import { AnalysisDataMapper } from '@/services/AnalysisDataMapper';
import type { UXAnalysis } from '@/types/ux-analysis';

export async function fetchLatestAnalysis(imageId: string): Promise<Partial<UXAnalysis>> {
  const maxAttempts = 15; // ~15s total
  const delayMs = 1000;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const { data, error } = await supabase
      .from('ux_analyses')
      .select('*')
      .eq('image_id', imageId)
      .order('created_at', { ascending: false })
      .limit(1);

    if (error) {
      console.error('[fetchLatestAnalysis] Error:', error);
      throw new Error(error.message || 'Failed to load analysis');
    }

    const row = data?.[0];
    if (row) {
      return AnalysisDataMapper.mapBackendToFrontend(row);
    }

    // Not found yet: wait and retry
    await new Promise((res) => setTimeout(res, delayMs));
  }

  throw new Error('No analysis found for this image after waiting for processing to complete');
}

