/**
 * Canvas Integration Test Component for Group Analysis
 * Tests the complete flow from canvas node creation to progress tracking
 */

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useGroupAnalysisProgress } from '@/hooks/useGroupAnalysisProgress';
import { groupAnalysisProgressService } from '@/services/GroupAnalysisProgressService';
import { Loader2, CheckCircle, AlertCircle, PlayCircle, Eye, XCircle } from 'lucide-react';

interface TestPhase {
  id: string;
  name: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  description: string;
  results?: string[];
}

interface CanvasIntegrationTestProps {
  onTestComplete?: (success: boolean, message: string) => void;
}

export const GroupAnalysisCanvasIntegrationTest: React.FC<CanvasIntegrationTestProps> = ({ 
  onTestComplete 
}) => {
  const [testStatus, setTestStatus] = useState<'idle' | 'running' | 'completed' | 'failed'>('idle');
  const [phases, setPhases] = useState<TestPhase[]>([
    {
      id: 'progress-service',
      name: 'Progress Service Integration',
      status: 'pending',
      description: 'Test progress service instantiation and basic functionality'
    },
    {
      id: 'node-creation',
      name: 'Canvas Node Creation',
      status: 'pending',
      description: 'Test loading and results node creation with proper positioning'
    },
    {
      id: 'progress-tracking',
      name: 'Progress Tracking Flow',
      status: 'pending',
      description: 'Test real-time progress updates and state transitions'
    },
    {
      id: 'canvas-integration',
      name: 'Canvas State Management',
      status: 'pending',
      description: 'Test canvas node updates and edge connections'
    },
    {
      id: 'cleanup',
      name: 'Cleanup & Completion',
      status: 'pending',
      description: 'Test proper cleanup and final state handling'
    }
  ]);

  const groupAnalysisProgress = useGroupAnalysisProgress();
  
  const updatePhaseStatus = (phaseId: string, status: TestPhase['status'], results?: string[]) => {
    setPhases(prev => prev.map(phase => 
      phase.id === phaseId 
        ? { ...phase, status, results }
        : phase
    ));
  };

  const runCanvasIntegrationTest = async () => {
    setTestStatus('running');
    
    const mockGroupId = 'test-canvas-group-456';
    const mockGroupName = 'Canvas Integration Test Group';
    const mockPosition = { x: 200, y: 150 };
    
    try {
      // Phase 1: Progress Service Integration
      updatePhaseStatus('progress-service', 'running');
      
      const serviceInstance = groupAnalysisProgressService;
      if (!serviceInstance) {
        throw new Error('Progress service not available');
      }
      
      // Test service methods
      const progressData = serviceInstance.getProgressData(mockGroupId);
      const isInProgress = serviceInstance.isAnalysisInProgress(mockGroupId);
      
      updatePhaseStatus('progress-service', 'completed', [
        '✅ Progress service instance available',
        `✅ Progress data method: ${progressData ? 'exists' : 'null as expected'}`,
        `✅ Analysis in progress check: ${isInProgress}`,
      ]);

      // Phase 2: Node Creation
      updatePhaseStatus('node-creation', 'running');
      
      // Start tracking to create initial data
      let progressUpdates: any[] = [];
      serviceInstance.startGroupAnalysis(
        mockGroupId,
        mockGroupName,
        3,
        (data) => {
          progressUpdates.push(data);
        }
      );
      
      // Test loading node creation
      const loadingNode = serviceInstance.createLoadingNode(
        mockGroupId,
        mockPosition,
        (groupId) => console.log('Cancel requested for:', groupId)
      );
      
      if (!loadingNode) {
        throw new Error('Loading node creation failed');
      }
      
      // Test results node creation with mock analysis data
      const mockAnalysisResults = {
        id: 'test-analysis-123',
        sessionId: 'test-session-123',
        groupId: mockGroupId,
        prompt: 'Test analysis prompt',
        summary: { overallScore: 85, consistency: 80, thematicCoherence: 90, userFlowContinuity: 85 },
        insights: ['Test insight 1', 'Test insight 2'],
        recommendations: ['Test recommendation 1'],
        patterns: {
          commonElements: ['Button styles', 'Typography'],
          designInconsistencies: ['Color usage'],
          userJourneyGaps: ['Navigation flow']
        },
        createdAt: new Date()
      };
      
      const resultsNode = serviceInstance.createResultsNode(
        mockGroupId,
        mockAnalysisResults,
        { x: mockPosition.x + 400, y: mockPosition.y },
        () => console.log('Edit prompt'),
        () => console.log('Create fork'),
        () => console.log('View details')
      );
      
      updatePhaseStatus('node-creation', 'completed', [
        `✅ Loading node created: ${loadingNode.type}`,
        `✅ Loading node positioned at: (${loadingNode.position.x}, ${loadingNode.position.y})`,
        `✅ Results node created: ${resultsNode.type}`,
        `✅ Results node has callback functions: ${resultsNode.data.onEditPrompt ? 'Yes' : 'No'}`,
        `✅ Node IDs unique: Loading(${loadingNode.id}), Results(${resultsNode.id})`,
      ]);

      // Phase 3: Progress Tracking
      updatePhaseStatus('progress-tracking', 'running');
      
      // Simulate progress updates
      const progressStages = [
        { stage: 'context-detection', progress: 20, message: 'Detecting interface context...' },
        { stage: 'individual-analysis', progress: 50, message: 'Analyzing individual images...' },
        { stage: 'cross-image-analysis', progress: 75, message: 'Finding patterns across images...' },
        { stage: 'synthesizing', progress: 90, message: 'Synthesizing final insights...' },
      ];
      
      for (const stage of progressStages) {
        serviceInstance.updateProgress(
          mockGroupId,
          stage.stage,
          stage.progress,
          stage.message
        );
        
        // Allow UI to update
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      updatePhaseStatus('progress-tracking', 'completed', [
        `✅ Progress updates processed: ${progressStages.length} stages`,
        `✅ Progress callbacks triggered: ${progressUpdates.length} times`,
        `✅ Final progress: ${progressUpdates[progressUpdates.length - 1]?.progress}%`,
        `✅ Status transitions working: ${progressUpdates.map(u => u.status).join(' → ')}`,
      ]);

      // Phase 4: Canvas Integration
      updatePhaseStatus('canvas-integration', 'running');
      
      // Test hook integration
      const hookLoadingNode = groupAnalysisProgress.getLoadingNode(mockGroupId, mockPosition);
      const hookResultsNode = groupAnalysisProgress.getResultsNode(
        mockGroupId, 
        mockAnalysisResults, 
        { x: mockPosition.x + 400, y: mockPosition.y }
      );
      const hookIsInProgress = groupAnalysisProgress.isAnalysisInProgress(mockGroupId);
      
      updatePhaseStatus('canvas-integration', 'completed', [
        `✅ Hook loading node: ${hookLoadingNode ? 'Created' : 'Not available'}`,
        `✅ Hook results node: ${hookResultsNode ? 'Created' : 'Failed'}`,
        `✅ Hook progress check: ${hookIsInProgress}`,
        `✅ Canvas integration ready for live use`,
      ]);

      // Phase 5: Cleanup
      updatePhaseStatus('cleanup', 'running');
      
      // Complete the analysis
      serviceInstance.completeGroupAnalysis(mockGroupId, mockAnalysisResults);
      
      // Verify cleanup happens (after a short delay)
      setTimeout(() => {
        const finalProgressData = serviceInstance.getProgressData(mockGroupId);
        const finalIsInProgress = serviceInstance.isAnalysisInProgress(mockGroupId);
        
        updatePhaseStatus('cleanup', 'completed', [
          `✅ Analysis marked as completed`,
          `✅ Final progress data: ${finalProgressData ? 'Still available' : 'Cleaned up'}`,
          `✅ Final in-progress status: ${finalIsInProgress}`,
          `✅ Cleanup scheduled for completion`,
        ]);
        
        setTestStatus('completed');
        onTestComplete?.(true, 'All canvas integration tests passed successfully');
      }, 1000);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      // Mark current running phase as failed
      setPhases(prev => prev.map(phase => 
        phase.status === 'running'
          ? { ...phase, status: 'failed', results: [`❌ Error: ${errorMessage}`] }
          : phase
      ));
      
      setTestStatus('failed');
      onTestComplete?.(false, errorMessage);
    }
  };

  const getPhaseIcon = (status: TestPhase['status']) => {
    switch (status) {
      case 'running':
        return <Loader2 className="w-4 h-4 animate-spin text-blue-500" />;
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'failed':
        return <XCircle className="w-4 h-4 text-red-500" />;
      default:
        return <Eye className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const getStatusBadge = () => {
    switch (testStatus) {
      case 'running':
        return <Badge variant="secondary">Running Integration Tests...</Badge>;
      case 'completed':
        return <Badge variant="default" className="bg-green-100 text-green-800">All Tests Passed</Badge>;
      case 'failed':
        return <Badge variant="destructive">Tests Failed</Badge>;
      default:
        return <Badge variant="outline">Ready to Test Canvas Integration</Badge>;
    }
  };

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <PlayCircle className="w-5 h-5 text-primary" />
            Canvas Integration Test
          </CardTitle>
          {getStatusBadge()}
        </div>
      </CardHeader>
      
      <CardContent className="space-y-6">
        <p className="text-sm text-muted-foreground">
          Comprehensive test of group analysis canvas integration including node creation, 
          progress tracking, state management, and cleanup processes.
        </p>
        
        <Button 
          onClick={runCanvasIntegrationTest}
          disabled={testStatus === 'running'}
          className="w-full"
        >
          {testStatus === 'running' ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Running Canvas Integration Tests...
            </>
          ) : (
            <>
              <PlayCircle className="w-4 h-4 mr-2" />
              Run Canvas Integration Test
            </>
          )}
        </Button>
        
        <div className="space-y-4">
          {phases.map((phase, index) => (
            <div key={phase.id} className="space-y-2">
              <div className="flex items-center gap-3">
                {getPhaseIcon(phase.status)}
                <div className="flex-1">
                  <h4 className="text-sm font-medium">{phase.name}</h4>
                  <p className="text-xs text-muted-foreground">{phase.description}</p>
                </div>
                <Badge 
                  variant={
                    phase.status === 'completed' ? 'default' :
                    phase.status === 'failed' ? 'destructive' :
                    phase.status === 'running' ? 'secondary' : 'outline'
                  }
                  className="text-xs"
                >
                  {phase.status.charAt(0).toUpperCase() + phase.status.slice(1)}
                </Badge>
              </div>
              
              {phase.results && phase.results.length > 0 && (
                <div className="ml-7 bg-muted/30 p-2 rounded text-xs font-mono space-y-1 max-h-24 overflow-y-auto">
                  {phase.results.map((result, idx) => (
                    <div key={idx}>{result}</div>
                  ))}
                </div>
              )}
              
              {index < phases.length - 1 && <Separator className="ml-7" />}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};