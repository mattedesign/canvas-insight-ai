/**
 * State Stability Testing Hook - Phase 5.1: Automated State Stability Tests
 * Validates that state management doesn't have memory leaks or infinite re-renders
 */

import { useEffect, useRef, useState } from 'react';
import { useAppContext } from '@/context/SimplifiedAppContext';

interface StabilityMetrics {
  renderCount: number;
  memoryUsage: number;
  stateChanges: number;
  lastRenderTime: number;
  isStable: boolean;
  warnings: string[];
  errors: string[];
}

export const useStateStabilityTest = (componentName: string) => {
  const { state } = useAppContext();
  const [metrics, setMetrics] = useState<StabilityMetrics>({
    renderCount: 0,
    memoryUsage: 0,
    stateChanges: 0,
    lastRenderTime: Date.now(),
    isStable: true,
    warnings: [],
    errors: []
  });

  const renderCountRef = useRef(0);
  const lastStateRef = useRef(state);
  const stateChangeCountRef = useRef(0);
  const warningsRef = useRef<string[]>([]);
  const errorsRef = useRef<string[]>([]);

  useEffect(() => {
    renderCountRef.current += 1;
    const now = Date.now();
    
    // Check for state changes
    if (lastStateRef.current !== state) {
      stateChangeCountRef.current += 1;
      lastStateRef.current = state;
    }

    // Get memory usage if available
    const memoryUsage = (performance as any).memory?.usedJSHeapSize || 0;

    // Detect potential issues
    const newWarnings: string[] = [];
    const newErrors: string[] = [];

    // Check for excessive re-renders (Phase 5 success metric: < 10 per user action)
    if (renderCountRef.current > 10 && renderCountRef.current % 5 === 0) {
      newWarnings.push(`High render count: ${renderCountRef.current}`);
    }

    if (renderCountRef.current > 50) {
      newErrors.push(`CRITICAL: Excessive renders (${renderCountRef.current})`);
    }

    // Check render frequency
    const timeSinceLastRender = now - metrics.lastRenderTime;
    if (timeSinceLastRender < 16 && renderCountRef.current > 5) {
      newWarnings.push(`Rapid re-renders: ${timeSinceLastRender}ms interval`);
    }

    // Memory leak detection (basic)
    if (memoryUsage > 0 && memoryUsage > metrics.memoryUsage * 1.5 && renderCountRef.current > 10) {
      newWarnings.push(`Memory usage spike: ${Math.round(memoryUsage / 1024 / 1024)}MB`);
    }

    warningsRef.current = [...warningsRef.current, ...newWarnings].slice(-10);
    errorsRef.current = [...errorsRef.current, ...newErrors].slice(-10);

    const isStable = errorsRef.current.length === 0 && renderCountRef.current < 20;

    setMetrics({
      renderCount: renderCountRef.current,
      memoryUsage,
      stateChanges: stateChangeCountRef.current,
      lastRenderTime: now,
      isStable,
      warnings: warningsRef.current,
      errors: errorsRef.current
    });

    // Log warnings and errors
    if (newWarnings.length > 0) {
      console.warn(`[StateStability:${componentName}] Warnings:`, newWarnings);
    }
    if (newErrors.length > 0) {
      console.error(`[StateStability:${componentName}] ERRORS:`, newErrors);
    }

    // Log stability summary every 10 renders
    if (renderCountRef.current % 10 === 0) {
      console.log(`[StateStability:${componentName}] Summary:`, {
        renders: renderCountRef.current,
        stateChanges: stateChangeCountRef.current,
        memoryMB: Math.round(memoryUsage / 1024 / 1024),
        stable: isStable
      });
    }
  });

  // Reset metrics on unmount
  useEffect(() => {
    return () => {
      console.log(`[StateStability:${componentName}] Component unmounted - Final metrics:`, {
        totalRenders: renderCountRef.current,
        totalStateChanges: stateChangeCountRef.current,
        finalMemoryMB: Math.round(metrics.memoryUsage / 1024 / 1024),
        wasStable: metrics.isStable
      });
    };
  }, [componentName, metrics.memoryUsage, metrics.isStable]);

  return metrics;
};

// Performance benchmark for load testing
export const useLoadTestBenchmark = () => {
  const [benchmark, setBenchmark] = useState({
    dashboardLoadTime: 0,
    imageUploadTime: 0,
    analysisTime: 0,
    memoryPeak: 0,
    isWithinTargets: false
  });

  const startBenchmark = (operation: string) => {
    const startTime = performance.now();
    const startMemory = (performance as any).memory?.usedJSHeapSize || 0;

    return {
      end: () => {
        const endTime = performance.now();
        const endMemory = (performance as any).memory?.usedJSHeapSize || 0;
        const duration = endTime - startTime;
        const memoryDelta = endMemory - startMemory;

        console.log(`[Benchmark:${operation}] Duration: ${duration.toFixed(2)}ms, Memory: +${Math.round(memoryDelta / 1024)}KB`);

        // Update benchmark based on operation
        setBenchmark(prev => {
          const updated = { ...prev };
          switch (operation) {
            case 'dashboard':
              updated.dashboardLoadTime = duration;
              break;
            case 'upload':
              updated.imageUploadTime = duration;
              break;
            case 'analysis':
              updated.analysisTime = duration;
              break;
          }
          updated.memoryPeak = Math.max(updated.memoryPeak, endMemory);
          
          // Check against success metrics
          updated.isWithinTargets = 
            updated.dashboardLoadTime < 2000 && // < 2 seconds
            updated.memoryPeak < 100 * 1024 * 1024; // < 100MB

          return updated;
        });

        return { duration, memoryDelta };
      }
    };
  };

  return { benchmark, startBenchmark };
};