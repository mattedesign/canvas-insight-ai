import { useState, useEffect, useRef, useCallback } from 'react';
import { DashboardService, DashboardMetrics } from '@/services/DashboardService';
import { OptimizedProjectService } from '@/services/OptimizedProjectService';
import { useAuth } from '@/context/AuthContext';

export const useDashboardMetrics = () => {
  const { user } = useAuth();
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Prevent duplicate loads
  const loadingRef = useRef(false);
  const loadedForUserRef = useRef<string | null>(null);

  const loadMetrics = useCallback(async () => {
    // Skip if already loading or loaded for this user
    if (loadingRef.current || loadedForUserRef.current === user?.id) {
      return;
    }

    if (!user) {
      setMetrics(null);
      setLoading(false);
      return;
    }

    try {
      loadingRef.current = true;
      setLoading(true);
      setError(null);
      
      const projectId = await OptimizedProjectService.getCurrentProject();
      const data = await DashboardService.getDashboardMetrics(projectId);
      
      setMetrics(data);
      loadedForUserRef.current = user.id;
    } catch (err) {
      console.error('Error loading dashboard metrics:', err);
      setError('Failed to load dashboard metrics');
      setMetrics(null);
    } finally {
      setLoading(false);
      loadingRef.current = false;
    }
  }, [user?.id]); // Only depend on user ID, not the whole user object

  const refreshMetrics = useCallback(() => {
    loadedForUserRef.current = null; // Reset to force reload
    loadMetrics();
  }, [loadMetrics]);

  useEffect(() => {
    loadMetrics();
  }, [loadMetrics]); // Depend on the stable loadMetrics function

  return {
    metrics,
    loading,
    error,
    refreshMetrics
  };
};