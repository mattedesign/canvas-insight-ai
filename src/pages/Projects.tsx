import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileImage, Clock, Users, Plus } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useRouterStateManager } from '@/services/RouterStateManager';
import { Sidebar } from '@/components/Sidebar';
import { OptimizedProjectService } from '@/services/OptimizedProjectService';
import { CanvasStateService } from '@/services/CanvasStateService';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface Project {
  id: string;
  name: string;
  description: string;
  slug: string;
  created_at: string;
  updated_at: string;
  images: { count: number }[];
  ux_analyses: { count: number }[];
}

const Projects = () => {
  const navigate = useNavigate();
  const { navigate: enhancedNavigate } = useRouterStateManager();
  const { user } = useAuth();
  const { toast } = useToast();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  const loadProjects = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      const projectsData = await OptimizedProjectService.getAllProjects();
      setProjects(projectsData);
    } catch (error) {
      console.error('Error loading projects:', error);
      toast({
        title: "Error",
        description: "Failed to load projects",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateProject = async () => {
    try {
      // Create project with auto-generated name and slug
      const project = await OptimizedProjectService.createNewProject();
      
      // Create a default blank canvas state for the new project
      const defaultState = await CanvasStateService.createDefaultState('New Analysis Session');
      await CanvasStateService.saveCanvasState(defaultState);
      
      toast({
        title: "New project created",
        description: `${project.name} is ready for analysis.`,
      });
      
      // Navigate directly to canvas with the project slug
      await enhancedNavigate(`/canvas/${project.slug}`);
    } catch (error) {
      console.error('Error creating project:', error);
      toast({
        title: "Error creating project",
        description: "Failed to create a new project. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleSwitchProject = async (project: Project) => {
    try {
      console.log('Switching to project:', project.name);
      
      // Switch to the project using the service
      await OptimizedProjectService.switchToProject(project.id);
      
      // Clear any existing canvas state for clean start
      await CanvasStateService.clearCanvasState();
      
      toast({
        title: "Project switched",
        description: `Now working on "${project.name}"`,
      });
      
      // Navigate to canvas using project slug
      await enhancedNavigate(`/canvas/${project.slug}`);
    } catch (error) {
      console.error('Failed to switch project:', error);
      toast({
        title: "Error switching project",
        description: "Failed to switch to the selected project. Please try again.",
        variant: "destructive",
      });
    }
  };


  useEffect(() => {
    loadProjects();
  }, [user]);

  const handleClearCanvas = async () => {
    await enhancedNavigate('/dashboard');
  };

  const handleAddImages = async () => {
    await enhancedNavigate('/canvas');
  };

  const handleNavigateToPreviousAnalyses = () => {
    // Already on projects page
  };

  if (loading) {
    return (
      <div className="flex h-screen bg-background">
        <Sidebar 
          onClearCanvas={handleClearCanvas}
          onAddImages={handleAddImages}
          uploadedImages={[]}
          analyses={[]}
          selectedView="gallery"
          onViewChange={() => {}}
          selectedImageId={null}
          onImageSelect={() => {}}
          showAnnotations={false}
          onToggleAnnotations={() => {}}
          onNavigateToPreviousAnalyses={handleNavigateToPreviousAnalyses}
        />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading projects...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-background">
      <Sidebar 
        onClearCanvas={handleClearCanvas}
        onAddImages={handleAddImages}
        uploadedImages={[]}
        analyses={[]}
        selectedView="gallery"
        onViewChange={() => {}}
        selectedImageId={null}
        onImageSelect={() => {}}
        showAnnotations={false}
        onToggleAnnotations={() => {}}
        onNavigateToPreviousAnalyses={handleNavigateToPreviousAnalyses}
      />
      
      <div className="flex-1 p-6 overflow-auto">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground">Projects</h1>
              <p className="text-muted-foreground">View and manage your UX analysis projects</p>
            </div>
            <Button onClick={handleCreateProject}>
              <Plus className="w-4 h-4 mr-2" />
              New Project
            </Button>
          </div>

          {/* Projects Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.map((project) => {
              const imageCount = project.images?.[0]?.count || 0;
              const analysisCount = project.ux_analyses?.[0]?.count || 0;
              
              return (
                <Card 
                  key={project.id} 
                  className="hover:shadow-lg transition-shadow cursor-pointer"
                  onClick={() => handleSwitchProject(project)}
                >
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-lg truncate">{project.name}</CardTitle>
                        <CardDescription className="flex items-center gap-1 mt-1">
                          <Clock className="w-4 h-4" />
                          {new Date(project.updated_at).toLocaleDateString()}
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {project.description && (
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {project.description}
                        </p>
                      )}
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <FileImage className="w-4 h-4" />
                          {imageCount} images
                        </div>
                        <div className="flex items-center gap-1">
                          <Users className="w-4 h-4" />
                          {analysisCount} analyses
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" className="flex-1">
                          Open Project
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Empty State */}
          {projects.length === 0 && (
            <div className="text-center py-12">
              <FileImage className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">No Projects Yet</h3>
              <p className="text-muted-foreground mb-4">
                Create your first project to start organizing your UX analyses.
              </p>
              <Button onClick={handleCreateProject}>
                <Plus className="w-4 h-4 mr-2" />
                Create New Project
              </Button>
            </div>
          )}
        </div>
      </div>

    </div>
  );
};

export default Projects;