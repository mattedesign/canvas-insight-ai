import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { 
  Play, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  TestTube,
  Target,
  Zap
} from 'lucide-react';
import { ContextDetectionService } from '@/services/ContextDetectionService';
import { ContextDetectionErrorBoundary } from './ContextDetectionErrorBoundary';

interface TestCase {
  name: string;
  imageUrl: string;
  userContext: string;
  expectedType: string;
  expectedDomain: string;
}

const testCases: TestCase[] = [
  {
    name: 'Financial Dashboard',
    imageUrl: '/public/lovable-uploads/9169f285-5771-4a3a-ad0e-60d3cf3eac07.png',
    userContext: 'I\'m a product manager looking to improve our financial dashboard',
    expectedType: 'dashboard',
    expectedDomain: 'finance'
  },
  {
    name: 'E-commerce Landing',
    imageUrl: '/public/lovable-uploads/c671a789-96c3-47ab-a04b-9f06ab4b4592.png',
    userContext: 'I\'m a designer analyzing conversion optimization for our store',
    expectedType: 'landing',
    expectedDomain: 'ecommerce'
  }
];

interface TestResult {
  testCase: string;
  status: 'pending' | 'running' | 'passed' | 'failed' | 'error';
  detectedType?: string;
  detectedDomain?: string;
  confidence?: number;
  duration?: number;
  error?: string;
}

export function ContextDetectionTestSuite() {
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [currentTest, setCurrentTest] = useState<number>(-1);
  const [customImageUrl, setCustomImageUrl] = useState('');
  const [customUserContext, setCustomUserContext] = useState('');
  const [isRunning, setIsRunning] = useState(false);

  const contextDetector = new ContextDetectionService();

  const runSingleTest = async (testCase: TestCase, index: number): Promise<TestResult> => {
    const startTime = Date.now();
    
    try {
      setCurrentTest(index);
      
      // Test image context detection
      const imageContext = await contextDetector.detectImageContext(testCase.imageUrl);
      
      // Test user context inference
      const userContext = contextDetector.inferUserContext(testCase.userContext);
      
      // Test analysis context creation
      const analysisContext = contextDetector.createAnalysisContext(imageContext, userContext);
      
      const duration = Date.now() - startTime;
      
      const passed = 
        imageContext.primaryType === testCase.expectedType &&
        imageContext.domain === testCase.expectedDomain;
      
      return {
        testCase: testCase.name,
        status: passed ? 'passed' : 'failed',
        detectedType: imageContext.primaryType,
        detectedDomain: imageContext.domain,
        confidence: analysisContext.confidence,
        duration
      };
      
    } catch (error) {
      return {
        testCase: testCase.name,
        status: 'error',
        duration: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  };

  const runAllTests = async () => {
    setIsRunning(true);
    setTestResults([]);
    setCurrentTest(-1);
    
    try {
      const results: TestResult[] = [];
      
      for (let i = 0; i < testCases.length; i++) {
        const result = await runSingleTest(testCases[i], i);
        results.push(result);
        setTestResults([...results]);
        
        // Small delay between tests
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      
    } catch (error) {
      console.error('Test suite failed:', error);
    } finally {
      setIsRunning(false);
      setCurrentTest(-1);
    }
  };

  const testCustomInput = async () => {
    if (!customImageUrl || !customUserContext) return;
    
    setIsRunning(true);
    
    try {
      const startTime = Date.now();
      
      const imageContext = await contextDetector.detectImageContext(customImageUrl);
      const userContext = contextDetector.inferUserContext(customUserContext);
      const analysisContext = contextDetector.createAnalysisContext(imageContext, userContext);
      
      const duration = Date.now() - startTime;
      
      const customResult: TestResult = {
        testCase: 'Custom Test',
        status: 'passed',
        detectedType: imageContext.primaryType,
        detectedDomain: imageContext.domain,
        confidence: analysisContext.confidence,
        duration
      };
      
      setTestResults([customResult]);
      
    } catch (error) {
      const customResult: TestResult = {
        testCase: 'Custom Test',
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
      
      setTestResults([customResult]);
    } finally {
      setIsRunning(false);
    }
  };

  const getStatusIcon = (status: TestResult['status']) => {
    switch (status) {
      case 'passed': return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'failed': return <AlertCircle className="h-4 w-4 text-red-500" />;
      case 'error': return <AlertCircle className="h-4 w-4 text-destructive" />;
      case 'running': return <Clock className="h-4 w-4 text-blue-500 animate-spin" />;
      default: return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getStatusBadge = (status: TestResult['status']) => {
    const variants: Record<string, any> = {
      passed: 'default',
      failed: 'destructive',
      error: 'destructive',
      running: 'outline',
      pending: 'secondary'
    };
    
    return (
      <Badge variant={variants[status]} className="gap-1">
        {getStatusIcon(status)}
        {status}
      </Badge>
    );
  };

  const passedTests = testResults.filter(r => r.status === 'passed').length;
  const totalTests = testResults.length;

  return (
    <ContextDetectionErrorBoundary>
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TestTube className="h-5 w-5" />
              Context Detection Test Suite
            </CardTitle>
            <div className="text-sm text-muted-foreground">
              Validate context detection accuracy and error handling
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Test Controls */}
            <div className="flex gap-2">
              <Button 
                onClick={runAllTests}
                disabled={isRunning}
                className="gap-2"
              >
                <Play className="h-4 w-4" />
                Run All Tests
              </Button>
              
              {totalTests > 0 && (
                <Badge variant="outline" className="gap-1">
                  <Target className="h-3 w-3" />
                  {passedTests}/{totalTests} Passed
                </Badge>
              )}
            </div>

            {/* Progress */}
            {isRunning && currentTest >= 0 && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Running: {testCases[currentTest]?.name}</span>
                  <span>{currentTest + 1}/{testCases.length}</span>
                </div>
                <Progress value={(currentTest / testCases.length) * 100} />
              </div>
            )}

            {/* Test Results */}
            {testResults.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium">Test Results</h4>
                {testResults.map((result, index) => (
                  <div key={index} className="border rounded-lg p-3 space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="font-medium">{result.testCase}</span>
                      {getStatusBadge(result.status)}
                    </div>
                    
                    {result.status === 'passed' || result.status === 'failed' ? (
                      <div className="text-sm space-y-1">
                        <div>Type: <Badge variant="secondary">{result.detectedType}</Badge></div>
                        <div>Domain: <Badge variant="secondary">{result.detectedDomain}</Badge></div>
                        <div>Confidence: {Math.round((result.confidence || 0) * 100)}%</div>
                        <div>Duration: {result.duration}ms</div>
                      </div>
                    ) : result.status === 'error' ? (
                      <Alert>
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>{result.error}</AlertDescription>
                      </Alert>
                    ) : null}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Custom Test */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5" />
              Custom Test
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Image URL</label>
              <Textarea
                value={customImageUrl}
                onChange={(e) => setCustomImageUrl(e.target.value)}
                placeholder="Enter image URL to test..."
                className="min-h-[60px]"
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">User Context</label>
              <Textarea
                value={customUserContext}
                onChange={(e) => setCustomUserContext(e.target.value)}
                placeholder="Enter user context (e.g., 'I'm a designer looking to improve conversion rates')"
                className="min-h-[60px]"
              />
            </div>
            
            <Button 
              onClick={testCustomInput}
              disabled={!customImageUrl || !customUserContext || isRunning}
              className="w-full"
            >
              Test Custom Input
            </Button>
          </CardContent>
        </Card>
      </div>
    </ContextDetectionErrorBoundary>
  );
}