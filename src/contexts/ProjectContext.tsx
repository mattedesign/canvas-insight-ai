import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Project } from '@/types/ux-analysis';
import { useParams, useNavigate } from 'react-router-dom';
import { projectService } from '@/services/projectService';
import { toast } from 'sonner';

interface ProjectContextType {
  currentProject: Project | null;
  setCurrentProject: (project: Project | null) => void;
  isLoading: boolean;
}

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

export const useProject = () => {
  const context = useContext(ProjectContext);
  if (!context) {
    throw new Error('useProject must be used within a ProjectProvider');
  }
  return context;
};

interface ProjectProviderProps {
  children: ReactNode;
}

export const ProjectProvider: React.FC<ProjectProviderProps> = ({ children }) => {
  const [currentProject, setCurrentProject] = useState<Project | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadProject = async () => {
      try {
        // Check if we're on a project-specific route
        const path = window.location.pathname;
        const projectMatch = path.match(/\/canvas\/(.+)/);
        
        if (projectMatch) {
          // Extract project ID from URL
          const projectId = projectMatch[1];
          // Fetch the actual project from database
          const project = await projectService.getProject(projectId);
          
          if (project) {
            setCurrentProject(project);
          } else {
            toast.error('Project not found');
            // Redirect to projects page if project doesn't exist
            window.location.href = '/projects';
          }
        } else {
          // Load the last selected project from localStorage
          const savedProjectId = localStorage.getItem('lastProjectId');
          if (savedProjectId) {
            const project = await projectService.getProject(savedProjectId);
            if (project) {
              setCurrentProject(project);
            }
          }
        }
      } catch (error) {
        console.error('Error loading project:', error);
        toast.error('Failed to load project');
      } finally {
        setIsLoading(false);
      }
    };

    loadProject();
  }, []);

  const handleSetCurrentProject = (project: Project | null) => {
    setCurrentProject(project);
    if (project) {
      localStorage.setItem('lastProjectId', project.id);
    } else {
      localStorage.removeItem('lastProjectId');
    }
  };

  return (
    <ProjectContext.Provider
      value={{
        currentProject,
        setCurrentProject: handleSetCurrentProject,
        isLoading,
      }}
    >
      {children}
    </ProjectContext.Provider>
  );
};
