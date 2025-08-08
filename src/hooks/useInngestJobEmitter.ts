import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

/**
 * Subscribes to analysis_jobs inserts/updates and emits Inngest events
 * via the secure inngest-dispatch Edge Function (server holds the secret).
 */
export function useInngestJobEmitter() {
  useEffect(() => {
    let channel: any;
    let mounted = true;

    const subscribe = async () => {
      try {
        channel = supabase
          .channel('analysis-jobs-changes')
          .on(
            'postgres_changes',
            { event: 'INSERT', schema: 'public', table: 'analysis_jobs' },
            async (payload) => {
              if (!mounted) return;
              const job = payload.new as any;
              console.log('[Inngest] Emitting analysis/job.created', job?.id);
              try {
                const { data, error } = await supabase.functions.invoke('inngest-dispatch', {
                  body: {
                    name: 'analysis/job.created',
                    data: job,
                    user: job?.user_id || undefined,
                    id: job?.id,
                  },
                });
                if (error) console.error('[Inngest] dispatch error (created):', error);
                else console.log('[Inngest] dispatch ok (created):', data);
              } catch (err) {
                console.error('[Inngest] dispatch threw (created):', err);
              }
            }
          )
          .on(
            'postgres_changes',
            { event: 'UPDATE', schema: 'public', table: 'analysis_jobs' },
            async (payload) => {
              if (!mounted) return;
              const job = payload.new as any;
              console.log('[Inngest] Emitting analysis/job.updated', job?.id, job?.status, job?.current_stage);
              try {
                const { data, error } = await supabase.functions.invoke('inngest-dispatch', {
                  body: {
                    name: 'analysis/job.updated',
                    data: job,
                    user: job?.user_id || undefined,
                    id: job?.id,
                  },
                });
                if (error) console.error('[Inngest] dispatch error (updated):', error);
                else console.log('[Inngest] dispatch ok (updated):', data);
              } catch (err) {
                console.error('[Inngest] dispatch threw (updated):', err);
              }
            }
          );

        await channel.subscribe();
        console.log('[Inngest] Subscribed to analysis_jobs changes');
      } catch (e) {
        console.error('[Inngest] Failed to subscribe to analysis_jobs changes', e);
      }
    };

    subscribe();

    return () => {
      mounted = false;
      if (channel) supabase.removeChannel(channel);
    };
  }, []);
}
