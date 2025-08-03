import { useCallback, useRef } from 'react';

/**
 * Hook for debouncing functions to prevent excessive API calls
 */
export const useDebounce = () => {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const debounce = useCallback(<T extends (...args: any[]) => any>(
    func: T,
    delay: number
  ) => {
    return (...args: Parameters<T>) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      
      timeoutRef.current = setTimeout(() => {
        func(...args);
      }, delay);
    };
  }, []);

  const cancel = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
  }, []);

  return { debounce, cancel };
};