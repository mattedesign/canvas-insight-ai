import { useState, useCallback, useRef } from 'react';
import SystemIntegrationTester, { SystemIntegrationResults, TestResult } from '@/services/SystemIntegrationTester';

interface UseSystemIntegrationTestsReturn {
  results: SystemIntegrationResults | null;
  isRunning: boolean;
  runTests: () => Promise<void>;
  runSpecificTest: (category: keyof Omit<SystemIntegrationResults, 'overall'>) => Promise<void>;
  clearResults: () => void;
  lastRunTime: Date | null;
  testProgress: {
    current: number;
    total: number;
    currentTest: string;
  };
}

export function useSystemIntegrationTests(): UseSystemIntegrationTestsReturn {
  const [results, setResults] = useState<SystemIntegrationResults | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [lastRunTime, setLastRunTime] = useState<Date | null>(null);
  const [testProgress, setTestProgress] = useState({
    current: 0,
    total: 0,
    currentTest: ''
  });
  
  const testerRef = useRef<SystemIntegrationTester>();

  const getTester = useCallback(() => {
    if (!testerRef.current) {
      testerRef.current = new SystemIntegrationTester();
    }
    return testerRef.current;
  }, []);

  const runTests = useCallback(async () => {
    if (isRunning) return;

    setIsRunning(true);
    setTestProgress({ current: 0, total: 5, currentTest: 'Initializing...' });

    try {
      const tester = getTester();
      
      // Simulate progress updates
      const progressSteps = [
        'Testing Error Boundaries...',
        'Validating State Management...',
        'Testing Routing System...',
        'Checking Performance...',
        'Running Integration Tests...'
      ];

      for (let i = 0; i < progressSteps.length; i++) {
        setTestProgress({
          current: i + 1,
          total: progressSteps.length,
          currentTest: progressSteps[i]
        });
        await new Promise(resolve => setTimeout(resolve, 500)); // Small delay for UX
      }

      const testResults = await tester.runAllTests();
      setResults(testResults);
      setLastRunTime(new Date());
      
      console.log('🧪 Integration Test Results:', testResults);
    } catch (error) {
      console.error('Failed to run integration tests:', error);
      setResults({
        errorBoundaries: [],
        stateManagement: [],
        routing: [],
        performance: [],
        integration: [],
        overall: {
          status: 'critical',
          score: 0,
          summary: `Test execution failed: ${error}`
        }
      });
    } finally {
      setIsRunning(false);
      setTestProgress({ current: 0, total: 0, currentTest: '' });
    }
  }, [isRunning, getTester]);

  const runSpecificTest = useCallback(async (category: keyof Omit<SystemIntegrationResults, 'overall'>) => {
    if (isRunning) return;

    setIsRunning(true);
    setTestProgress({ current: 1, total: 1, currentTest: `Testing ${category}...` });

    try {
      const tester = getTester();
      
      // Run only specific category
      if (category === 'errorBoundaries') {
        await (tester as any).testErrorBoundaries();
      } else if (category === 'stateManagement') {
        await (tester as any).testStateManagement();
      } else if (category === 'routing') {
        await (tester as any).testRouting();
      } else if (category === 'performance') {
        await (tester as any).testPerformance();
      } else if (category === 'integration') {
        await (tester as any).testIntegration();
      }

      const updatedResults = tester.getResults();
      setResults(updatedResults);
      setLastRunTime(new Date());
    } catch (error) {
      console.error(`Failed to run ${category} tests:`, error);
    } finally {
      setIsRunning(false);
      setTestProgress({ current: 0, total: 0, currentTest: '' });
    }
  }, [isRunning, getTester]);

  const clearResults = useCallback(() => {
    setResults(null);
    setLastRunTime(null);
    testerRef.current = undefined;
  }, []);

  return {
    results,
    isRunning,
    runTests,
    runSpecificTest,
    clearResults,
    lastRunTime,
    testProgress
  };
}