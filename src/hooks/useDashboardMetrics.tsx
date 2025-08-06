import { useState, useEffect, useRef, useCallback } from 'react';
import { DashboardService, DashboardMetrics } from '@/services/DashboardService';
import { OptimizedProjectService } from '@/services/OptimizedProjectService';
import { useAuth } from '@/context/AuthContext';

export const useDashboardMetrics = (projectId?: string | null, aggregatedView = false) => {
  const { user, loading: authLoading } = useAuth();
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [aggregatedMetrics, setAggregatedMetrics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Prevent duplicate loads
  const loadingRef = useRef(false);
  const lastLoadKey = useRef<string>('');

  const loadMetrics = useCallback(async () => {
    // Wait for auth to complete before proceeding
    if (authLoading) {
      return;
    }

    if (!user) {
      console.log('[useDashboardMetrics] No authenticated user, clearing metrics');
      setMetrics(null);
      setAggregatedMetrics(null);
      setLoading(false);
      return;
    }

    // Create a key to prevent duplicate loads
    const loadKey = `${user.id}-${projectId || 'smart'}-${aggregatedView}`;
    if (loadingRef.current || lastLoadKey.current === loadKey) {
      return;
    }

    try {
      loadingRef.current = true;
      setLoading(true);
      setError(null);
      
      if (aggregatedView) {
        // Load aggregated metrics across all projects
        const aggregated = await OptimizedProjectService.getAggregatedMetrics();
        setAggregatedMetrics(aggregated);
        setMetrics(null);
      } else {
        // Load metrics for specific or smart-selected project
        const targetProjectId = projectId || await OptimizedProjectService.getCurrentProject();
        const data = await DashboardService.getDashboardMetrics(targetProjectId);
        setMetrics(data);
        setAggregatedMetrics(null);
      }
      
      lastLoadKey.current = loadKey;
    } catch (err) {
      console.error('Error loading dashboard metrics:', err);
      setError('Failed to load dashboard metrics');
      setMetrics(null);
      setAggregatedMetrics(null);
    } finally {
      setLoading(false);
      loadingRef.current = false;
    }
  }, [user?.id, projectId, aggregatedView, authLoading]);

  const refreshMetrics = useCallback(() => {
    lastLoadKey.current = ''; // Reset to force reload
    loadMetrics();
  }, [loadMetrics]);

  useEffect(() => {
    loadMetrics();
  }, [loadMetrics]);

  // Listen for project changes
  useEffect(() => {
    const handleProjectChange = () => {
      lastLoadKey.current = ''; // Reset to force reload
      loadMetrics();
    };

    window.addEventListener('projectChanged', handleProjectChange);
    return () => {
      window.removeEventListener('projectChanged', handleProjectChange);
    };
  }, [loadMetrics]);

  return {
    metrics,
    aggregatedMetrics,
    loading,
    error,
    refreshMetrics
  };
};