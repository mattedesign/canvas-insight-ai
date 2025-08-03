/**
 * Integration Testing Dashboard
 * Combines End-to-End Testing and Migration Verification
 * Phase 6: Integration Testing UI
 */

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { endToEndTestRunner } from '@/services/EndToEndTestRunner';
import { migrationVerificationService } from '@/services/MigrationVerificationService';
import { CheckCircle, XCircle, AlertTriangle, Play, RefreshCw } from 'lucide-react';

export const IntegrationTestingDashboard: React.FC = () => {
  const [isRunning, setIsRunning] = useState(false);
  const [e2eResults, setE2eResults] = useState<any>(null);
  const [verificationResults, setVerificationResults] = useState<any>(null);

  const runEndToEndTests = async () => {
    setIsRunning(true);
    try {
      const results = await endToEndTestRunner.runCompleteTestSuite();
      setE2eResults(results);
    } catch (error) {
      console.error('E2E tests failed:', error);
    } finally {
      setIsRunning(false);
    }
  };

  const runMigrationVerification = async () => {
    setIsRunning(true);
    try {
      const results = await migrationVerificationService.runCompleteVerification();
      setVerificationResults(results);
    } catch (error) {
      console.error('Migration verification failed:', error);
    } finally {
      setIsRunning(false);
    }
  };

  const runAllTests = async () => {
    setIsRunning(true);
    try {
      const [e2e, verification] = await Promise.all([
        endToEndTestRunner.runCompleteTestSuite(),
        migrationVerificationService.runCompleteVerification()
      ]);
      setE2eResults(e2e);
      setVerificationResults(verification);
    } catch (error) {
      console.error('Integration tests failed:', error);
    } finally {
      setIsRunning(false);
    }
  };

  const getStatusIcon = (passed: boolean) => {
    return passed ? (
      <CheckCircle className="w-4 h-4 text-green-500" />
    ) : (
      <XCircle className="w-4 h-4 text-red-500" />
    );
  };

  const getStatusBadge = (passed: boolean) => {
    return (
      <Badge variant={passed ? "default" : "destructive"}>
        {passed ? "PASS" : "FAIL"}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Play className="w-5 h-5" />
            Phase 6: Integration Testing Dashboard
          </CardTitle>
          <CardDescription>
            End-to-end testing and migration verification for the complete system
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Button onClick={runAllTests} disabled={isRunning}>
              {isRunning ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <Play className="w-4 h-4 mr-2" />}
              Run All Tests
            </Button>
            <Button variant="outline" onClick={runEndToEndTests} disabled={isRunning}>
              Run E2E Tests Only
            </Button>
            <Button variant="outline" onClick={runMigrationVerification} disabled={isRunning}>
              Run Migration Verification
            </Button>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="e2e">End-to-End Tests</TabsTrigger>
          <TabsTrigger value="migration">Migration Verification</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          {/* Overall Status */}
          {(e2eResults || verificationResults) && (
            <Card>
              <CardHeader>
                <CardTitle>Overall Test Status</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {e2eResults && (
                    <div className="flex items-center justify-between">
                      <span>End-to-End Tests</span>
                      <div className="flex items-center gap-2">
                        {getStatusIcon(e2eResults.overallPass)}
                        {getStatusBadge(e2eResults.overallPass)}
                      </div>
                    </div>
                  )}
                  {verificationResults && (
                    <div className="flex items-center justify-between">
                      <span>Migration Verification</span>
                      <div className="flex items-center gap-2">
                        {getStatusIcon(verificationResults.overallVerification.passed)}
                        {getStatusBadge(verificationResults.overallVerification.passed)}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Quick Results Summary */}
          {e2eResults && (
            <Card>
              <CardHeader>
                <CardTitle>E2E Test Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Upload Workflow</span>
                    {getStatusBadge(e2eResults.uploadTest.passed)}
                  </div>
                  <div className="flex justify-between">
                    <span>Analysis Workflow</span>
                    {getStatusBadge(e2eResults.analysisTest.passed)}
                  </div>
                  <div className="flex justify-between">
                    <span>Canvas Workflow</span>
                    {getStatusBadge(e2eResults.canvasTest.passed)}
                  </div>
                  <div className="flex justify-between">
                    <span>Storage Organization</span>
                    {getStatusBadge(e2eResults.storageTest.passed)}
                  </div>
                  <div className="flex justify-between">
                    <span>Navigation Persistence</span>
                    {getStatusBadge(e2eResults.navigationTest.passed)}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {verificationResults && (
            <Card>
              <CardHeader>
                <CardTitle>Migration Verification Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span>Image Loading</span>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">
                          {verificationResults.imageLoadTest.loadSuccessRate.toFixed(1)}%
                        </span>
                        {getStatusBadge(verificationResults.imageLoadTest.passed)}
                      </div>
                    </div>
                    <Progress value={verificationResults.imageLoadTest.loadSuccessRate} />
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span>Data Integrity</span>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">
                          {verificationResults.dataIntegrityTest.integrityScore.toFixed(1)}%
                        </span>
                        {getStatusBadge(verificationResults.dataIntegrityTest.passed)}
                      </div>
                    </div>
                    <Progress value={verificationResults.dataIntegrityTest.integrityScore} />
                  </div>

                  <div className="flex justify-between">
                    <span>Backward Compatibility</span>
                    {getStatusBadge(verificationResults.backwardCompatibilityTest.passed)}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Recommendations */}
          {verificationResults?.overallVerification && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                {verificationResults.overallVerification.recommendation}
              </AlertDescription>
            </Alert>
          )}
        </TabsContent>

        <TabsContent value="e2e" className="space-y-4">
          {e2eResults ? (
            <div className="space-y-4">
              {Object.entries(e2eResults)
                .filter(([key]) => !['overallPass', 'totalDuration'].includes(key))
                .map(([testName, result]: [string, any]) => (
                  <Card key={testName}>
                    <CardHeader>
                      <CardTitle className="flex items-center justify-between">
                        <span>{testName.replace('Test', '').replace(/([A-Z])/g, ' $1').trim()}</span>
                        {getStatusBadge(result.passed)}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground mb-2">{result.message}</p>
                      <p className="text-xs text-muted-foreground">
                        Duration: {result.duration.toFixed(2)}ms
                      </p>
                      {result.details && (
                        <pre className="mt-2 text-xs bg-muted p-2 rounded">
                          {JSON.stringify(result.details, null, 2)}
                        </pre>
                      )}
                    </CardContent>
                  </Card>
                ))}
            </div>
          ) : (
            <Card>
              <CardContent className="pt-6">
                <p className="text-center text-muted-foreground">
                  Run E2E tests to see detailed results
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="migration" className="space-y-4">
          {verificationResults ? (
            <div className="space-y-4">
              {/* Image Loading Test */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    Image Loading Verification
                    {getStatusBadge(verificationResults.imageLoadTest.passed)}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>Total Images</span>
                      <span>{verificationResults.imageLoadTest.totalImages}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Loadable Images</span>
                      <span>{verificationResults.imageLoadTest.loadableImages}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Success Rate</span>
                      <span>{verificationResults.imageLoadTest.loadSuccessRate.toFixed(1)}%</span>
                    </div>
                  </div>
                  {verificationResults.imageLoadTest.failedImages.length > 0 && (
                    <div className="mt-4">
                      <p className="text-sm font-medium mb-2">Failed Images:</p>
                      <div className="text-xs text-muted-foreground space-y-1">
                        {verificationResults.imageLoadTest.failedImages.map((error: string, index: number) => (
                          <div key={index}>{error}</div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Data Integrity Test */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    Data Integrity Verification
                    {getStatusBadge(verificationResults.dataIntegrityTest.passed)}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>Total Records</span>
                      <span>{verificationResults.dataIntegrityTest.totalRecords}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Corrupted Records</span>
                      <span>{verificationResults.dataIntegrityTest.corruptedRecords}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Missing References</span>
                      <span>{verificationResults.dataIntegrityTest.missingReferences}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Integrity Score</span>
                      <span>{verificationResults.dataIntegrityTest.integrityScore.toFixed(1)}%</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Backward Compatibility */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    Backward Compatibility
                    {getStatusBadge(verificationResults.backwardCompatibilityTest.passed)}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>Legacy Format Support</span>
                      {getStatusIcon(verificationResults.backwardCompatibilityTest.legacyFormatSupported)}
                    </div>
                    <div className="flex justify-between">
                      <span>New Format Support</span>
                      {getStatusIcon(verificationResults.backwardCompatibilityTest.newFormatSupported)}
                    </div>
                  </div>
                  {verificationResults.backwardCompatibilityTest.issues.length > 0 && (
                    <div className="mt-4">
                      <p className="text-sm font-medium mb-2">Issues:</p>
                      <div className="text-xs text-muted-foreground space-y-1">
                        {verificationResults.backwardCompatibilityTest.issues.map((issue: string, index: number) => (
                          <div key={index}>{issue}</div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          ) : (
            <Card>
              <CardContent className="pt-6">
                <p className="text-center text-muted-foreground">
                  Run migration verification to see detailed results
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};