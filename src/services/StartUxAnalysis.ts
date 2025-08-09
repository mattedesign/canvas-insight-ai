import { supabase } from '@/integrations/supabase/client';

export async function startUxAnalysis(params: {
  imageId: string;
  imageUrl: string;
  projectId?: string | null;
  userContext?: string | null;
  dispatchMode?: 'inngest' | 'direct' | 'both';
}): Promise<{ jobId: string }> {
  const dispatchMode = params.dispatchMode ?? (localStorage.getItem('DISPATCH_MODE') as any) ?? 'inngest';
  console.log('[StartUxAnalysis] invoking start-ux-analysis', {
    imageId: params.imageId,
    hasUrl: !!params.imageUrl,
    isBlob: params.imageUrl?.startsWith?.('blob:'),
    dispatchMode,
  });
  const { data, error } = await supabase.functions.invoke('start-ux-analysis', {
    body: {
      imageId: params.imageId,
      imageUrl: params.imageUrl,
      projectId: params.projectId ?? null,
      userContext: params.userContext ?? null,
      dispatchMode,
    },
  });
  console.log('[StartUxAnalysis] invoke response', { ok: !error, jobId: (data as any)?.jobId });

  if (error) {
    console.error('[startUxAnalysis] Error:', error);
    throw new Error(typeof error === 'string' ? error : 'Failed to start UX analysis');
  }

  if (!data?.jobId) {
    throw new Error('No jobId returned from start-ux-analysis');
  }

  return { jobId: data.jobId };
}
