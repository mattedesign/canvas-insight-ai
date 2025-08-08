import { supabase } from '@/integrations/supabase/client';

export async function startUxAnalysis(params: {
  imageId: string;
  imageUrl: string;
  projectId?: string | null;
  userContext?: string | null;
}): Promise<{ jobId: string }> {
  const { data, error } = await supabase.functions.invoke('start-ux-analysis', {
    body: {
      imageId: params.imageId,
      imageUrl: params.imageUrl,
      projectId: params.projectId ?? null,
      userContext: params.userContext ?? null,
    },
  });

  if (error) {
    console.error('[startUxAnalysis] Error:', error);
    throw new Error(typeof error === 'string' ? error : 'Failed to start UX analysis');
  }

  if (!data?.jobId) {
    throw new Error('No jobId returned from start-ux-analysis');
  }

  return { jobId: data.jobId };
}
