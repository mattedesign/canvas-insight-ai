import { supabase } from '@/integrations/supabase/client';

export async function startGroupUxAnalysis(params: {
  groupId?: string | null;
  imageUrls: string[];
  groupName?: string | null;
  projectId?: string | null;
  userContext?: string | null;
}): Promise<{ jobId: string }> {
  const { data, error } = await supabase.functions.invoke('start-group-ux-analysis', {
    body: {
      groupId: params.groupId ?? null,
      imageUrls: params.imageUrls,
      groupName: params.groupName ?? null,
      projectId: params.projectId ?? null,
      userContext: params.userContext ?? null,
    },
  });

  if (error) {
    console.error('[startGroupUxAnalysis] Error:', error);
    throw new Error(typeof error === 'string' ? error : 'Failed to start group UX analysis');
  }

  if (!data?.jobId) {
    throw new Error('No jobId returned from start-group-ux-analysis');
  }

  return { jobId: data.jobId };
}
