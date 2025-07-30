/**
 * Performance Testing Suite - Phase 5.2: Load Testing
 * Tests with 100+ images to verify performance and stress test state updates
 */

import React, { useState, useEffect, useCallback, memo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Play, 
  Pause, 
  Square, 
  BarChart3, 
  Users, 
  Clock, 
  Zap,
  AlertTriangle,
  CheckCircle,
  XCircle
} from 'lucide-react';
import { useAppState } from '@/hooks/useAppState';
import { useAppHelpers } from '@/context/SimplifiedAppContext';
import { useStateStabilityMonitor } from '@/hooks/useStateStabilityMonitor';
import { useRerenderCounter, useComponentPerformanceMonitor } from '@/hooks/useRerenderDetection';

interface TestScenario {
  id: string;
  name: string;
  description: string;
  imageCount: number;
  concurrent: boolean;
  stressLevel: 'low' | 'medium' | 'high';
}

interface TestResult {
  scenarioId: string;
  startTime: number;
  endTime: number;
  duration: number;
  imageCount: number;
  success: boolean;
  metrics: {
    renderCount: number;
    avgRenderTime: number;
    stateChanges: number;
    memoryUsage: number;
    suspiciousPatterns: string[];
  };
  errors: string[];
}

const TEST_SCENARIOS: TestScenario[] = [
  {
    id: 'light-load',
    name: 'Light Load Test',
    description: 'Test with 25 images to establish baseline performance',
    imageCount: 25,
    concurrent: false,
    stressLevel: 'low'
  },
  {
    id: 'medium-load',
    name: 'Medium Load Test',
    description: 'Test with 100 images for realistic usage simulation',
    imageCount: 100,
    concurrent: false,
    stressLevel: 'medium'
  },
  {
    id: 'heavy-load',
    name: 'Heavy Load Test',
    description: 'Test with 300 images to verify performance limits',
    imageCount: 300,
    concurrent: false,
    stressLevel: 'high'
  },
  {
    id: 'concurrent-stress',
    name: 'Concurrent Stress Test',
    description: 'Rapid state updates with 100 images to test race conditions',
    imageCount: 100,
    concurrent: true,
    stressLevel: 'high'
  }
];

export const PerformanceTestingSuite = memo(() => {
  const [isRunning, setIsRunning] = useState(false);
  const [currentScenario, setCurrentScenario] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [currentTest, setCurrentTest] = useState<TestResult | null>(null);

  const state = useAppState();
  const { uploadImages, resetAll } = useAppHelpers();
  const { getMetrics, getHistory, reset: resetStabilityMonitor } = useStateStabilityMonitor(state);
  
  const renderCount = useRerenderCounter('PerformanceTestingSuite', 20);
  const { avgRenderTime } = useComponentPerformanceMonitor('PerformanceTestingSuite');

  const generateTestImage = useCallback((index: number): File => {
    // Create a simple colored canvas as test image
    const canvas = document.createElement('canvas');
    canvas.width = 400;
    canvas.height = 300;
    const ctx = canvas.getContext('2d')!;
    
    // Generate a random color
    const hue = (index * 137.5) % 360; // Golden angle for color distribution
    ctx.fillStyle = `hsl(${hue}, 70%, 50%)`;
    ctx.fillRect(0, 0, 400, 300);
    
    // Add some text
    ctx.fillStyle = 'white';
    ctx.font = '20px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(`Test Image ${index + 1}`, 200, 150);
    
    return new Promise<File>((resolve) => {
      canvas.toBlob((blob) => {
        if (blob) {
          const file = new File([blob], `test-image-${index + 1}.png`, { type: 'image/png' });
          resolve(file);
        }
      }, 'image/png');
    }) as any; // Type assertion for simplicity
  }, []);

  const runScenario = useCallback(async (scenario: TestScenario) => {
    setIsRunning(true);
    setCurrentScenario(scenario.id);
    setProgress(0);
    resetStabilityMonitor();

    const startTime = Date.now();
    const startMemory = (performance as any).memory?.usedJSHeapSize || 0;

    const testResult: TestResult = {
      scenarioId: scenario.id,
      startTime,
      endTime: 0,
      duration: 0,
      imageCount: scenario.imageCount,
      success: false,
      metrics: {
        renderCount: 0,
        avgRenderTime: 0,
        stateChanges: 0,
        memoryUsage: 0,
        suspiciousPatterns: []
      },
      errors: []
    };

    setCurrentTest(testResult);

    try {
      // Clear existing state
      resetAll();
      await new Promise(resolve => setTimeout(resolve, 100));

      // Generate test images
      const testImages: File[] = [];
      for (let i = 0; i < scenario.imageCount; i++) {
        const image = generateTestImage(i);
        testImages.push(image);
        setProgress(Math.round((i / scenario.imageCount) * 50)); // First 50% for generation
      }

      // Upload images
      if (scenario.concurrent) {
        // Stress test: Upload in batches to simulate concurrent usage
        const batchSize = 10;
        for (let i = 0; i < testImages.length; i += batchSize) {
          const batch = testImages.slice(i, i + batchSize);
          await Promise.all(batch.map(() => uploadImages(batch)));
          setProgress(50 + Math.round(((i + batchSize) / scenario.imageCount) * 50));
          
          // Small delay to allow state updates
          await new Promise(resolve => setTimeout(resolve, 10));
        }
      } else {
        // Normal upload
        await uploadImages(testImages);
        setProgress(100);
      }

      // Wait for all updates to complete
      await new Promise(resolve => setTimeout(resolve, 500));

      const endTime = Date.now();
      const endMemory = (performance as any).memory?.usedJSHeapSize || 0;
      const metrics = getMetrics();

      testResult.endTime = endTime;
      testResult.duration = endTime - startTime;
      testResult.success = state.uploadedImages.length === scenario.imageCount;
      testResult.metrics = {
        renderCount,
        avgRenderTime,
        stateChanges: metrics.totalStateChanges,
        memoryUsage: endMemory - startMemory,
        suspiciousPatterns: metrics.suspiciousPatterns
      };

      // Check for performance issues
      if (testResult.duration > 10000) { // More than 10 seconds
        testResult.errors.push('Test duration exceeded 10 seconds');
      }
      
      if (metrics.suspiciousPatterns.length > 0) {
        testResult.errors.push(`Stability issues: ${metrics.suspiciousPatterns.join(', ')}`);
      }
      
      if (testResult.metrics.memoryUsage > 50 * 1024 * 1024) { // More than 50MB
        testResult.errors.push('Excessive memory usage detected');
      }

    } catch (error) {
      testResult.errors.push(`Test failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    setTestResults(prev => [...prev, testResult]);
    setCurrentTest(null);
    setIsRunning(false);
    setCurrentScenario(null);
    setProgress(0);
  }, [state.uploadedImages.length, uploadImages, resetAll, getMetrics, renderCount, avgRenderTime, resetStabilityMonitor]);

  const stopTest = useCallback(() => {
    setIsRunning(false);
    setCurrentScenario(null);
    setProgress(0);
    setCurrentTest(null);
  }, []);

  const clearResults = useCallback(() => {
    setTestResults([]);
    resetAll();
  }, [resetAll]);

  const getScenarioIcon = (stressLevel: TestScenario['stressLevel']) => {
    switch (stressLevel) {
      case 'low': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'medium': return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'high': return <AlertTriangle className="h-4 w-4 text-red-500" />;
    }
  };

  const getResultStatus = (result: TestResult) => {
    if (!result.success) return 'failed';
    if (result.errors.length > 0) return 'warning';
    return 'success';
  };

  const formatMemory = (bytes: number) => {
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(1)}MB`;
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Performance Testing Suite
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="text-center p-4 bg-muted rounded-lg">
              <div className="text-2xl font-bold">{state.uploadedImages.length}</div>
              <div className="text-sm text-muted-foreground">Current Images</div>
            </div>
            <div className="text-center p-4 bg-muted rounded-lg">
              <div className="text-2xl font-bold">{testResults.length}</div>
              <div className="text-sm text-muted-foreground">Tests Run</div>
            </div>
            <div className="text-center p-4 bg-muted rounded-lg">
              <div className="text-2xl font-bold">{renderCount}</div>
              <div className="text-sm text-muted-foreground">Component Renders</div>
            </div>
            <div className="text-center p-4 bg-muted rounded-lg">
              <div className="text-2xl font-bold">{avgRenderTime.toFixed(1)}ms</div>
              <div className="text-sm text-muted-foreground">Avg Render Time</div>
            </div>
          </div>

          {isRunning && (
            <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium">
                  Running: {TEST_SCENARIOS.find(s => s.id === currentScenario)?.name}
                </span>
                <Button size="sm" variant="outline" onClick={stopTest}>
                  <Square className="h-4 w-4 mr-1" />
                  Stop
                </Button>
              </div>
              <Progress value={progress} className="mb-2" />
              <div className="text-sm text-muted-foreground">
                {progress}% complete
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Tabs defaultValue="scenarios" className="space-y-4">
        <TabsList>
          <TabsTrigger value="scenarios">Test Scenarios</TabsTrigger>
          <TabsTrigger value="results">Test Results</TabsTrigger>
          <TabsTrigger value="metrics">Live Metrics</TabsTrigger>
        </TabsList>

        <TabsContent value="scenarios" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {TEST_SCENARIOS.map((scenario) => (
              <Card key={scenario.id}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      {getScenarioIcon(scenario.stressLevel)}
                      <h3 className="font-medium">{scenario.name}</h3>
                    </div>
                    <Badge variant="outline">
                      {scenario.imageCount} images
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mb-4">
                    {scenario.description}
                  </p>
                  <Button
                    onClick={() => runScenario(scenario)}
                    disabled={isRunning}
                    className="w-full"
                  >
                    <Play className="h-4 w-4 mr-2" />
                    Run Test
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="results" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-medium">Test Results</h3>
            <Button variant="outline" onClick={clearResults}>
              Clear Results
            </Button>
          </div>
          
          {testResults.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No test results yet. Run a test scenario to see results here.
            </div>
          ) : (
            <div className="space-y-4">
              {testResults.map((result, index) => {
                const scenario = TEST_SCENARIOS.find(s => s.id === result.scenarioId);
                const status = getResultStatus(result);
                
                return (
                  <Card key={index}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          {status === 'success' && <CheckCircle className="h-4 w-4 text-green-500" />}
                          {status === 'warning' && <AlertTriangle className="h-4 w-4 text-yellow-500" />}
                          {status === 'failed' && <XCircle className="h-4 w-4 text-red-500" />}
                          <h4 className="font-medium">{scenario?.name}</h4>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {new Date(result.startTime).toLocaleTimeString()}
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <span className="text-muted-foreground">Duration:</span>
                          <div className="font-medium">{(result.duration / 1000).toFixed(2)}s</div>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Memory:</span>
                          <div className="font-medium">{formatMemory(result.metrics.memoryUsage)}</div>
                        </div>
                        <div>
                          <span className="text-muted-foreground">State Changes:</span>
                          <div className="font-medium">{result.metrics.stateChanges}</div>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Renders:</span>
                          <div className="font-medium">{result.metrics.renderCount}</div>
                        </div>
                      </div>
                      
                      {result.errors.length > 0 && (
                        <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded text-sm">
                          <strong>Issues:</strong>
                          <ul className="mt-1 space-y-1">
                            {result.errors.map((error, i) => (
                              <li key={i} className="flex items-start gap-1">
                                <span className="text-red-500">•</span>
                                {error}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="metrics" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">State Stability</CardTitle>
              </CardHeader>
              <CardContent>
                {(() => {
                  const metrics = getMetrics();
                  return (
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span>Total Changes:</span>
                        <span className="font-medium">{metrics.totalStateChanges}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Change Frequency:</span>
                        <span className="font-medium">{metrics.changeFrequency}/min</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Suspicious Patterns:</span>
                        <span className={`font-medium ${metrics.suspiciousPatterns.length > 0 ? 'text-red-500' : 'text-green-500'}`}>
                          {metrics.suspiciousPatterns.length}
                        </span>
                      </div>
                      {metrics.suspiciousPatterns.length > 0 && (
                        <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-sm">
                          <ul className="space-y-1">
                            {metrics.suspiciousPatterns.map((pattern, i) => (
                              <li key={i}>• {pattern}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  );
                })()}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Memory Usage</CardTitle>
              </CardHeader>
              <CardContent>
                {(() => {
                  const memory = (performance as any).memory;
                  if (!memory) {
                    return <div className="text-sm text-muted-foreground">Memory monitoring not available</div>;
                  }
                  
                  return (
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span>Used:</span>
                        <span className="font-medium">{formatMemory(memory.usedJSHeapSize)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Total:</span>
                        <span className="font-medium">{formatMemory(memory.totalJSHeapSize)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Limit:</span>
                        <span className="font-medium">{formatMemory(memory.jsHeapSizeLimit)}</span>
                      </div>
                      <Progress 
                        value={(memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100} 
                        className="mt-2"
                      />
                    </div>
                  );
                })()}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
});

PerformanceTestingSuite.displayName = 'PerformanceTestingSuite';