/**
 * Diagnostic component to identify which components are looping
 * Add this to your App.tsx temporarily
 */

import React, { useEffect, useRef } from 'react';

// Global render tracker
const globalRenderCounts = new Map<string, number>();
const globalRenderTimes = new Map<string, number[]>();

export const RenderDiagnostic: React.FC = () => {
  const intervalRef = useRef<NodeJS.Timeout>();
  
  useEffect(() => {
    // Report every 2 seconds
    intervalRef.current = setInterval(() => {
      const problematicComponents: string[] = [];
      
      globalRenderCounts.forEach((count, component) => {
        if (count > 10) {
          problematicComponents.push(`${component}: ${count} renders`);
        }
      });
      
      if (problematicComponents.length > 0) {
        console.error('🚨 EXCESSIVE RENDERS DETECTED:', problematicComponents);
        
        // Show details for worst offenders
        const sorted = Array.from(globalRenderCounts.entries())
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5);
        
        sorted.forEach(([component, count]) => {
          const times = globalRenderTimes.get(component) || [];
          const avgTime = times.length > 0 
            ? times.reduce((a, b) => a + b, 0) / times.length 
            : 0;
          
          console.warn(`📊 ${component}:`, {
            renders: count,
            avgRenderTime: avgTime.toFixed(2) + 'ms',
            lastRender: new Date().toISOString()
          });
        });
      }
      
      // Reset counts
      globalRenderCounts.clear();
      globalRenderTimes.clear();
    }, 2000);
    
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);
  
  return (
    <div style={{
      position: 'fixed',
      top: 0,
      right: 0,
      background: 'red',
      color: 'white',
      padding: '10px',
      zIndex: 9999,
      fontSize: '12px',
      fontFamily: 'monospace'
    }}>
      🔍 Render Diagnostic Active
    </div>
  );
};

// Hook to use in components
export const useRenderDiagnostic = (componentName: string) => {
  const renderStartRef = useRef(performance.now());
  
  useEffect(() => {
    const renderTime = performance.now() - renderStartRef.current;
    
    // Update global counts
    globalRenderCounts.set(
      componentName, 
      (globalRenderCounts.get(componentName) || 0) + 1
    );
    
    // Track render times
    const times = globalRenderTimes.get(componentName) || [];
    times.push(renderTime);
    if (times.length > 10) times.shift(); // Keep last 10
    globalRenderTimes.set(componentName, times);
    
    renderStartRef.current = performance.now();
  });
};

// Add to your App.tsx:
// import { RenderDiagnostic } from './RenderDiagnostic';
// 
// function App() {
//   return (
//     <>
//       <RenderDiagnostic />
//       {/* Your existing app content */}
//     </>
//   );
// }