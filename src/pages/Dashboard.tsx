import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Sidebar } from '@/components/Sidebar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, BarChart3, Images, Lightbulb, Users } from 'lucide-react';

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

const Dashboard = () => {
  const navigate = useNavigate();
  const { user, subscription } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Simple data fetching for dashboard
  useEffect(() => {
    const fetchDashboardStats = async () => {
      if (!user) return;

      try {
        setLoading(true);
        setError(null);

        // Fetch projects with image counts
        const { data: projects, error: projectsError } = await supabase
          .from('projects')
          .select(`
            id,
            name,
            updated_at,
            images(count)
          `)
          .eq('user_id', user.id)
          .order('updated_at', { ascending: false });

        if (projectsError) throw projectsError;

        // Calculate stats
        const totalProjects = projects?.length || 0;
        const totalImages = projects?.reduce((sum, p) => sum + (p.images?.[0]?.count || 0), 0) || 0;

        // Fetch total analyses
        const { count: totalAnalyses } = await supabase
          .from('ux_analyses')
          .select('*', { count: 'exact', head: true });

        // Format recent projects
        const recentProjects = projects?.slice(0, 5).map(p => ({
          id: p.id,
          name: p.name,
          imageCount: p.images?.[0]?.count || 0,
          updatedAt: p.updated_at
        })) || [];

        setStats({
          totalProjects,
          totalImages,
          totalAnalyses: totalAnalyses || 0,
          recentProjects
        });
      } catch (err) {
        console.error('Failed to fetch dashboard stats:', err);
        setError('Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardStats();
  }, [user]);

  if (loading) {
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
              <div>
                <h1 className="text-2xl font-bold">Dashboard</h1>
                <p className="text-muted-foreground">Overview of your UX analysis projects</p>
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

            {/* Quick Actions */}
            <div className="flex gap-4">
              <Button onClick={() => navigate('/canvas')} className="gap-2">
                <Plus className="h-4 w-4" />
                New Project
              </Button>
              <Button variant="outline" onClick={() => navigate('/projects')} className="gap-2">
                <Images className="h-4 w-4" />
                View Projects
              </Button>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Projects</CardTitle>
                  <BarChart3 className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats?.totalProjects || 0}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Images Analyzed</CardTitle>
                  <Images className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats?.totalImages || 0}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">AI Analyses</CardTitle>
                  <Lightbulb className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats?.totalAnalyses || 0}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Account Type</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {subscription?.subscription_tier || 'Free'}
                  </div>
                </CardContent>
              </Card>
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
                    <Button onClick={() => navigate('/canvas')}>
                      Create Your First Project
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {stats?.recentProjects.map((project) => (
                      <div key={project.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div>
                          <h3 className="font-medium">{project.name}</h3>
                          <p className="text-sm text-muted-foreground">
                            {project.imageCount} images • Updated {new Date(project.updatedAt).toLocaleDateString()}
                          </p>
                        </div>
                        <Button variant="outline" size="sm" onClick={() => navigate(`/canvas/${project.id}`)}>
                          Open
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;