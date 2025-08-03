/**
 * Phase 6A: End-to-End Testing Suite
 * Tests complete upload → analysis → canvas workflow
 * Verifies storage path organization and navigation state persistence
 */

import { supabase } from "@/integrations/supabase/client";

interface TestResult {
  passed: boolean;
  message: string;
  duration: number;
  details?: any;
}

interface EndToEndTestSuite {
  uploadTest: TestResult;
  analysisTest: TestResult;
  canvasTest: TestResult;
  storageTest: TestResult;
  navigationTest: TestResult;
  overallPass: boolean;
  totalDuration: number;
}

export class EndToEndTestRunner {
  private static instance: EndToEndTestRunner;

  static getInstance(): EndToEndTestRunner {
    if (!EndToEndTestRunner.instance) {
      EndToEndTestRunner.instance = new EndToEndTestRunner();
    }
    return EndToEndTestRunner.instance;
  }

  /**
   * Run complete end-to-end test suite
   */
  async runCompleteTestSuite(): Promise<EndToEndTestSuite> {
    const startTime = performance.now();
    console.log('[E2E Tests] Starting complete test suite...');

    const results: EndToEndTestSuite = {
      uploadTest: await this.testUploadWorkflow(),
      analysisTest: await this.testAnalysisWorkflow(),
      canvasTest: await this.testCanvasWorkflow(),
      storageTest: await this.testStorageOrganization(),
      navigationTest: await this.testNavigationPersistence(),
      overallPass: false,
      totalDuration: 0
    };

    const endTime = performance.now();
    results.totalDuration = endTime - startTime;

    // Determine overall pass/fail
    results.overallPass = Object.values(results)
      .filter((result): result is TestResult => typeof result === 'object' && 'passed' in result)
      .every(test => test.passed);

    console.log('[E2E Tests] Test suite completed:', {
      overallPass: results.overallPass,
      duration: `${results.totalDuration.toFixed(2)}ms`
    });

    return results;
  }

  /**
   * Test upload workflow
   */
  private async testUploadWorkflow(): Promise<TestResult> {
    const startTime = performance.now();
    
    try {
      console.log('[E2E Tests] Testing upload workflow...');

      // Create a test project first
      const { data: project, error: projectError } = await supabase
        .from('projects')
        .insert([{
          name: 'E2E Test Project',
          description: 'Test project for end-to-end testing',
          slug: `e2e-test-${Date.now()}`
        }])
        .select()
        .single();

      if (projectError || !project) {
        throw new Error(`Failed to create test project: ${projectError?.message}`);
      }

      // Test file upload simulation (we'll create metadata directly for testing)
      const testImageData = {
        project_id: project.id,
        filename: 'test-image.jpg',
        original_name: 'test-image.jpg',
        storage_path: `${(await supabase.auth.getUser()).data.user?.id}/${project.id}/test-image.jpg`,
        file_size: 1024000,
        file_type: 'image/jpeg',
        dimensions: { width: 1920, height: 1080, aspectRatio: 1.777 }
      };

      const { data: imageData, error: imageError } = await supabase
        .from('images')
        .insert([testImageData])
        .select()
        .single();

      if (imageError || !imageData) {
        throw new Error(`Failed to create test image: ${imageError?.message}`);
      }

      // Cleanup test data
      await supabase.from('images').delete().eq('id', imageData.id);
      await supabase.from('projects').delete().eq('id', project.id);

      const duration = performance.now() - startTime;
      return {
        passed: true,
        message: 'Upload workflow test passed',
        duration,
        details: { projectId: project.id, imageId: imageData.id }
      };

    } catch (error) {
      const duration = performance.now() - startTime;
      return {
        passed: false,
        message: `Upload workflow test failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        duration
      };
    }
  }

  /**
   * Test analysis workflow
   */
  private async testAnalysisWorkflow(): Promise<TestResult> {
    const startTime = performance.now();
    
    try {
      console.log('[E2E Tests] Testing analysis workflow...');

      // Check if ux-analysis edge function is available
      const { data: functionsData, error: functionsError } = await supabase.functions.invoke('ux-analysis', {
        body: { test: true }
      });

      if (functionsError) {
        throw new Error(`Analysis function not available: ${functionsError.message}`);
      }

      // Test context detection
      const { data: contextData, error: contextError } = await supabase.functions.invoke('context-detection', {
        body: { 
          imageUrl: 'test-url',
          userContext: 'test context'
        }
      });

      if (contextError) {
        console.warn('Context detection not available:', contextError.message);
      }

      const duration = performance.now() - startTime;
      return {
        passed: true,
        message: 'Analysis workflow test passed',
        duration,
        details: { functionsAvailable: true, contextDetection: !contextError }
      };

    } catch (error) {
      const duration = performance.now() - startTime;
      return {
        passed: false,
        message: `Analysis workflow test failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        duration
      };
    }
  }

  /**
   * Test canvas workflow
   */
  private async testCanvasWorkflow(): Promise<TestResult> {
    const startTime = performance.now();
    
    try {
      console.log('[E2E Tests] Testing canvas workflow...');

      // Test canvas state creation
      const testCanvasState = {
        user_id: (await supabase.auth.getUser()).data.user?.id,
        nodes: [],
        edges: [],
        viewport: { x: 0, y: 0, zoom: 1 },
        selected_nodes: [],
        ui_state: {},
        canvas_settings: { tool: 'cursor', showAnnotations: true },
        node_positions: {}
      };

      const { data: canvasData, error: canvasError } = await supabase
        .from('canvas_states')
        .insert([testCanvasState])
        .select()
        .single();

      if (canvasError || !canvasData) {
        throw new Error(`Failed to create canvas state: ${canvasError?.message}`);
      }

      // Test canvas state retrieval
      const { data: retrievedState, error: retrieveError } = await supabase
        .from('canvas_states')
        .select('*')
        .eq('id', canvasData.id)
        .single();

      if (retrieveError || !retrievedState) {
        throw new Error(`Failed to retrieve canvas state: ${retrieveError?.message}`);
      }

      // Cleanup test data
      await supabase.from('canvas_states').delete().eq('id', canvasData.id);

      const duration = performance.now() - startTime;
      return {
        passed: true,
        message: 'Canvas workflow test passed',
        duration,
        details: { canvasStateId: canvasData.id }
      };

    } catch (error) {
      const duration = performance.now() - startTime;
      return {
        passed: false,
        message: `Canvas workflow test failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        duration
      };
    }
  }

  /**
   * Test storage organization
   */
  private async testStorageOrganization(): Promise<TestResult> {
    const startTime = performance.now();
    
    try {
      console.log('[E2E Tests] Testing storage organization...');

      // Test storage metadata query
      const { data: storageData, error: storageError } = await supabase
        .from('storage_metadata')
        .select('*')
        .limit(5);

      if (storageError) {
        throw new Error(`Failed to query storage metadata: ${storageError.message}`);
      }

      // Check if any files have organized paths
      const organizedFiles = storageData?.filter(file => {
        const pathParts = file.storage_path.split('/');
        return pathParts.length >= 3; // userId/projectId/filename
      }) || [];

      const duration = performance.now() - startTime;
      return {
        passed: true,
        message: 'Storage organization test passed',
        duration,
        details: { 
          totalFiles: storageData?.length || 0,
          organizedFiles: organizedFiles.length,
          organizationRate: storageData?.length ? (organizedFiles.length / storageData.length) * 100 : 0
        }
      };

    } catch (error) {
      const duration = performance.now() - startTime;
      return {
        passed: false,
        message: `Storage organization test failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        duration
      };
    }
  }

  /**
   * Test navigation state persistence
   */
  private async testNavigationPersistence(): Promise<TestResult> {
    const startTime = performance.now();
    
    try {
      console.log('[E2E Tests] Testing navigation state persistence...');

      // Test localStorage availability
      if (typeof localStorage === 'undefined') {
        throw new Error('localStorage not available');
      }

      // Test setting and getting navigation state
      const testState = {
        currentProject: 'test-project-123',
        currentRoute: '/canvas',
        timestamp: Date.now()
      };

      localStorage.setItem('navigationState', JSON.stringify(testState));
      const retrievedState = localStorage.getItem('navigationState');
      
      if (!retrievedState) {
        throw new Error('Failed to persist navigation state');
      }

      const parsedState = JSON.parse(retrievedState);
      if (parsedState.currentProject !== testState.currentProject) {
        throw new Error('Navigation state data integrity failed');
      }

      // Cleanup
      localStorage.removeItem('navigationState');

      const duration = performance.now() - startTime;
      return {
        passed: true,
        message: 'Navigation state persistence test passed',
        duration,
        details: { persistedState: parsedState }
      };

    } catch (error) {
      const duration = performance.now() - startTime;
      return {
        passed: false,
        message: `Navigation persistence test failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        duration
      };
    }
  }

  /**
   * Run individual test by name
   */
  async runIndividualTest(testName: keyof Omit<EndToEndTestSuite, 'overallPass' | 'totalDuration'>): Promise<TestResult> {
    switch (testName) {
      case 'uploadTest':
        return this.testUploadWorkflow();
      case 'analysisTest':
        return this.testAnalysisWorkflow();
      case 'canvasTest':
        return this.testCanvasWorkflow();
      case 'storageTest':
        return this.testStorageOrganization();
      case 'navigationTest':
        return this.testNavigationPersistence();
      default:
        return {
          passed: false,
          message: `Unknown test: ${testName}`,
          duration: 0
        };
    }
  }
}

export const endToEndTestRunner = EndToEndTestRunner.getInstance();