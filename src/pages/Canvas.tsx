import React, { useEffect, useRef, useState } from 'react';
import { useSimplifiedAppContext } from '@/context/SimplifiedAppContext';
import { useAuth } from '@/context/AuthContext';
import { ProjectService } from '@/services/DataMigrationService';

interface ErrorDisplayProps {
  error: string;
  onRetry: () => void;
}

const ErrorDisplay: React.FC<ErrorDisplayProps> = ({ error, onRetry }) => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <div className="text-center max-w-md">
      <h2 className="text-2xl font-bold text-destructive mb-4">Error</h2>
      <p className="text-muted-foreground mb-4">{error}</p>
      <button 
        onClick={onRetry}
        className="px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90"
      >
        Try Again
      </button>
    </div>
  </div>
);

const LoadingSpinner: React.FC<{ message?: string }> = ({ message = "Loading..." }) => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <div className="text-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
      <p className="mt-2 text-muted-foreground">{message}</p>
    </div>
  </div>
);

// Error Boundary Component
class ErrorBoundary extends React.Component<{
  children: React.ReactNode;
  fallback: React.ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}, { hasError: boolean }> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.props.onError?.(error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }

    return this.props.children;
  }
}

const Canvas = () => {
  const { state, stableHelpers, loadingMachine } = useSimplifiedAppContext();
  const { user } = useAuth();
  const [canvasError, setCanvasError] = useState<string | null>(null);
  
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

  const { uploadedImages, analyses, imageGroups, groupAnalysesWithPrompts, error, generatedConcepts, groupDisplayModes, showAnnotations } = state;
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

  // Add this TEMPORARY debug code to your Canvas.tsx file
  // Replace your current CanvasView rendering with this:
  try {
    console.log('Canvas Debug - About to render CanvasView with:', {
      images: uploadedImages?.length || 0,
      analyses: analyses?.length || 0,
      groups: imageGroups?.length || 0,
      showAnnotations,
      canvasError
    });

    if (canvasError) {
      return (
        <div className="canvas-error-display p-8">
          <h2 className="text-xl font-bold text-red-600 mb-4">Canvas Rendering Error</h2>
          <p className="text-gray-700 mb-4">{canvasError}</p>
          <button 
            onClick={() => setCanvasError(null)}
            className="px-4 py-2 bg-blue-500 text-white rounded"
          >
            Try Again
          </button>
          
          {/* Show raw data as fallback */}
          <div className="mt-8 p-4 bg-gray-100 rounded">
            <h3 className="font-semibold mb-2">Raw Data (for debugging):</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <h4 className="font-medium">Images ({uploadedImages?.length || 0})</h4>
                {uploadedImages?.slice(0, 3).map(img => (
                  <div key={img.id}>{img.name}</div>
                ))}
              </div>
              <div>
                <h4 className="font-medium">Analyses ({analyses?.length || 0})</h4>
                {analyses?.slice(0, 3).map(analysis => (
                  <div key={analysis.id}>{analysis.id.substring(0, 8)}...</div>
                ))}
              </div>
            </div>
          </div>
        </div>
      );
    }

    // For now, return simple debug view instead of CanvasView
    return (
      <div className="canvas-container p-8">
        <h1 className="text-2xl font-bold mb-4">Canvas - Debug Mode</h1>
        <div className="grid grid-cols-2 gap-4">
          <div className="border p-4 rounded">
            <h2 className="text-lg font-semibold mb-2">Images ({uploadedImages?.length || 0})</h2>
            {uploadedImages?.map(img => (
              <div key={img.id} className="text-sm">{img.name}</div>
            ))}
          </div>
          <div className="border p-4 rounded">
            <h2 className="text-lg font-semibold mb-2">Analyses ({analyses?.length || 0})</h2>
            {analyses?.map(analysis => (
              <div key={analysis.id} className="text-sm">{analysis.id}</div>
            ))}
          </div>
          <div className="border p-4 rounded">
            <h2 className="text-lg font-semibold mb-2">Groups ({imageGroups?.length || 0})</h2>
            {imageGroups?.map(group => (
              <div key={group.id} className="text-sm">{group.name}</div>
            ))}
          </div>
          <div className="border p-4 rounded">
            <h2 className="text-lg font-semibold mb-2">Group Analyses ({groupAnalysesWithPrompts?.length || 0})</h2>
            {groupAnalysesWithPrompts?.map(ga => (
              <div key={ga.id} className="text-sm">{ga.prompt}</div>
            ))}
          </div>
        </div>
      </div>
    );

  } catch (error: any) {
    console.error('Canvas rendering error:', error);
    setCanvasError(`Canvas failed to render: ${error.message}`);
    return null;
  }
};

export default Canvas;