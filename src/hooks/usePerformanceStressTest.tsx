/**
 * Performance Stress Test - Phase 5.2: Load Testing with 100+ images
 * Validates system performance under heavy load
 */

import { useState, useCallback } from 'react';
import { useAppContext } from '@/context/SimplifiedAppContext';
import { generateMockAnalysis } from '@/data/mockAnalysis';
import type { UploadedImage } from '@/context/AppStateTypes';

interface StressTestResults {
  totalImages: number;
  totalAnalyses: number;
  uploadDuration: number;
  analysisDuration: number;
  memoryUsage: number;
  renderCount: number;
  passed: boolean;
  errors: string[];
}

export const usePerformanceStressTest = () => {
  const { actions, state } = useAppContext();
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState<StressTestResults | null>(null);

  const generateMockImages = useCallback((count: number): File[] => {
    const mockImages: File[] = [];
    for (let i = 0; i < count; i++) {
      // Create mock file
      const canvas = document.createElement('canvas');
      canvas.width = 800;
      canvas.height = 600;
      const ctx = canvas.getContext('2d')!;
      
      // Draw a simple pattern
      ctx.fillStyle = `hsl(${(i * 137.5) % 360}, 70%, 50%)`;
      ctx.fillRect(0, 0, 800, 600);
      ctx.fillStyle = 'white';
      ctx.font = '48px Arial';
      ctx.fillText(`Test Image ${i + 1}`, 50, 300);

      canvas.toBlob((blob) => {
        if (blob) {
          const file = new File([blob], `test-image-${i + 1}.png`, { type: 'image/png' });
          mockImages.push(file);
        }
      }, 'image/png', 0.8);
    }
    return mockImages;
  }, []);

  const runStressTest = useCallback(async (imageCount: number = 100) => {
    setIsRunning(true);
    const startTime = performance.now();
    const startMemory = (performance as any).memory?.usedJSHeapSize || 0;
    const errors: string[] = [];
    let renderCount = 0;

    try {
      console.log(`[StressTest] Starting with ${imageCount} images...`);

      // Phase 1: Mass image upload
      const mockImages = generateMockImages(imageCount);
      const uploadStart = performance.now();
      
      // Upload in batches to avoid overwhelming the system
      const batchSize = 20;
      for (let i = 0; i < mockImages.length; i += batchSize) {
        const batch = mockImages.slice(i, i + batchSize);
        try {
          await stableHelpers.uploadImages(batch);
          renderCount++;
          
          // Small delay to prevent blocking the UI
          await new Promise(resolve => setTimeout(resolve, 10));
        } catch (error) {
          errors.push(`Upload batch ${i / batchSize + 1} failed: ${error}`);
        }
      }
      
      const uploadDuration = performance.now() - uploadStart;

      // Phase 2: Mass analysis generation
      const analysisStart = performance.now();
      const uploadedImages = state.uploadedImages;
      
      for (let i = 0; i < Math.min(uploadedImages.length, 50); i++) {
        try {
          // Simulate analysis generation
          await new Promise(resolve => setTimeout(resolve, 5));
          renderCount++;
        } catch (error) {
          errors.push(`Analysis ${i + 1} failed: ${error}`);
        }
      }
      
      const analysisDuration = performance.now() - analysisStart;

      // Phase 3: Memory and performance validation
      const endMemory = (performance as any).memory?.usedJSHeapSize || 0;
      const totalDuration = performance.now() - startTime;
      const memoryUsage = endMemory - startMemory;

      const results: StressTestResults = {
        totalImages: uploadedImages.length,
        totalAnalyses: state.analyses.length,
        uploadDuration,
        analysisDuration,
        memoryUsage,
        renderCount,
        passed: 
          totalDuration < 30000 && // Under 30 seconds
          memoryUsage < 50 * 1024 * 1024 && // Under 50MB increase
          renderCount < imageCount * 2 && // Reasonable render count
          errors.length < imageCount * 0.1, // Less than 10% error rate
        errors
      };

      console.log('[StressTest] Results:', results);
      setResults(results);

      // Validation against success metrics
      if (results.passed) {
        console.log('✅ [StressTest] PASSED - System performance is stable');
      } else {
        console.error('❌ [StressTest] FAILED - Performance issues detected');
      }

    } catch (error) {
      console.error('[StressTest] Critical failure:', error);
      setResults({
        totalImages: 0,
        totalAnalyses: 0,
        uploadDuration: 0,
        analysisDuration: 0,
        memoryUsage: 0,
        renderCount: 0,
        passed: false,
        errors: [`Critical failure: ${error}`]
      });
    } finally {
      setIsRunning(false);
    }
  }, [generateMockImages, stableHelpers, state.uploadedImages, state.analyses]);

  const clearTestData = useCallback(() => {
    stableHelpers.clearCanvas();
    setResults(null);
  }, [stableHelpers]);

  return {
    runStressTest,
    clearTestData,
    isRunning,
    results
  };
};