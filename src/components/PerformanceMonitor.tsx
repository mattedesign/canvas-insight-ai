/**
 * Performance Monitor - Debug Re-render Issues
 * Use this component to identify excessive re-renders
 */

import { useRef, useEffect } from 'react';
import { useStableAppState } from '@/hooks/useStableAppState';

interface RenderInfo {
  component: string;
  timestamp: number;
  renderCount: number;
  stateVersion: number;
  stateSize: {
    images: number;
    analyses: number;
    groups: number;
  };
}

export const PerformanceMonitor: React.FC<{ componentName?: string }> = ({ 
  componentName = 'Unknown' 
}) => {
  const renderCountRef = useRef(0);
  const lastRenderRef = useRef(Date.now());
  const { state } = useStableAppState();
  
  // Track renders
  renderCountRef.current += 1;
  const now = Date.now();
  const timeSinceLastRender = now - lastRenderRef.current;
  lastRenderRef.current = now;
  
  const renderInfo: RenderInfo = {
    component: componentName,
    timestamp: now,
    renderCount: renderCountRef.current,
    stateVersion: state.version,
    stateSize: {
      images: state.uploadedImages.length,
      analyses: state.analyses.length,
      groups: state.imageGroups.length,
    }
  };
  
  useEffect(() => {
    // Log concerning re-render patterns
    if (renderCountRef.current > 10 && timeSinceLastRender < 100) {
      console.warn(`🚨 Potential re-render loop detected in ${componentName}:`, {
        renderCount: renderCountRef.current,
        timeBetweenRenders: timeSinceLastRender,
        stateVersion: state.version
      });
    }
    
    // Log excessive renders
    if (renderCountRef.current % 20 === 0) {
      console.info(`📊 Performance Monitor [${componentName}]:`, renderInfo);
    }
  }, [componentName, timeSinceLastRender, state.version, renderInfo]);
  
  // Development-only render counter
  if (process.env.NODE_ENV === 'development') {
    return (
      <div 
        style={{
          position: 'fixed',
          top: 10,
          right: 10,
          background: renderCountRef.current > 50 ? '#ff4444' : '#44ff44',
          color: 'white',
          padding: '4px 8px',
          borderRadius: '4px',
          fontSize: '12px',
          zIndex: 9999,
          fontFamily: 'monospace'
        }}
        title={`Component: ${componentName}\nState Version: ${state.version}\nLast Render Gap: ${timeSinceLastRender}ms`}
      >
        {componentName}: {renderCountRef.current}
      </div>
    );
  }
  
  return null;
};

// Hook for monitoring performance in any component
export const useRenderMonitor = (componentName: string) => {
  const renderCountRef = useRef(0);
  const mountTimeRef = useRef(Date.now());
  
  renderCountRef.current += 1;
  
  useEffect(() => {
    const timeSinceMount = Date.now() - mountTimeRef.current;
    
    if (renderCountRef.current > 100) {
      console.error(`💥 Excessive renders detected in ${componentName}: ${renderCountRef.current} renders in ${timeSinceMount}ms`);
    }
  });
  
  return {
    renderCount: renderCountRef.current,
    timeSinceMount: Date.now() - mountTimeRef.current
  };
};