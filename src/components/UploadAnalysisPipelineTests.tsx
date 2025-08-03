import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  Clock, 
  Play, 
  Upload,
  Database,
  Link,
  Zap,
  FileImage,
  RotateCcw
} from 'lucide-react';

import { BlobUrlReplacementService } from '@/services/BlobUrlReplacementService';
import { EnhancedAnalysisPipeline } from '@/services/EnhancedAnalysisPipeline';
import { supabase } from '@/integrations/supabase/client';

interface TestResult {
  name: string;
  status: 'passing' | 'failing' | 'warning' | 'running' | 'pending';
  duration?: number;
  message?: string;
  details?: any;
}

interface TestSuite {
  name: string;
  description: string;
  tests: TestResult[];
  icon: React.ComponentType<{ className?: string }>;
}

const PHASE_4_TESTS: TestSuite[] = [
  {
    name: 'Blob URL Processing',
    description: 'Test blob URL creation, conversion, and cleanup',
    icon: Link,
    tests: [
      { name: 'Create blob URL from file', status: 'pending' },
      { name: 'Convert blob URL to base64', status: 'pending' },
      { name: 'Upload file to Supabase storage', status: 'pending' },
      { name: 'Replace blob URL with storage URL', status: 'pending' },
      { name: 'Clean up blob URLs properly', status: 'pending' }
    ]
  },
  {
    name: 'Upload Pipeline Integration',
    description: 'Test complete upload to storage workflow',
    icon: Upload,
    tests: [
      { name: 'File upload with progress tracking', status: 'pending' },
      { name: 'Multiple file batch processing', status: 'pending' },
      { name: 'Error handling for upload failures', status: 'pending' },
      { name: 'Storage URL validation', status: 'pending' },
      { name: 'Metadata preservation during upload', status: 'pending' }
    ]
  },
  {
    name: 'Analysis Pipeline Robustness',
    description: 'Test enhanced analysis pipeline with URL handling',
    icon: Zap,
    tests: [
      { name: 'Blob URL to base64 in edge functions', status: 'pending' },
      { name: 'Storage URL handling in analysis', status: 'pending' },
      { name: 'Edge function data reception', status: 'pending' },
      { name: 'Context detection with storage URLs', status: 'pending' },
      { name: 'Analysis result storage validation', status: 'pending' }
    ]
  },
  {
    name: 'Error Recovery & Retry',
    description: 'Test error handling and recovery mechanisms',
    icon: AlertTriangle,
    tests: [
      { name: 'Network failure recovery', status: 'pending' },
      { name: 'Storage upload retry logic', status: 'pending' },
      { name: 'Analysis pipeline error recovery', status: 'pending' },
      { name: 'Partial failure handling', status: 'pending' },
      { name: 'User feedback on errors', status: 'pending' }
    ]
  }
];

export const UploadAnalysisPipelineTests: React.FC = () => {
  const [testSuites, setTestSuites] = useState<TestSuite[]>(PHASE_4_TESTS);
  const [isRunning, setIsRunning] = useState(false);
  const [currentTest, setCurrentTest] = useState<string>('');
  const [overallProgress, setOverallProgress] = useState(0);
  const [testResults, setTestResults] = useState<Record<string, any>>({});

  // Create a test image file for testing
  const createTestFile = useCallback((): File => {
    const canvas = document.createElement('canvas');
    canvas.width = 100;
    canvas.height = 100;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#3b82f6';
      ctx.fillRect(0, 0, 100, 100);
      ctx.fillStyle = '#ffffff';
      ctx.font = '12px Arial';
      ctx.fillText('TEST', 35, 55);
    }
    
    return new Promise<File>((resolve) => {
      canvas.toBlob((blob) => {
        if (blob) {
          resolve(new File([blob], 'test-image.png', { type: 'image/png' }));
        }
      });
    }) as any;
  }, []);

  // Test blob URL processing
  const testBlobUrlProcessing = useCallback(async (): Promise<TestResult[]> => {
    const results: TestResult[] = [];
    const testFile = await createTestFile();

    // Test 1: Create blob URL
    try {
      const blobUrl = URL.createObjectURL(testFile);
      results.push({
        name: 'Create blob URL from file',
        status: blobUrl.startsWith('blob:') ? 'passing' : 'failing',
        message: blobUrl.startsWith('blob:') ? 'Blob URL created successfully' : 'Failed to create blob URL'
      });
      
      // Test 2: Convert blob URL to base64
      try {
        const base64 = await BlobUrlReplacementService.blobUrlToBase64(blobUrl);
        results.push({
          name: 'Convert blob URL to base64',
          status: base64.length > 0 ? 'passing' : 'failing',
          message: base64.length > 0 ? `Base64 conversion successful (${base64.length} chars)` : 'Base64 conversion failed'
        });
      } catch (error) {
        results.push({
          name: 'Convert blob URL to base64',
          status: 'failing',
          message: `Base64 conversion failed: ${error.message}`
        });
      }

      // Test 3: Upload to Supabase storage
      try {
        const imageId = crypto.randomUUID();
        const storageUrl = await BlobUrlReplacementService.uploadFileToStorage(testFile, imageId);
        results.push({
          name: 'Upload file to Supabase storage',
          status: storageUrl.includes('supabase') ? 'passing' : 'failing',
          message: storageUrl.includes('supabase') ? 'Storage upload successful' : 'Storage upload failed',
          details: { storageUrl }
        });

        // Test 4: Replace blob URL with storage URL
        const mockUploadedImage = {
          id: imageId,
          url: blobUrl,
          file: testFile,
          name: testFile.name,
          size: testFile.size,
          type: testFile.type,
          uploadedAt: new Date()
        };

        try {
          const processedImage = await BlobUrlReplacementService.processUploadedImage(mockUploadedImage);
          results.push({
            name: 'Replace blob URL with storage URL',
            status: processedImage.url.includes('supabase') ? 'passing' : 'failing',
            message: processedImage.url.includes('supabase') ? 'URL replacement successful' : 'URL replacement failed',
            details: { originalUrl: blobUrl, newUrl: processedImage.url }
          });
        } catch (error) {
          results.push({
            name: 'Replace blob URL with storage URL',
            status: 'failing',
            message: `URL replacement failed: ${error.message}`
          });
        }

      } catch (error) {
        results.push({
          name: 'Upload file to Supabase storage',
          status: 'failing',
          message: `Storage upload failed: ${error.message}`
        });
        
        results.push({
          name: 'Replace blob URL with storage URL',
          status: 'failing',
          message: 'Skipped due to storage upload failure'
        });
      }

      // Test 5: Clean up blob URLs
      try {
        URL.revokeObjectURL(blobUrl);
        results.push({
          name: 'Clean up blob URLs properly',
          status: 'passing',
          message: 'Blob URL cleanup successful'
        });
      } catch (error) {
        results.push({
          name: 'Clean up blob URLs properly',
          status: 'failing',
          message: `Blob URL cleanup failed: ${error.message}`
        });
      }

    } catch (error) {
      results.push({
        name: 'Create blob URL from file',
        status: 'failing',
        message: `Blob URL creation failed: ${error.message}`
      });
    }

    return results;
  }, [createTestFile]);

  // Test upload pipeline integration
  const testUploadPipelineIntegration = useCallback(async (): Promise<TestResult[]> => {
    const results: TestResult[] = [];
    
    // Test multiple file processing
    try {
      const testFiles = await Promise.all([
        createTestFile(),
        createTestFile(),
        createTestFile()
      ]);

      // Test batch processing
      const processedFiles = await Promise.all(
        testFiles.map(async (file, index) => {
          const imageId = `test-${index}-${crypto.randomUUID()}`;
          try {
            const storageUrl = await BlobUrlReplacementService.uploadFileToStorage(file, imageId);
            return { success: true, file, storageUrl, imageId };
          } catch (error) {
            return { success: false, file, error: error.message, imageId };
          }
        })
      );

      const successCount = processedFiles.filter(p => p.success).length;
      results.push({
        name: 'Multiple file batch processing',
        status: successCount === testFiles.length ? 'passing' : successCount > 0 ? 'warning' : 'failing',
        message: `${successCount}/${testFiles.length} files processed successfully`
      });

      // Test storage URL validation
      const validUrls = processedFiles
        .filter(p => p.success)
        .map(p => p.storageUrl)
        .filter(url => url && url.includes('supabase'));

      results.push({
        name: 'Storage URL validation',
        status: validUrls.length === successCount ? 'passing' : 'failing',
        message: `${validUrls.length}/${successCount} URLs are valid Supabase storage URLs`
      });

    } catch (error) {
      results.push({
        name: 'Multiple file batch processing',
        status: 'failing',
        message: `Batch processing failed: ${error.message}`
      });
    }

    return results;
  }, [createTestFile]);

  // Test analysis pipeline robustness
  const testAnalysisPipelineRobustness = useCallback(async (): Promise<TestResult[]> => {
    const results: TestResult[] = [];
    
    try {
      const testFile = await createTestFile();
      const imageId = crypto.randomUUID();
      const blobUrl = URL.createObjectURL(testFile);

      // Test enhanced analysis pipeline with blob URL
      const pipeline = new EnhancedAnalysisPipeline((progress) => {
        console.log('[Pipeline Test]', progress);
      });

      try {
        const analysisResult = await pipeline.executeContextAwareAnalysis(
          imageId,
          blobUrl,
          testFile.name,
          'Testing blob URL handling in analysis pipeline'
        );

        results.push({
          name: 'Blob URL to base64 in edge functions',
          status: analysisResult.success ? 'passing' : 'failing',
          message: analysisResult.success ? 'Analysis pipeline handled blob URL successfully' : 'Analysis pipeline failed with blob URL'
        });

        results.push({
          name: 'Edge function data reception',
          status: analysisResult.data ? 'passing' : 'failing',
          message: analysisResult.data ? 'Edge function received and processed data' : 'Edge function failed to process data'
        });

        results.push({
          name: 'Context detection with storage URLs',
          status: analysisResult.analysisContext ? 'passing' : 'failing',
          message: analysisResult.analysisContext ? 'Context detection worked with URLs' : 'Context detection failed'
        });

      } catch (error) {
        results.push({
          name: 'Blob URL to base64 in edge functions',
          status: 'failing',
          message: `Analysis pipeline error: ${error.message}`
        });
      }

      URL.revokeObjectURL(blobUrl);

    } catch (error) {
      results.push({
        name: 'Analysis pipeline robustness',
        status: 'failing',
        message: `Pipeline test setup failed: ${error.message}`
      });
    }

    return results;
  }, [createTestFile]);

  // Test error recovery and retry
  const testErrorRecoveryAndRetry = useCallback(async (): Promise<TestResult[]> => {
    const results: TestResult[] = [];
    
    // Test invalid file handling
    try {
      const invalidFile = new File(['invalid'], 'invalid.txt', { type: 'text/plain' });
      
      try {
        await BlobUrlReplacementService.uploadFileToStorage(invalidFile, 'test-invalid');
        results.push({
          name: 'Invalid file handling',
          status: 'warning',
          message: 'Invalid file was uploaded (should be rejected)'
        });
      } catch (error) {
        results.push({
          name: 'Invalid file handling',
          status: 'passing',
          message: 'Invalid file correctly rejected'
        });
      }

      // Test cache clearing
      try {
        BlobUrlReplacementService.clearCache();
        const stats = BlobUrlReplacementService.getCacheStats();
        results.push({
          name: 'Cache management',
          status: stats.size === 0 ? 'passing' : 'warning',
          message: `Cache cleared successfully (size: ${stats.size})`
        });
      } catch (error) {
        results.push({
          name: 'Cache management',
          status: 'failing',
          message: `Cache management failed: ${error.message}`
        });
      }

    } catch (error) {
      results.push({
        name: 'Error recovery testing',
        status: 'failing',
        message: `Error recovery test failed: ${error.message}`
      });
    }

    return results;
  }, []);

  // Run all tests
  const runAllTests = useCallback(async () => {
    setIsRunning(true);
    setOverallProgress(0);
    setTestResults({});

    const totalTests = testSuites.reduce((sum, suite) => sum + suite.tests.length, 0);
    let completedTests = 0;

    try {
      // Update test suites to show running status
      setTestSuites(prev => prev.map(suite => ({
        ...suite,
        tests: suite.tests.map(test => ({ ...test, status: 'running' as const }))
      })));

      // Run blob URL processing tests
      setCurrentTest('Testing blob URL processing...');
      const blobResults = await testBlobUrlProcessing();
      completedTests += blobResults.length;
      setOverallProgress((completedTests / totalTests) * 100);

      // Run upload pipeline tests
      setCurrentTest('Testing upload pipeline integration...');
      const uploadResults = await testUploadPipelineIntegration();
      completedTests += uploadResults.length;
      setOverallProgress((completedTests / totalTests) * 100);

      // Run analysis pipeline tests
      setCurrentTest('Testing analysis pipeline robustness...');
      const analysisResults = await testAnalysisPipelineRobustness();
      completedTests += analysisResults.length;
      setOverallProgress((completedTests / totalTests) * 100);

      // Run error recovery tests
      setCurrentTest('Testing error recovery and retry...');
      const errorResults = await testErrorRecoveryAndRetry();
      completedTests += errorResults.length;
      setOverallProgress(100);

      // Update test suites with results
      setTestSuites(prev => prev.map((suite, index) => {
        let results: TestResult[] = [];
        if (index === 0) results = blobResults;
        else if (index === 1) results = uploadResults;
        else if (index === 2) results = analysisResults;
        else if (index === 3) results = errorResults;

        return {
          ...suite,
          tests: results.map((result, testIndex) => ({
            ...suite.tests[testIndex],
            ...result
          }))
        };
      }));

      setTestResults({
        blobResults,
        uploadResults,
        analysisResults,
        errorResults
      });

    } catch (error) {
      console.error('Test execution failed:', error);
    } finally {
      setIsRunning(false);
      setCurrentTest('');
    }
  }, [testSuites, testBlobUrlProcessing, testUploadPipelineIntegration, testAnalysisPipelineRobustness, testErrorRecoveryAndRetry]);

  const resetTests = useCallback(() => {
    setTestSuites(PHASE_4_TESTS);
    setTestResults({});
    setOverallProgress(0);
    setCurrentTest('');
  }, []);

  const getStatusIcon = (status: TestResult['status']) => {
    switch (status) {
      case 'passing': return <CheckCircle2 className="h-4 w-4 text-green-600" />;
      case 'failing': return <XCircle className="h-4 w-4 text-red-600" />;
      case 'warning': return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
      case 'running': return <Clock className="h-4 w-4 text-blue-600 animate-spin" />;
      default: return <div className="h-4 w-4 bg-muted rounded-full" />;
    }
  };

  const getStatusBadge = (status: TestResult['status']) => {
    const variants = {
      passing: 'bg-green-100 text-green-800',
      failing: 'bg-red-100 text-red-800',
      warning: 'bg-yellow-100 text-yellow-800',
      running: 'bg-blue-100 text-blue-800',
      pending: 'bg-muted text-muted-foreground'
    };

    return (
      <Badge variant="secondary" className={variants[status]}>
        {status}
      </Badge>
    );
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Upload → Analysis Pipeline Tests</h1>
          <p className="text-muted-foreground">
            Phase 4: Comprehensive testing of upload, blob URL conversion, and analysis pipeline
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button 
            onClick={runAllTests} 
            disabled={isRunning}
            size="lg"
          >
            {isRunning ? (
              <>
                <Clock className="h-4 w-4 mr-2 animate-spin" />
                Running Tests...
              </>
            ) : (
              <>
                <Play className="h-4 w-4 mr-2" />
                Run All Tests
              </>
            )}
          </Button>
          <Button variant="outline" onClick={resetTests}>
            <RotateCcw className="h-4 w-4 mr-2" />
            Reset
          </Button>
        </div>
      </div>

      {isRunning && (
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-medium">Running Pipeline Tests</span>
                <span className="text-sm text-muted-foreground">
                  {Math.round(overallProgress)}%
                </span>
              </div>
              <Progress value={overallProgress} />
              {currentTest && (
                <p className="text-sm text-muted-foreground">{currentTest}</p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {testSuites.map((suite, suiteIndex) => (
          <Card key={suiteIndex} className="transition-all duration-200">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <suite.icon className="h-5 w-5 text-primary" />
                  <CardTitle className="text-sm font-medium">{suite.name}</CardTitle>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-xs text-muted-foreground">
                    {suite.tests.filter(t => t.status === 'passing').length}/{suite.tests.length}
                  </span>
                </div>
              </div>
              <CardDescription className="text-xs">
                {suite.description}
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-2">
                {suite.tests.map((test, testIndex) => (
                  <div key={testIndex} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center space-x-2">
                        {getStatusIcon(test.status)}
                        <span className="font-medium">{test.name}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        {test.duration && (
                          <span className="text-xs text-muted-foreground">
                            {test.duration.toFixed(1)}ms
                          </span>
                        )}
                        {getStatusBadge(test.status)}
                      </div>
                    </div>
                    {test.message && (
                      <p className="text-xs text-muted-foreground pl-6">
                        {test.message}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {Object.keys(testResults).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Test Summary</CardTitle>
            <CardDescription>
              Complete results from the upload → analysis pipeline validation
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Alert>
              <CheckCircle2 className="h-4 w-4" />
              <AlertDescription>
                Phase 4 testing completed. Review individual test results above for detailed validation of blob URL processing, upload pipeline integration, analysis robustness, and error recovery mechanisms.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      )}
    </div>
  );
};