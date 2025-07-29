/**
 * Performance Testing Dashboard - Phase 5: Testing & Validation
 * Comprehensive testing interface for state stability and performance validation
 */

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  TestTube, 
  Activity, 
  MemoryStick, 
  Timer, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  Play,
  Square,
  Trash2
} from 'lucide-react';
import { useStateStabilityTest, useLoadTestBenchmark } from '@/hooks/useStateStabilityTest';
import { usePerformanceStressTest } from '@/hooks/usePerformanceStressTest';
import { useWhyDidYouUpdateWithMetrics } from '@/hooks/useWhyDidYouUpdate';

const PerformanceTestingDashboard: React.FC = () => {
  const [isTestingMode, setIsTestingMode] = useState(false);
  const stabilityMetrics = useStateStabilityTest('TestingDashboard');
  const { benchmark, startBenchmark } = useLoadTestBenchmark();
  const { runStressTest, clearTestData, isRunning, results } = usePerformanceStressTest();
  const renderMetrics = useWhyDidYouUpdateWithMetrics('PerformanceTestingDashboard', {
    isTestingMode,
    stabilityMetrics,
    benchmark,
    results
  });

  const handleRunStressTest = async () => {
    const benchmarkInstance = startBenchmark('stress-test');
    await runStressTest(100);
    benchmarkInstance.end();
  };

  const getStatusBadge = (passed: boolean | null, loading?: boolean) => {
    if (loading) return <Badge variant="outline">Running...</Badge>;
    if (passed === null) return <Badge variant="secondary">Not Run</Badge>;
    if (passed) return <Badge variant="default" className="bg-green-500">✅ Passed</Badge>;
    return <Badge variant="destructive">❌ Failed</Badge>;
  };

  const successMetrics = {
    renderCount: stabilityMetrics.renderCount < 10,
    memoryStable: stabilityMetrics.memoryUsage < 100 * 1024 * 1024,
    dashboardLoad: benchmark.dashboardLoadTime < 2000,
    overallStable: stabilityMetrics.isStable && stabilityMetrics.errors.length === 0
  };

  const overallScore = Object.values(successMetrics).filter(Boolean).length;
  const totalMetrics = Object.keys(successMetrics).length;

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Performance Testing Dashboard</h1>
          <p className="text-muted-foreground">Phase 5: Validation of state management fixes</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant={isTestingMode ? "destructive" : "default"}
            onClick={() => setIsTestingMode(!isTestingMode)}
          >
            {isTestingMode ? <Square className="h-4 w-4 mr-2" /> : <Play className="h-4 w-4 mr-2" />}
            {isTestingMode ? 'Stop Testing' : 'Start Testing'}
          </Button>
          <Button variant="outline" onClick={clearTestData}>
            <Trash2 className="h-4 w-4 mr-2" />
            Clear Data
          </Button>
        </div>
      </div>

      {/* Overall Health Score */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Overall Health Score
          </CardTitle>
          <CardDescription>
            Success metrics from the 100% Guaranteed Fix Plan
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-lg font-medium">Health Score</span>
              <Badge variant={overallScore === totalMetrics ? "default" : overallScore > totalMetrics / 2 ? "secondary" : "destructive"}>
                {overallScore}/{totalMetrics}
              </Badge>
            </div>
            <Progress value={(overallScore / totalMetrics) * 100} className="h-2" />
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="flex items-center justify-between">
                <span>Render Count {'<'} 10</span>
                {getStatusBadge(successMetrics.renderCount)}
              </div>
              <div className="flex items-center justify-between">
                <span>Memory Stable</span>
                {getStatusBadge(successMetrics.memoryStable)}
              </div>
              <div className="flex items-center justify-between">
                <span>Dashboard {'<'} 2s</span>
                {getStatusBadge(successMetrics.dashboardLoad)}
              </div>
              <div className="flex items-center justify-between">
                <span>No Re-render Loops</span>
                {getStatusBadge(successMetrics.overallStable)}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="stability" className="space-y-4">
        <TabsList>
          <TabsTrigger value="stability">Stability Metrics</TabsTrigger>
          <TabsTrigger value="performance">Performance Tests</TabsTrigger>
          <TabsTrigger value="stress">Stress Testing</TabsTrigger>
          <TabsTrigger value="render">Render Analysis</TabsTrigger>
        </TabsList>

        <TabsContent value="stability" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Activity className="h-4 w-4" />
                  Render Count
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stabilityMetrics.renderCount}</div>
                <p className="text-xs text-muted-foreground">Target: {'<'} 10 per action</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <MemoryStick className="h-4 w-4" />
                  Memory Usage
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {Math.round(stabilityMetrics.memoryUsage / 1024 / 1024)}MB
                </div>
                <p className="text-xs text-muted-foreground">Current heap size</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Timer className="h-4 w-4" />
                  State Changes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stabilityMetrics.stateChanges}</div>
                <p className="text-xs text-muted-foreground">Since component mount</p>
              </CardContent>
            </Card>
          </div>

          {stabilityMetrics.warnings.length > 0 && (
            <Card className="border-yellow-200">
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2 text-yellow-600">
                  <AlertTriangle className="h-4 w-4" />
                  Warnings
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="text-sm space-y-1">
                  {stabilityMetrics.warnings.map((warning, i) => (
                    <li key={i} className="text-yellow-600">• {warning}</li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {stabilityMetrics.errors.length > 0 && (
            <Card className="border-red-200">
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2 text-red-600">
                  <XCircle className="h-4 w-4" />
                  Errors
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="text-sm space-y-1">
                  {stabilityMetrics.errors.map((error, i) => (
                    <li key={i} className="text-red-600">• {error}</li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="performance" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Dashboard Load</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {benchmark.dashboardLoadTime > 0 ? `${benchmark.dashboardLoadTime.toFixed(0)}ms` : 'N/A'}
                </div>
                <p className="text-xs text-muted-foreground">Target: {'<'} 2000ms</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Upload Performance</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {benchmark.imageUploadTime > 0 ? `${benchmark.imageUploadTime.toFixed(0)}ms` : 'N/A'}
                </div>
                <p className="text-xs text-muted-foreground">Per image upload</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Memory Peak</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {Math.round(benchmark.memoryPeak / 1024 / 1024)}MB
                </div>
                <p className="text-xs text-muted-foreground">Peak usage</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="stress" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TestTube className="h-5 w-5" />
                Stress Test (100+ Images)
              </CardTitle>
              <CardDescription>
                Phase 5.2: Load testing to validate memory usage and performance
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button 
                onClick={handleRunStressTest}
                disabled={isRunning}
                className="w-full"
              >
                {isRunning ? 'Running Stress Test...' : 'Run Stress Test'}
              </Button>

              {results && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">Test Result:</span>
                    {getStatusBadge(results.passed)}
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>Images Processed: {results.totalImages}</div>
                    <div>Analyses Generated: {results.totalAnalyses}</div>
                    <div>Upload Time: {results.uploadDuration.toFixed(0)}ms</div>
                    <div>Analysis Time: {results.analysisDuration.toFixed(0)}ms</div>
                    <div>Memory Delta: {Math.round(results.memoryUsage / 1024)}KB</div>
                    <div>Render Count: {results.renderCount}</div>
                  </div>

                  {results.errors.length > 0 && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                      <div className="font-medium text-red-600 mb-2">Errors:</div>
                      <ul className="text-sm text-red-600 space-y-1">
                        {results.errors.slice(0, 5).map((error, i) => (
                          <li key={i}>• {error}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="render" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Render Analysis
              </CardTitle>
              <CardDescription>
                Real-time render monitoring and why-did-you-update analysis
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm font-medium">Current Renders</div>
                  <div className="text-2xl font-bold">{renderMetrics.renderCount}</div>
                </div>
                <div>
                  <div className="text-sm font-medium">Avg Render Time</div>
                  <div className="text-2xl font-bold">{renderMetrics.avgRenderTime.toFixed(1)}ms</div>
                </div>
              </div>
              
              <div className="text-sm text-muted-foreground">
                Open browser console to see detailed render analysis and prop change tracking.
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default React.memo(PerformanceTestingDashboard);