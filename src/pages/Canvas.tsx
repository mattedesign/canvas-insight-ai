import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useProject } from '@/contexts/ProjectContext';
import { UXAnalysisTool } from '@/components/UXAnalysisTool';
import { imageService } from '@/services/imageService';
import { analysisService } from '@/services/analysisService';
import { UploadedImage, UXAnalysis } from '@/types/ux-analysis';
import { toast } from 'sonner';

const Canvas: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const { setCurrentProject, currentProject } = useProject();
  const [existingImages, setExistingImages] = useState<UploadedImage[]>([]);
  const [existingAnalyses, setExistingAnalyses] = useState<UXAnalysis[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadProjectData = async () => {
      if (!projectId) return;
      
      try {
        setIsLoading(true);
        
        // Set current project
        // In production, fetch from database
        setCurrentProject({
          id: projectId,
          name: 'Sleek Project', // This should come from DB
          description: '',
          createdAt: new Date(),
          updatedAt: new Date(),
        });
        
        // Load existing images and analyses
        const [images, analyses] = await Promise.all([
          imageService.getProjectImages(projectId),
          analysisService.getProjectAnalyses(projectId)
        ]);
        
        setExistingImages(images);
        setExistingAnalyses(analyses);
        
      } catch (error) {
        console.error('Failed to load project data:', error);
        toast.error('Failed to load project data');
      } finally {
        setIsLoading(false);
      }
    };
    
    loadProjectData();
  }, [projectId, setCurrentProject]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 mx-auto bg-muted rounded-full flex items-center justify-center animate-pulse">
            <span className="text-2xl">📊</span>
          </div>
          <p className="text-muted-foreground">Loading project...</p>
        </div>
      </div>
    );
  }

  return (
    <UXAnalysisTool 
      initialImages={existingImages}
      initialAnalyses={existingAnalyses}
      // Start with gallery view if we have images, otherwise summary
      initialView={existingImages.length > 0 ? 'gallery' : 'summary'}
    />
  );
};

export default Canvas;
