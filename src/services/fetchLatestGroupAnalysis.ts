import { supabase } from '@/integrations/supabase/client';

export async function fetchLatestGroupAnalysis(groupId: string) {
  const { data, error } = await supabase
    .from('group_analyses')
    .select('*')
    .eq('group_id', groupId)
    .order('created_at', { ascending: false })
    .limit(1);

  if (error) {
    console.error('[fetchLatestGroupAnalysis] Error:', error);
    throw new Error(error.message || 'Failed to load group analysis');
  }

  const row = data?.[0];
  if (!row) {
    throw new Error('No group analysis found');
  }

  return row;
}
