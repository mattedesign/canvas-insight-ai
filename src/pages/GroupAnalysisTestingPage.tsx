/**
 * Group Analysis Testing Page
 * Comprehensive testing interface for group analysis functionality
 */

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { GroupAnalysisIntegrationTest } from '@/components/testing/GroupAnalysisIntegrationTest';
import { GroupAnalysisCanvasIntegrationTest } from '@/components/testing/GroupAnalysisCanvasIntegrationTest';

import { ArrowLeft, TestTube, CheckCircle, XCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface TestResult {
  testName: string;
  success: boolean;
  message: string;
  timestamp: Date;
}

const GroupAnalysisTestingPage: React.FC = () => {
  const navigate = useNavigate();
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  
  const handleTestComplete = (testName: string) => (success: boolean, message: string) => {
    setTestResults(prev => [
      ...prev,
      {
        testName,
        success,
        message,
        timestamp: new Date()
      }
    ]);
  };
  
  const allTestsPassed = testResults.length >= 2 && testResults.every(r => r.success);
  const hasFailures = testResults.some(r => !r.success);

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/dashboard')}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Button>
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-2">
                <TestTube className="w-8 h-8 text-primary" />
                Group Analysis Testing Suite
              </h1>
              <p className="text-muted-foreground">
                Comprehensive testing for group analysis functionality and canvas integration
              </p>
            </div>
          </div>
          
          {testResults.length > 0 && (
            <div className="flex items-center gap-2">
              {allTestsPassed ? (
                <Badge variant="default" className="bg-green-100 text-green-800">
                  <CheckCircle className="w-4 h-4 mr-1" />
                  All Tests Passed
                </Badge>
              ) : hasFailures ? (
                <Badge variant="destructive">
                  <XCircle className="w-4 h-4 mr-1" />
                  Some Tests Failed
                </Badge>
              ) : (
                <Badge variant="secondary">Tests In Progress</Badge>
              )}
            </div>
          )}
        </div>

        {/* Test Results Summary */}
        {testResults.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Test Results Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {testResults.map((result, index) => (
                  <div key={index} className="flex items-center justify-between p-2 rounded bg-muted/30">
                    <div className="flex items-center gap-2">
                      {result.success ? (
                        <CheckCircle className="w-4 h-4 text-green-500" />
                      ) : (
                        <XCircle className="w-4 h-4 text-red-500" />
                      )}
                      <span className="font-medium">{result.testName}</span>
                    </div>
                    <div className="text-right">
                      <div className="text-sm">{result.message}</div>
                      <div className="text-xs text-muted-foreground">
                        {result.timestamp.toLocaleTimeString()}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Test Components Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Basic Integration Test */}
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">Basic Integration Tests</h2>
            <GroupAnalysisIntegrationTest 
              onTestComplete={handleTestComplete('Basic Integration')}
            />
          </div>

          {/* Canvas Integration Test */}
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">Canvas Integration Tests</h2>
            <GroupAnalysisCanvasIntegrationTest 
              onTestComplete={handleTestComplete('Canvas Integration')}
            />
          </div>
        </div>

        {/* Additional Testing Note */}
        <Card>
          <CardHeader>
            <CardTitle>Test Status</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Run both integration tests to verify complete group analysis functionality. 
              All tests should pass for full system verification.
            </p>
          </CardContent>
        </Card>

        {/* Testing Guidelines */}
        <Card>
          <CardHeader>
            <CardTitle>Testing Guidelines</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="font-medium mb-2">Test Execution Order</h3>
              <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
                <li>Run Basic Integration Test first to verify core functionality</li>
                <li>Execute Canvas Integration Test to verify UI interactions</li>
                <li>Complete System Verification for comprehensive validation</li>
              </ol>
            </div>
            
            <Separator />
            
            <div>
              <h3 className="font-medium mb-2">Expected Results</h3>
              <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                <li>All progress service methods should be functional</li>
                <li>Canvas nodes should be created and positioned correctly</li>
                <li>Real-time progress updates should work smoothly</li>
                <li>State transitions should be clean and predictable</li>
                <li>Cleanup processes should complete successfully</li>
              </ul>
            </div>
            
            <Separator />
            
            <div>
              <h3 className="font-medium mb-2">Troubleshooting</h3>
              <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                <li>Check browser console for detailed error messages</li>
                <li>Verify API keys are configured in Supabase settings</li>
                <li>Ensure network connectivity for edge function calls</li>
                <li>Test individual components if integration tests fail</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default GroupAnalysisTestingPage;