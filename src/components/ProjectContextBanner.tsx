import React from 'react';
import { useParams } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Trash2 } from 'lucide-react';
import { useAppState } from '@/hooks/useAppState';
import { ProjectSelector } from '@/components/ProjectSelector';

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
  
  const { uploadedImages, analyses } = useAppState();
  
  const isDefaultWorkspace = !projectSlug;
  
  
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
          <ProjectSelector className="text-sm" />
          
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

          
        </div>
      </div>
    </div>
  );
};