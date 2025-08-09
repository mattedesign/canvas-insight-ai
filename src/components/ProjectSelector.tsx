import React from 'react';
import { Check, ChevronDown, BarChart3, FolderOpen, Activity } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useProjectSelection, ProjectOption } from '@/hooks/useProjectSelection';
import { useNavigate } from 'react-router-dom';
interface ProjectSelectorProps {
  className?: string;
}

export const ProjectSelector: React.FC<ProjectSelectorProps> = ({ className }) => {
  const {
    currentProjectId,
    projects,
    aggregatedView,
    loading,
    switchProject,
    toggleAggregatedView
  } = useProjectSelection();
  const navigate = useNavigate();

  const currentProject = projects.find(p => p.id === currentProjectId);
  const activeProjects = projects.filter(p => p.isActive);
  const inactiveProjects = projects.filter(p => !p.isActive);

  const formatProjectLabel = (project: ProjectOption) => {
    const parts = [];
    if (project.analysisCount > 0) parts.push(`${project.analysisCount} analyses`);
    if (project.imageCount > 0) parts.push(`${project.imageCount} images`);
    return parts.length > 0 ? parts.join(', ') : 'No data';
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="outline" 
          className={`min-w-[200px] justify-between ${className}`}
          disabled={loading}
        >
          <div className="flex items-center gap-2">
            {aggregatedView ? (
              <>
                <BarChart3 className="h-4 w-4" />
                <span>All Projects</span>
              </>
            ) : currentProject ? (
              <>
                <FolderOpen className="h-4 w-4" />
                <span className="truncate">{currentProject.name}</span>
              </>
            ) : (
              <>
                <FolderOpen className="h-4 w-4" />
                <span>Select Project</span>
              </>
            )}
          </div>
          <ChevronDown className="h-4 w-4 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent align="start" className="w-[300px]">
        {/* Aggregated View Option */}
        <DropdownMenuItem
          onClick={async () => { toggleAggregatedView(); navigate('/canvas'); }}
          className="flex items-center justify-between"
        >
          <div className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            <div>
              <div className="font-medium">All Projects</div>
              <div className="text-xs text-muted-foreground">
                Combined analytics across all projects
              </div>
            </div>
          </div>
          {aggregatedView && <Check className="h-4 w-4" />}
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        {/* Active Projects */}
        {activeProjects.length > 0 && (
          <>
            <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
              Active Projects
            </div>
            {activeProjects.map((project) => (
              <DropdownMenuItem
                key={project.id}
                onClick={async () => { await switchProject(project.id); navigate(`/canvas/${project.slug}`); }}
                className="flex items-center justify-between"
              >
                <div className="flex items-center gap-2">
                  <Activity className="h-4 w-4 text-green-500" />
                  <div>
                    <div className="font-medium">{project.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {formatProjectLabel(project)}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  {project.analysisCount > 0 && (
                    <Badge variant="secondary" className="text-xs">
                      {project.analysisCount}
                    </Badge>
                  )}
                  {currentProjectId === project.id && !aggregatedView && (
                    <Check className="h-4 w-4" />
                  )}
                </div>
              </DropdownMenuItem>
            ))}
          </>
        )}

        {/* Inactive Projects */}
        {inactiveProjects.length > 0 && (
          <>
            <DropdownMenuSeparator />
            <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
              Inactive Projects
            </div>
            {inactiveProjects.map((project) => (
              <DropdownMenuItem
                key={project.id}
                onClick={async () => { await switchProject(project.id); navigate(`/canvas/${project.slug}`); }}
                className="flex items-center justify-between opacity-60"
              >
                <div className="flex items-center gap-2">
                  <FolderOpen className="h-4 w-4" />
                  <div>
                    <div className="font-medium">{project.name}</div>
                    <div className="text-xs text-muted-foreground">
                      No data yet
                    </div>
                  </div>
                </div>
                {currentProjectId === project.id && !aggregatedView && (
                  <Check className="h-4 w-4" />
                )}
              </DropdownMenuItem>
            ))}
          </>
        )}

        {projects.length === 0 && !loading && (
          <div className="px-2 py-4 text-center text-sm text-muted-foreground">
            No projects found
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};