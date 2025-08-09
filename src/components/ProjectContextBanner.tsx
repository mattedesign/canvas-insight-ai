import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FolderOpen, Home, Settings, Trash2 } from 'lucide-react';
import { useAppState } from '@/hooks/useAppState';

interface ProjectContextBannerProps {
  onCleanupWorkspace?: () => void;
  onStartAnalysis?: () => void;
  isLoading?: boolean;
  projectName?: string;
}

export const ProjectContextBanner: React.FC<ProjectContextBannerProps> = ({
  onCleanupWorkspace,
  onStartAnalysis,
  isLoading = false,
  projectName
}) => {
  const { projectSlug } = useParams<{ projectSlug?: string }>();
  const navigate = useNavigate();
  const { uploadedImages, analyses } = useAppState();
  
  const isDefaultWorkspace = !projectSlug;
  const displayName = projectName || (isDefaultWorkspace ? 'Default Workspace' : projectSlug);
  
  const itemCount = (uploadedImages?.length || 0) + (analyses?.length || 0);
  
  if (isLoading) {
    return (
      <div className="bg-muted/50 border-b border-border px-4 py-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="h-4 w-4 animate-pulse bg-muted-foreground/20 rounded"></div>
            <div className="h-4 w-20 animate-pulse bg-muted-foreground/20 rounded"></div>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="bg-muted/50 border-b border-border px-4 py-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2">
            {isDefaultWorkspace ? (
              <Home className="h-4 w-4 text-muted-foreground" />
            ) : (
              <FolderOpen className="h-4 w-4 text-muted-foreground" />
            )}
            <span className="text-sm font-medium text-foreground">
              {displayName}
            </span>
          </div>
          
          {isDefaultWorkspace && (
            <Badge variant="secondary" className="text-xs">
              Default Workspace
            </Badge>
          )}
          
          {itemCount > 0 && (
            <Badge variant="outline" className="text-xs">
              {itemCount} items
            </Badge>
          )}
        </div>
        
        <div className="flex items-center space-x-2">
          {!isDefaultWorkspace && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/canvas')}
              className="text-xs"
            >
              <Home className="h-3 w-3 mr-1" />
              Back to Workspace
            </Button>
          )}
          
          {isDefaultWorkspace && itemCount > 0 && onCleanupWorkspace && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onCleanupWorkspace}
              className="text-xs text-muted-foreground hover:text-destructive"
            >
              <Trash2 className="h-3 w-3 mr-1" />
              Clean Up
            </Button>
          )}

          {typeof onStartAnalysis === 'function' && (
            <Button
              variant="default"
              size="sm"
              onClick={onStartAnalysis}
              className="text-xs"
            >
              Start UX Analysis
            </Button>
          )}
          
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/projects')}
            className="text-xs"
          >
            <Settings className="h-3 w-3 mr-1" />
            Manage Projects
          </Button>
        </div>
      </div>
    </div>
  );
};