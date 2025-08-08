import { supabase } from '@/integrations/supabase/client';
import { AnalysisDataMapper } from '@/services/AnalysisDataMapper';
import type { UXAnalysis } from '@/types/ux-analysis';

export async function fetchLatestAnalysis(imageId: string): Promise<Partial<UXAnalysis>> {
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
  if (!row) {
    throw new Error('No analysis found for this image');
  }

  return AnalysisDataMapper.mapBackendToFrontend(row);
}
