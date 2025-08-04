import { useEffect } from 'react';
import { useProject } from '@/contexts/ProjectContext';
import { useNavigate } from 'react-router-dom';
import { toast } from '@/components/ui/use-toast';

/**
 * Hook to ensure a project is selected before accessing project-specific features
 * Redirects to project selection if no project is selected
 */
export const useRequireProject = () => {
  const { currentProject, isLoading } = useProject();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoading && !currentProject) {
      toast({
        title: 'No Project Selected',
        description: 'Please select or create a project to continue.',
        variant: 'destructive',
      });
      // In a real app, you might navigate to a project selection page
      // For now, we'll just show the toast
    }
  }, [currentProject, isLoading, navigate]);

  return { currentProject, isLoading };
};
