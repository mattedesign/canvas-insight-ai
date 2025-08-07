import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useDashboardMetrics } from '@/hooks/useDashboardMetrics';
import { DashboardMetrics } from '@/services/DashboardService';
import { SummaryDashboard } from '@/components/summary/SummaryDashboard';
import { Sidebar } from '@/components/Sidebar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

import { Plus, BarChart3, Images, Lightbulb, Users, Activity } from 'lucide-react';
import { ProjectService } from '@/services/DataMigrationService';
import { CanvasStateService } from '@/services/CanvasStateService';
import { useFilteredToast } from '@/hooks/use-filtered-toast';
import { UXAnalysis } from '@/types/ux-analysis';
import { ProjectSelector } from '@/components/ProjectSelector';
import { useProjectSelection } from '@/hooks/useProjectSelection';

interface DashboardStats {
  totalProjects: number;
  totalImages: number;
  totalAnalyses: number;
  recentProjects: Array<{
    id: string;
    name: string;
    imageCount: number;
    updatedAt: string;
  }>;
}

// Memoized sub-components for better performance
const StatsCard = React.memo<{
  title: string;
  value: number | string;
  icon: React.ComponentType<{ className?: string }>;
}>(({ title, value, icon: Icon }) => (
  <Card>
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <CardTitle className="text-sm font-medium">{title}</CardTitle>
      <Icon className="h-4 w-4 text-muted-foreground" />
    </CardHeader>
    <CardContent>
      <div className="text-2xl font-bold">{value}</div>
    </CardContent>
  </Card>
));

const RecentProjectItem = React.memo<{
  project: { id: string; name: string; imageCount: number; updatedAt: string };
  onOpen: (projectId: string) => void;
}>(({ project, onOpen }) => (
  <div className="flex items-center justify-between p-4 border rounded-lg">
    <div>
      <h3 className="font-medium">{project.name}</h3>
      <p className="text-sm text-muted-foreground">
        {project.imageCount} images • Updated {new Date(project.updatedAt).toLocaleDateString()}
      </p>
    </div>
    <Button variant="outline" size="sm" onClick={() => onOpen(project.id)}>
      Open
    </Button>
  </div>
));

const Dashboard = () => {
  const navigate = useNavigate();
  const { user, subscription } = useAuth();
  const toast = useFilteredToast();
  const { aggregatedMetrics, loading: metricsLoading, error: metricsError, refreshMetrics } = useDashboardMetrics(null, true);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [analyses, setAnalyses] = useState<UXAnalysis[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Add this ref after state declarations
  const projectsLoadedRef = useRef(false);
  const lastMetricsRef = useRef<DashboardMetrics | null>(null);

  // Performance monitoring removed for production optimization

  const handleCreateProject = async () => {
    try {
      // Create project
      const project = await ProjectService.createNewProject();
      
      // Switch to it first
      await ProjectService.switchToProject(project.id);
      
      // Create default canvas state
      const defaultState = await CanvasStateService.createDefaultState('New Analysis Session');
      await CanvasStateService.saveCanvasState(defaultState);
      
      toast.toast({
        category: 'success',
        title: "New project created",
        description: `${project.name} is ready for analysis.`,
      });
      
      // Small delay to ensure project switch completes
      setTimeout(() => {
        navigate(`/canvas/${project.slug}`);
      }, 100);
    } catch (error) {
      console.error('Error creating project:', error);
      toast.toast({
        category: 'error',
        title: "Error creating project",
        description: "Failed to create a new project. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Update the useEffect for fetching projects
  useEffect(() => {
    // Skip if already loaded or no user
    if (projectsLoadedRef.current || !user || metricsLoading) return;
    
    // Skip if metrics haven't changed
    if (aggregatedMetrics === lastMetricsRef.current) return;
    
    const fetchProjectsData = async () => {
      try {
        projectsLoadedRef.current = true;
        lastMetricsRef.current = aggregatedMetrics;
        setLoading(true);
        setError(metricsError);

        // Fetch projects with image counts for recent projects section
        const { data: projects, error: projectsError } = await supabase
          .from('projects')
          .select('id, name, updated_at')
          .eq('user_id', user.id)
          .order('updated_at', { ascending: false })
          .limit(5);

        if (projectsError) throw projectsError;

        // Get image counts for each project
        const projectsWithCounts = await Promise.all(
          (projects || []).map(async (project) => {
            const { count: imageCount } = await supabase
              .from('images')
              .select('id', { count: 'exact' })
              .eq('project_id', project.id);

            return {
              id: project.id,
              name: project.name,
              imageCount: imageCount || 0,
              updatedAt: project.updated_at
            };
          })
        );

        // For the summary dashboard, we'll use the metrics data directly
        setAnalyses([]);

        setStats({
          totalProjects: aggregatedMetrics?.totalProjects || (projects?.length || 0),
          totalImages: aggregatedMetrics?.totalImages || 0,
          totalAnalyses: aggregatedMetrics?.totalAnalyses || 0,
          recentProjects: projectsWithCounts
        });
      } catch (err) {
        console.error('Failed to fetch projects data:', err);
        setError('Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    };

    fetchProjectsData();
  }, [user?.id, aggregatedMetrics?.totalAnalyses, metricsLoading]);

  if (loading || metricsLoading) {
    return (
      <div className="flex h-screen bg-background">
        <Sidebar 
          selectedView="summary"
          onViewChange={(view) => {
            if (view === 'canvas') navigate('/canvas');
            else if (view === 'gallery') navigate('/projects');
          }}
          uploadedImages={[]}
          analyses={[]}
          onClearCanvas={() => {}}
          onAddImages={() => {}}
          onImageSelect={() => {}}
          onToggleAnnotations={() => {}}
          onNavigateToPreviousAnalyses={() => {}}
          selectedImageId={null}
          showAnnotations={false}
        />
        <div className="flex-1 p-6">
          <div className="max-w-7xl mx-auto space-y-6">
            <Skeleton className="h-8 w-64" />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-32" />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-background">
      <Sidebar 
        selectedView="summary"
        onViewChange={(view) => {
          if (view === 'canvas') navigate('/canvas');
          else if (view === 'gallery') navigate('/projects');
        }}
        uploadedImages={[]}
        analyses={[]}
        onClearCanvas={() => {}}
        onAddImages={() => {}}
        onImageSelect={() => {}}
        onToggleAnnotations={() => {}}
        onNavigateToPreviousAnalyses={() => navigate('/projects')}
        selectedImageId={null}
        showAnnotations={false}
      />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="border-b bg-background/95 backdrop-blur">
          <div className="max-w-7xl mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div>
                  <h1 className="text-2xl font-bold">Portfolio Dashboard</h1>
                  <p className="text-muted-foreground">Aggregated insights across all your UX analysis projects</p>
                </div>
              </div>
              
              {/* Quick Actions */}
              <div className="flex gap-4">
                <Button onClick={handleCreateProject} className="gap-2">
                  <Plus className="h-4 w-4" />
                  New Project
                </Button>
                <Button variant="outline" onClick={() => navigate('/projects')} className="gap-2">
                  <Images className="h-4 w-4" />
                  View Projects
                </Button>
              </div>
              
              {/* Subscription Status */}
              {subscription && (
                <Badge variant="outline">
                  {subscription.subscription_tier.charAt(0).toUpperCase() + subscription.subscription_tier.slice(1)} Plan
                  {subscription.analysis_limit !== -1 && (
                    <span className="ml-2">
                      {subscription.analysis_count}/{subscription.analysis_limit} analyses
                    </span>
                  )}
                </Badge>
              )}
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-auto">
          <div className="max-w-7xl mx-auto p-6 space-y-6">
            {error && (
              <Card className="border-destructive">
                <CardContent className="pt-6">
                  <p className="text-destructive">{error}</p>
                </CardContent>
              </Card>
            )}



            {/* Main Content */}
            <div className="space-y-6">
              {/* Stats Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {aggregatedMetrics ? (
                  <>
                    <StatsCard
                      title="Total Projects"
                      value={aggregatedMetrics.totalProjects}
                      icon={BarChart3}
                    />
                    <StatsCard
                      title="Total Images"
                      value={aggregatedMetrics.totalImages}
                      icon={Images}
                    />
                    <StatsCard
                      title="Total Analyses"
                      value={aggregatedMetrics.totalAnalyses}
                      icon={Lightbulb}
                    />
                    <StatsCard
                      title="Active Projects"
                      value={aggregatedMetrics.activeProjects}
                      icon={Activity}
                    />
                  </>
                ) : (
                  <div className="col-span-4 text-center py-8">
                    <p className="text-muted-foreground">No data available</p>
                  </div>
                )}
              </div>

              {/* Recent Projects */}
              <Card>
                <CardHeader>
                  <CardTitle>Recent Projects</CardTitle>
                  <CardDescription>Your most recently updated projects</CardDescription>
                </CardHeader>
                <CardContent>
                  {stats?.recentProjects.length === 0 ? (
                    <div className="text-center py-8">
                      <p className="text-muted-foreground mb-4">No projects yet</p>
                      <Button onClick={handleCreateProject}>
                        Create Your First Project
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {stats?.recentProjects.map((project) => (
                        <RecentProjectItem
                          key={project.id}
                          project={project}
                          onOpen={(projectId) => navigate(`/canvas/${projectId}`)}
                        />
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Memoize the main component to prevent unnecessary re-renders
export default React.memo(Dashboard);