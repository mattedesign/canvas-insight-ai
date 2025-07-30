import { useRef, useEffect } from 'react';

export const useRenderMonitor = (componentName: string) => {
  const renderCount = useRef(0);
  const startTime = useRef(Date.now());
  
  renderCount.current += 1;
  
  useEffect(() => {
    if (renderCount.current > 5) {
      console.warn(`⚠️ ${componentName} rendered ${renderCount.current} times`);
    }
    
    if (renderCount.current === 1) {
      console.log(`✅ ${componentName} mounted`);
    }
  });
  
  return {
    renderCount: renderCount.current,
    timeSinceMount: Date.now() - startTime.current
  };
};