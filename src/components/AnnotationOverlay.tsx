import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { AnnotationPoint, Suggestion } from '@/types/ux-analysis';
import { AnnotationComment } from './AnnotationComment';

interface AnnotationState {
  annotation: AnnotationPoint;
  position: { x: number; y: number };
  relatedSuggestions: Suggestion[];
  onRequestAnalysis: (prompt: string) => void;
  onGenerateVariation: (prompt: string) => void;
}

interface AnnotationOverlayContextType {
  showAnnotation: (state: AnnotationState) => void;
  hideAnnotation: () => void;
  activeAnnotation: AnnotationState | null;
}

const AnnotationOverlayContext = createContext<AnnotationOverlayContextType | null>(null);

export const useAnnotationOverlay = () => {
  const context = useContext(AnnotationOverlayContext);
  if (!context) {
    throw new Error('useAnnotationOverlay must be used within an AnnotationOverlayProvider');
  }
  return context;
};

interface AnnotationOverlayProviderProps {
  children: ReactNode;
}

export const AnnotationOverlayProvider: React.FC<AnnotationOverlayProviderProps> = ({ children }) => {
  const [activeAnnotation, setActiveAnnotation] = useState<AnnotationState | null>(null);

  const showAnnotation = useCallback((state: AnnotationState) => {
    setActiveAnnotation(state);
  }, []);

  const hideAnnotation = useCallback(() => {
    setActiveAnnotation(null);
  }, []);

  return (
    <AnnotationOverlayContext.Provider value={{ showAnnotation, hideAnnotation, activeAnnotation }}>
      {children}
      {/* Portal for rendering annotations at document body level */}
      {activeAnnotation && createPortal(
        <AnnotationComment
          annotation={activeAnnotation.annotation}
          position={activeAnnotation.position}
          onClose={hideAnnotation}
          onRequestAnalysis={activeAnnotation.onRequestAnalysis}
          onGenerateVariation={activeAnnotation.onGenerateVariation}
          relatedSuggestions={activeAnnotation.relatedSuggestions}
        />,
        document.body
      )}
    </AnnotationOverlayContext.Provider>
  );
};

// Helper hook for calculating global coordinates from ReactFlow nodes
export const useGlobalCoordinates = () => {
  const calculateGlobalPosition = useCallback((
    nodeElement: HTMLElement,
    localX: number,
    localY: number
  ): { x: number; y: number } => {
    const nodeRect = nodeElement.getBoundingClientRect();
    const scrollX = window.pageXOffset || document.documentElement.scrollLeft;
    const scrollY = window.pageYOffset || document.documentElement.scrollTop;
    
    return {
      x: nodeRect.left + localX + scrollX,
      y: nodeRect.top + localY + scrollY
    };
  }, []);

  return { calculateGlobalPosition };
};