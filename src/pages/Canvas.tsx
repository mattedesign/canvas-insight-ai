import React, { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useProject } from '@/contexts/ProjectContext';
import { UXAnalysisTool } from '@/components/UXAnalysisTool';

const Canvas: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const { setCurrentProject } = useProject();

  useEffect(() => {
    // Update the current project based on the URL
    if (projectId) {
      // In a real app, fetch the project from the database
      setCurrentProject({
        id: projectId,
        name: projectId.split('-').map(word => 
          word.charAt(0).toUpperCase() + word.slice(1)
        ).join(' '),
        description: '',
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }
  }, [projectId, setCurrentProject]);

  return <UXAnalysisTool />;
};

export default Canvas;
