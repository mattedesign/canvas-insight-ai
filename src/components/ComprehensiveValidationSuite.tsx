import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertCircle, CheckCircle, Clock, Play, RotateCcw } from 'lucide-react';
import ApplicationTestRunner, { ApplicationTestResults, TestResult } from '@/services/ApplicationTestRunner';

interface ComprehensiveValidationSuiteProps {
  className?: string;
}

const ComprehensiveValidationSuite: React.FC<ComprehensiveValidationSuiteProps> = ({ className }) => {
  const [results, setResults] = useState<ApplicationTestResults | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentPhase, setCurrentPhase] = useState('');

  const testRunner = React.useMemo(() => new ApplicationTestRunner(), []);

  const runComprehensiveTests = useCallback(async () => {
    if (isRunning) return;

    setIsRunning(true);
    setProgress(0);
    setCurrentPhase('Initializing comprehensive validation...');

    try {
      // Simulate progress updates for better UX
      const phases = [
        'Running system integration tests...',
        'Validating data integrity...',
        'Checking performance benchmarks...',
        'Testing error recovery scenarios...',
        'Calculating overall health score...'
      ];

      for (let i = 0; i < phases.length; i++) {
        setCurrentPhase(phases[i]);
        setProgress(((i + 1) / phases.length) * 100);
        await new Promise(resolve => setTimeout(resolve, 800));
      }

      const testResults = await testRunner.runComprehensiveTests();
      setResults(testResults);
      setCurrentPhase('Validation completed');
      
      console.log('🧪 Comprehensive Validation Results:', testResults);
    } catch (error) {
      console.error('Failed to run comprehensive validation:', error);
      setCurrentPhase('Validation failed');
    } finally {
      setIsRunning(false);
      setProgress(100);
    }
  }, [isRunning, testRunner]);

  const resetTests = useCallback(() => {
    setResults(null);
    setProgress(0);
    setCurrentPhase('');
  }, []);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'passing':
      case 'healthy':
        return <CheckCircle className="h-4 w-4 text-success" />;
      case 'warning':
      case 'degraded':
        return <AlertCircle className="h-4 w-4 text-warning" />;
      case 'failing':
      case 'critical':
        return <AlertCircle className="h-4 w-4 text-destructive" />;
      case 'running':
        return <Clock className="h-4 w-4 text-muted-foreground animate-spin" />;
      default:
        return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'passing':
      case 'healthy':
        return 'bg-success/10 text-success border-success/20';
      case 'warning':
      case 'degraded':
        return 'bg-warning/10 text-warning border-warning/20';
      case 'failing':
      case 'critical':
        return 'bg-destructive/10 text-destructive border-destructive/20';
      default:
        return 'bg-muted/10 text-muted-foreground border-muted/20';
    }
  };

  const renderTestResults = (tests: TestResult[], title: string) => (
    <div className="space-y-2">
      <h4 className="font-medium text-sm text-foreground/80">{title}</h4>
      {tests.map((test, index) => (
        <div key={index} className="flex items-center justify-between p-3 bg-card border rounded-lg">
          <div className="flex items-center gap-2">
            {getStatusIcon(test.status)}
            <span className="text-sm font-medium">{test.testName}</span>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className={getStatusColor(test.status)}>
              {test.status}
            </Badge>
            {test.duration && (
              <span className="text-xs text-muted-foreground">
                {Math.round(test.duration)}ms
              </span>
            )}
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <div className={`space-y-6 ${className}`}>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5" />
            Comprehensive Validation Suite
          </CardTitle>
          <CardDescription>
            Complete application health validation including system integration, data integrity, 
            performance benchmarks, and error recovery testing.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Button 
              onClick={runComprehensiveTests} 
              disabled={isRunning}
              className="flex items-center gap-2"
            >
              <Play className="h-4 w-4" />
              {isRunning ? 'Running Validation...' : 'Run Comprehensive Tests'}
            </Button>
            <Button 
              variant="outline" 
              onClick={resetTests}
              disabled={isRunning}
              className="flex items-center gap-2"
            >
              <RotateCcw className="h-4 w-4" />
              Reset
            </Button>
          </div>

          {isRunning && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{currentPhase}</span>
                <span className="font-medium">{Math.round(progress)}%</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>
          )}

          {results && (
            <div className="space-y-4">
              {/* Overall Status */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center justify-between">
                    <span>Overall System Health</span>
                    <Badge variant="outline" className={getStatusColor(results.overall.status)}>
                      {results.overall.status.toUpperCase()}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Health Score</span>
                      <span className="font-bold text-lg">{results.overall.score}%</span>
                    </div>
                    <Progress value={results.overall.score} className="h-2" />
                    <p className="text-sm text-muted-foreground">{results.overall.summary}</p>
                    
                    {results.overall.recommendations.length > 0 && (
                      <div className="space-y-2">
                        <h4 className="font-medium text-sm">Recommendations:</h4>
                        <ul className="space-y-1">
                          {results.overall.recommendations.map((rec, index) => (
                            <li key={index} className="text-sm text-muted-foreground flex items-center gap-2">
                              <div className="w-1 h-1 bg-primary rounded-full" />
                              {rec}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Detailed Results */}
              <Tabs defaultValue="system" className="w-full">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="system">System Integration</TabsTrigger>
                  <TabsTrigger value="data">Data Integrity</TabsTrigger>
                  <TabsTrigger value="performance">Performance</TabsTrigger>
                  <TabsTrigger value="recovery">Error Recovery</TabsTrigger>
                </TabsList>

                <TabsContent value="system" className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center justify-between text-base">
                        System Integration Tests
                        <Badge variant="outline" className={getStatusColor(results.systemIntegration.overall.status)}>
                          {results.systemIntegration.overall.score}%
                        </Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {renderTestResults(results.systemIntegration.errorBoundaries, 'Error Boundaries')}
                      {renderTestResults(results.systemIntegration.stateManagement, 'State Management')}
                      {renderTestResults(results.systemIntegration.routing, 'Routing System')}
                      {renderTestResults(results.systemIntegration.performance, 'Performance')}
                      {renderTestResults(results.systemIntegration.integration, 'Integration')}
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="data" className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center justify-between text-base">
                        Data Integrity Validation
                        <Badge variant="outline" className={getStatusColor(results.dataIntegrity.overall.status)}>
                          {results.dataIntegrity.overall.score}%
                        </Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {renderTestResults(results.dataIntegrity.crossSystemValidation, 'Cross-System Validation')}
                      {renderTestResults(results.dataIntegrity.storageIntegrity, 'Storage Integrity')}
                      {renderTestResults(results.dataIntegrity.stateConsistency, 'State Consistency')}
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="performance" className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center justify-between text-base">
                        Performance Benchmarks
                        <Badge variant="outline" className={getStatusColor(results.performanceBenchmarks.overall.status)}>
                          {results.performanceBenchmarks.overall.score}%
                        </Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {renderTestResults(results.performanceBenchmarks.loadTime, 'Load Time')}
                      {renderTestResults(results.performanceBenchmarks.memoryUsage, 'Memory Usage')}
                      {renderTestResults(results.performanceBenchmarks.renderPerformance, 'Render Performance')}
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="recovery" className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center justify-between text-base">
                        Error Recovery Testing
                        <Badge variant="outline" className={getStatusColor(results.errorRecovery.overall.status)}>
                          {results.errorRecovery.overall.score}%
                        </Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {renderTestResults(results.errorRecovery.boundaryRecovery, 'Boundary Recovery')}
                      {renderTestResults(results.errorRecovery.stateRollback, 'State Rollback')}
                      {renderTestResults(results.errorRecovery.fallbackSystems, 'Fallback Systems')}
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ComprehensiveValidationSuite;