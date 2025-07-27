import { useState, useEffect } from 'react';
import { DashboardService, DashboardMetrics } from '@/services/DashboardService';
import { ProjectService } from '@/services/DataMigrationService';
import { useAuth } from '@/context/AuthContext';

export const useDashboardMetrics = () => {
  const { user } = useAuth();
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadMetrics = async () => {
    if (!user) {
      setMetrics(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const projectId = await ProjectService.getCurrentProject();
      const data = await DashboardService.getDashboardMetrics(projectId);
      setMetrics(data);
    } catch (err) {
      console.error('Error loading dashboard metrics:', err);
      setError('Failed to load dashboard metrics');
      setMetrics(null);
    } finally {
      setLoading(false);
    }
  };

  const refreshMetrics = () => {
    loadMetrics();
  };

  useEffect(() => {
    loadMetrics();
  }, [user]);

  return {
    metrics,
    loading,
    error,
    refreshMetrics
  };
};