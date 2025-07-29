import React, { useEffect, useRef } from 'react';
import { useSimplifiedAppContext } from '@/context/SimplifiedAppContext';
import { useAuth } from '@/context/AuthContext';
import { ProjectService } from '@/services/DataMigrationService';

interface ErrorDisplayProps {
  error: string;
  onRetry: () => void;
}

const ErrorDisplay: React.FC<ErrorDisplayProps> = ({ error, onRetry }) => (
  <div className="flex h-screen bg-background items-center justify-center">
    <div className="flex flex-col items-center gap-4">
      <p className="text-destructive">Error: {error}</p>
      <button onClick={onRetry} className="px-4 py-2 bg-primary text-primary-foreground rounded">
        Retry
      </button>
    </div>
  </div>
);

const LoadingSpinner: React.FC<{ message: string }> = ({ message }) => (
  <div className="flex h-screen bg-background items-center justify-center">
    <div className="flex flex-col items-center gap-4">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      <p className="text-muted-foreground">{message}</p>
    </div>
  </div>
);

const Canvas = () => {
  const { state, stableHelpers, loadingMachine } = useSimplifiedAppContext();
  const { user } = useAuth();
  
  const loadedProjectRef = useRef<{ projectId: string | null; timestamp: number }>({
    projectId: null,
    timestamp: 0
  });

  // Load project data ONCE with stable reference - this is the key fix
  useEffect(() => {
    const loadData = async () => {
      if (!user) return;
      
      const now = Date.now();
      const projectId = await ProjectService.getCurrentProject();
      
      // Prevent duplicate loads
      if (loadedProjectRef.current.projectId === projectId && 
          now - loadedProjectRef.current.timestamp < 5000) {
        return;
      }
      
      loadedProjectRef.current = { projectId, timestamp: now };
      await stableHelpers.loadData();
    };
    
    loadData();
  }, [user, stableHelpers.loadData]); // Include stableHelpers.loadData

  const { uploadedImages, analyses, imageGroups, groupAnalysesWithPrompts, error } = state;
  const isLoading = loadingMachine.state.appData === 'loading';

  if (isLoading) {
    return <LoadingSpinner message="Loading project data..." />;
  }

  if (error) {
    return (
      <ErrorDisplay 
        error={error} 
        onRetry={() => stableHelpers.loadData()} 
      />
    );
  }

  return (
    <div className="canvas-container p-8">
      <h1 className="text-2xl font-bold mb-4">Canvas - Stable Context Pattern</h1>
      <div className="grid grid-cols-2 gap-4">
        <div className="border p-4 rounded">
          <h2 className="text-lg font-semibold mb-2">Images ({uploadedImages.length})</h2>
          {uploadedImages.map(img => (
            <div key={img.id} className="text-sm">{img.name}</div>
          ))}
        </div>
        <div className="border p-4 rounded">
          <h2 className="text-lg font-semibold mb-2">Analyses ({analyses.length})</h2>
          {analyses.map(analysis => (
            <div key={analysis.id} className="text-sm">{analysis.id}</div>
          ))}
        </div>
        <div className="border p-4 rounded">
          <h2 className="text-lg font-semibold mb-2">Groups ({imageGroups.length})</h2>
          {imageGroups.map(group => (
            <div key={group.id} className="text-sm">{group.name}</div>
          ))}
        </div>
        <div className="border p-4 rounded">
          <h2 className="text-lg font-semibold mb-2">Group Analyses ({groupAnalysesWithPrompts.length})</h2>
          {groupAnalysesWithPrompts.map(ga => (
            <div key={ga.id} className="text-sm">{ga.prompt}</div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Canvas;