/**
 * Diagnostic component to identify which components are looping
 * Add this to your App.tsx temporarily
 */

import React, { useEffect, useRef } from 'react';

// Global render tracker
const globalRenderCounts = new Map<string, number>();
const globalRenderTimes = new Map<string, number[]>();

export const RenderDiagnostic: React.FC = () => {
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const [isExpanded, setIsExpanded] = React.useState(false);
  const [renderData, setRenderData] = React.useState<Array<{component: string, count: number, avgTime: number}>>([]);
  const [isActive, setIsActive] = React.useState(true);
  
  useEffect(() => {
    if (!isActive) return;
    
    // Report every 2 seconds
    intervalRef.current = setInterval(() => {
      const problematicComponents: string[] = [];
      const currentData: Array<{component: string, count: number, avgTime: number}> = [];
      
      globalRenderCounts.forEach((count, component) => {
        const times = globalRenderTimes.get(component) || [];
        const avgTime = times.length > 0 
          ? times.reduce((a, b) => a + b, 0) / times.length 
          : 0;
        
        currentData.push({ component, count, avgTime });
        
        if (count > 10) {
          problematicComponents.push(`${component}: ${count} renders`);
        }
      });
      
      // Sort by render count
      currentData.sort((a, b) => b.count - a.count);
      setRenderData(currentData);
      
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
  }, [isActive]);
  
  return (
    <div style={{
      position: 'fixed',
      top: 0,
      right: 0,
      background: isActive ? (renderData.some(d => d.count > 10) ? '#dc2626' : '#059669') : '#6b7280',
      color: 'white',
      padding: '8px 12px',
      zIndex: 9999,
      fontSize: '12px',
      fontFamily: 'monospace',
      cursor: 'pointer',
      borderBottomLeftRadius: '8px',
      minWidth: isExpanded ? '320px' : 'auto',
      maxHeight: isExpanded ? '400px' : 'auto',
      overflow: 'auto'
    }}
    onClick={() => setIsExpanded(!isExpanded)}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: isExpanded ? '8px' : '0' }}>
        <span>🔍 Render Diagnostic {isActive ? 'ON' : 'OFF'}</span>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button 
            onClick={(e) => { e.stopPropagation(); setIsActive(!isActive); }}
            style={{ background: 'transparent', border: '1px solid white', color: 'white', padding: '2px 6px', borderRadius: '4px', fontSize: '10px' }}
          >
            {isActive ? 'STOP' : 'START'}
          </button>
          <button 
            onClick={(e) => { e.stopPropagation(); setRenderData([]); globalRenderCounts.clear(); globalRenderTimes.clear(); }}
            style={{ background: 'transparent', border: '1px solid white', color: 'white', padding: '2px 6px', borderRadius: '4px', fontSize: '10px' }}
          >
            CLEAR
          </button>
        </div>
      </div>
      
      {isExpanded && (
        <div>
          <div style={{ marginBottom: '8px', fontSize: '11px', borderBottom: '1px solid rgba(255,255,255,0.3)', paddingBottom: '4px' }}>
            <strong>Component Render Stats (2s window)</strong>
          </div>
          {renderData.length === 0 ? (
            <div style={{ fontSize: '11px', opacity: 0.7 }}>No render data yet...</div>
          ) : (
            <div style={{ maxHeight: '300px', overflow: 'auto' }}>
              {renderData.slice(0, 10).map((item, index) => (
                <div key={item.component} style={{ 
                  fontSize: '10px', 
                  marginBottom: '4px', 
                  padding: '4px', 
                  background: item.count > 10 ? 'rgba(255,0,0,0.2)' : 'rgba(255,255,255,0.1)',
                  borderRadius: '3px',
                  border: item.count > 10 ? '1px solid #ff6b6b' : 'none'
                }}>
                  <div style={{ fontWeight: 'bold', color: item.count > 10 ? '#ffeb3b' : 'white' }}>
                    {item.component}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Renders: {item.count}</span>
                    <span>Avg: {item.avgTime.toFixed(1)}ms</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
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