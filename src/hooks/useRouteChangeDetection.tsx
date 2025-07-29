import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';

export const useRouteChangeDetection = (componentName: string) => {
  const location = useLocation();
  const previousPathRef = useRef(location.pathname);
  
  useEffect(() => {
    if (previousPathRef.current !== location.pathname) {
      console.log(`[${componentName}] Route changed:`, {
        from: previousPathRef.current,
        to: location.pathname,
        timestamp: Date.now()
      });
      previousPathRef.current = location.pathname;
    }
  }, [location.pathname, componentName]);
  
  return {
    currentPath: location.pathname,
    previousPath: previousPathRef.current
  };
};