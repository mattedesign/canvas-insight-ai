import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { Loader2, TestTube, CheckCircle, AlertCircle } from 'lucide-react';
import { useSimpleGroupAnalysis } from '@/hooks/useSimpleGroupAnalysis';

export const SimpleGroupAnalysisTest: React.FC = () => {
  const [testUrls, setTestUrls] = useState(
    'https://via.placeholder.com/800x600/FF5733/FFFFFF?text=Dashboard+Example\nhttps://via.placeholder.com/800x600/33FF57/FFFFFF?text=Form+Example'
  );
  const [testPrompt, setTestPrompt] = useState(
    'Analyze these interface designs for usability issues and provide improvement recommendations.'
  );
  const [testResult, setTestResult] = useState<any>(null);

  const { analyzeGroup, progress, isLoading } = useSimpleGroupAnalysis();

  const runTest = async () => {
    try {
      const urls = testUrls.split('\n').filter(url => url.trim() !== '');
      
      if (urls.length === 0) {
        alert('Please provide at least one image URL');
        return;
      }

      const result = await analyzeGroup(
        urls,
        testPrompt,
        'Test group analysis',
        'test-group-' + Date.now(),
        'Test Group'
      );

      setTestResult(result);
    } catch (error) {
      console.error('Test failed:', error);
      setTestResult({ error: error.message });
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto p-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TestTube className="h-5 w-5" />
            Simple Group Analysis Test
          </CardTitle>
          <CardDescription>
            Test the new simplified group analysis edge function
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium">Test Image URLs (one per line)</label>
            <Textarea
              value={testUrls}
              onChange={(e) => setTestUrls(e.target.value)}
              placeholder="Enter image URLs, one per line..."
              rows={4}
              className="mt-2"
            />
          </div>

          <div>
            <label className="text-sm font-medium">Analysis Prompt</label>
            <Textarea
              value={testPrompt}
              onChange={(e) => setTestPrompt(e.target.value)}
              placeholder="Enter your analysis request..."
              rows={3}
              className="mt-2"
            />
          </div>

          <Button 
            onClick={runTest}
            disabled={isLoading}
            className="w-full"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Running Test...
              </>
            ) : (
              <>
                <TestTube className="h-4 w-4 mr-2" />
                Run Group Analysis Test
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Progress Display */}
      {isLoading && (
        <Card>
          <CardHeader>
            <CardTitle>Test Progress</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />
                  <span className="font-medium">{progress.stage}</span>
                </div>
                <span className="text-sm text-muted-foreground">
                  {progress.progress}%
                </span>
              </div>
              <Progress value={progress.progress} className="h-2" />
              {progress.message && (
                <p className="text-sm text-muted-foreground">{progress.message}</p>
              )}
              {progress.error && (
                <div className="flex items-center gap-2 text-red-500">
                  <AlertCircle className="h-4 w-4" />
                  <span className="text-sm">{progress.error}</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Results Display */}
      {testResult && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {testResult.error ? (
                <AlertCircle className="h-5 w-5 text-red-500" />
              ) : (
                <CheckCircle className="h-5 w-5 text-green-500" />
              )}
              Test Results
            </CardTitle>
          </CardHeader>
          <CardContent>
            {testResult.error ? (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <h3 className="font-medium text-red-800 mb-2">Test Failed</h3>
                <p className="text-red-700">{testResult.error}</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                  <h3 className="font-medium text-green-800 mb-2">Test Successful!</h3>
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <span className="font-medium">Total Images:</span>
                      <div className="text-lg">{testResult.metadata?.totalImages || 0}</div>
                    </div>
                    <div>
                      <span className="font-medium">Successful:</span>
                      <div className="text-lg">{testResult.metadata?.successfulAnalyses || 0}</div>
                    </div>
                    <div>
                      <span className="font-medium">Group Name:</span>
                      <div className="text-lg">{testResult.groupAnalysis?.groupName || 'N/A'}</div>
                    </div>
                  </div>
                </div>

                {testResult.groupAnalysis?.groupInsights && (
                  <div>
                    <h3 className="font-medium mb-2">Group Insights</h3>
                    <div className="p-4 bg-gray-50 border rounded-lg">
                      <pre className="text-sm whitespace-pre-wrap">
                        {testResult.groupAnalysis.groupInsights}
                      </pre>
                    </div>
                  </div>
                )}

                <div>
                  <h3 className="font-medium mb-2">Raw Response</h3>
                  <details className="cursor-pointer">
                    <summary className="text-sm text-muted-foreground">Click to view full response</summary>
                    <pre className="text-xs mt-2 p-2 bg-gray-100 border rounded overflow-auto max-h-64">
                      {JSON.stringify(testResult, null, 2)}
                    </pre>
                  </details>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};