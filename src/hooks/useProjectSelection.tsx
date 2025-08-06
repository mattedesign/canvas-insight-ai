import { useState, useEffect, useCallback } from 'react';
import { OptimizedProjectService } from '@/services/OptimizedProjectService';
import { useAuth } from '@/context/AuthContext';

export interface ProjectOption {
  id: string;
  name: string;
  description: string | null;
  imageCount: number;
  analysisCount: number;
  isActive: boolean;
}

export const useProjectSelection = () => {
  const { user } = useAuth();
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(null);
  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [aggregatedView, setAggregatedView] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadProjects = useCallback(async () => {
    if (!user) {
      setProjects([]);
      setCurrentProjectId(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Get all projects with counts
      const allProjects = await OptimizedProjectService.getAllProjects();
      
      const projectOptions: ProjectOption[] = allProjects.map(project => ({
        id: project.id,
        name: project.name,
        description: project.description,
        imageCount: project.images[0]?.count || 0,
        analysisCount: project.ux_analyses[0]?.count || 0,
        isActive: (project.images[0]?.count || 0) > 0 || (project.ux_analyses[0]?.count || 0) > 0
      }));

      setProjects(projectOptions);

      // Get current project
      if (!aggregatedView) {
        const current = await OptimizedProjectService.getCurrentProject();
        setCurrentProjectId(current);
      }
    } catch (err) {
      console.error('Error loading projects:', err);
      setError('Failed to load projects');
    } finally {
      setLoading(false);
    }
  }, [user, aggregatedView]);

  const switchProject = useCallback(async (projectId: string) => {
    try {
      setLoading(true);
      await OptimizedProjectService.switchToProject(projectId);
      setCurrentProjectId(projectId);
      setAggregatedView(false);
    } catch (err) {
      console.error('Error switching project:', err);
      setError('Failed to switch project');
    } finally {
      setLoading(false);
    }
  }, []);

  const toggleAggregatedView = useCallback(() => {
    setAggregatedView(prev => !prev);
    if (!aggregatedView) {
      setCurrentProjectId(null);
    }
  }, [aggregatedView]);

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  // Listen for project changes
  useEffect(() => {
    const handleProjectChange = (event: CustomEvent) => {
      const { projectId } = event.detail;
      setCurrentProjectId(projectId);
      loadProjects(); // Refresh project list
    };

    window.addEventListener('projectChanged', handleProjectChange as EventListener);
    return () => {
      window.removeEventListener('projectChanged', handleProjectChange as EventListener);
    };
  }, [loadProjects]);

  return {
    currentProjectId,
    projects,
    aggregatedView,
    loading,
    error,
    switchProject,
    toggleAggregatedView,
    refreshProjects: loadProjects
  };
};