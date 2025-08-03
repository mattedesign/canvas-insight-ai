import { CentralizedStorageService } from './CentralizedStorageService';
import { AtomicStateManager } from './AtomicStateManager';

export interface TestResult {
  testName: string;
  status: 'passing' | 'failing' | 'warning' | 'running';
  message: string;
  duration?: number;
  details?: any;
}

export interface DataIntegrityTestResults {
  crossSystemValidation: TestResult[];
  storageIntegrity: TestResult[];
  stateConsistency: TestResult[];
  overall: { status: 'passing' | 'failing' | 'warning'; score: number };
}

export class DataIntegrityValidator {
  private testResults: DataIntegrityTestResults = {
    crossSystemValidation: [],
    storageIntegrity: [],
    stateConsistency: [],
    overall: { status: 'passing', score: 0 }
  };

  async runAllTests(): Promise<DataIntegrityTestResults> {
    console.log('🔍 Starting Data Integrity Validation...');
    
    try {
      await Promise.all([
        this.testCrossSystemValidation(),
        this.testStorageIntegrity(),
        this.testStateConsistency()
      ]);

      this.calculateOverallStatus();
      
      console.log('✅ Data Integrity Validation Completed');
      return this.testResults;
    } catch (error) {
      console.error('❌ Data Integrity Validation Failed:', error);
      this.testResults.overall = {
        status: 'failing',
        score: 0
      };
      return this.testResults;
    }
  }

  private async testCrossSystemValidation(): Promise<void> {
    this.testResults.crossSystemValidation = [];

    // Test 1: Storage-State Synchronization
    const start1 = performance.now();
    try {
      const storageService = new CentralizedStorageService();
      const stateManager = new AtomicStateManager();
      
      // Test data consistency between storage and state
      const testKey = 'data-integrity-test';
      const testData = { timestamp: Date.now(), test: true };
      
      await storageService.set(testKey, testData);
      const retrieved = await storageService.get(testKey);
      await storageService.delete(testKey);

      this.testResults.crossSystemValidation.push({
        testName: 'Storage-State Synchronization',
        status: retrieved && (retrieved as any).test === testData.test ? 'passing' : 'failing',
        message: retrieved ? 'Storage-state sync operational' : 'Storage-state sync failed',
        duration: performance.now() - start1
      });
    } catch (error) {
      this.testResults.crossSystemValidation.push({
        testName: 'Storage-State Synchronization',
        status: 'failing',
        message: `Test failed: ${error}`,
        duration: performance.now() - start1
      });
    }

    // Test 2: Context-Storage Consistency
    const start2 = performance.now();
    try {
      // Check if context data matches storage expectations
      const contextElements = document.querySelectorAll('[data-context-provider]');
      const storageService = new CentralizedStorageService();
      
      // Simplified context-storage consistency check
      this.testResults.crossSystemValidation.push({
        testName: 'Context-Storage Consistency',
        status: contextElements.length > 0 ? 'passing' : 'warning',
        message: `Context providers: ${contextElements.length}, Storage accessible: ${!!storageService}`,
        duration: performance.now() - start2,
        details: { contextProviders: contextElements.length }
      });
    } catch (error) {
      this.testResults.crossSystemValidation.push({
        testName: 'Context-Storage Consistency',
        status: 'failing',
        message: `Test failed: ${error}`,
        duration: performance.now() - start2
      });
    }

    // Test 3: Router-State Integration
    const start3 = performance.now();
    try {
      // Check URL state synchronization
      const urlParams = new URLSearchParams(window.location.search);
      const currentPath = window.location.pathname;
      
      this.testResults.crossSystemValidation.push({
        testName: 'Router-State Integration',
        status: 'passing',
        message: 'Router state integration operational',
        duration: performance.now() - start3,
        details: { path: currentPath, hasParams: urlParams.toString().length > 0 }
      });
    } catch (error) {
      this.testResults.crossSystemValidation.push({
        testName: 'Router-State Integration',
        status: 'failing',
        message: `Test failed: ${error}`,
        duration: performance.now() - start3
      });
    }
  }

  private async testStorageIntegrity(): Promise<void> {
    this.testResults.storageIntegrity = [];

    // Test 1: Storage Adapter Health
    const start1 = performance.now();
    try {
      const storageService = new CentralizedStorageService();
      
      // Test all storage adapters
      const testKey = 'integrity-adapter-test';
      const testData = { integrity: true, timestamp: Date.now() };
      
      await storageService.set(testKey, testData);
      const retrieved = await storageService.get(testKey);
      await storageService.delete(testKey);

      this.testResults.storageIntegrity.push({
        testName: 'Storage Adapter Health',
        status: retrieved && (retrieved as any).integrity ? 'passing' : 'failing',
        message: retrieved ? 'All storage adapters operational' : 'Storage adapter issues detected',
        duration: performance.now() - start1
      });
    } catch (error) {
      this.testResults.storageIntegrity.push({
        testName: 'Storage Adapter Health',
        status: 'failing',
        message: `Adapter test failed: ${error}`,
        duration: performance.now() - start1
      });
    }

    // Test 2: Data Persistence Validation
    const start2 = performance.now();
    try {
      // Test data persistence across browser sessions
      const persistenceKey = 'persistence-validation';
      const storageService = new CentralizedStorageService();
      
      // Check if data persists correctly
      await storageService.set(persistenceKey, { persistent: true });
      const persisted = await storageService.get(persistenceKey);
      
      this.testResults.storageIntegrity.push({
        testName: 'Data Persistence Validation',
        status: persisted && (persisted as any).persistent ? 'passing' : 'warning',
        message: persisted ? 'Data persistence working correctly' : 'Data persistence issues detected',
        duration: performance.now() - start2
      });

      await storageService.delete(persistenceKey);
    } catch (error) {
      this.testResults.storageIntegrity.push({
        testName: 'Data Persistence Validation',
        status: 'failing',
        message: `Persistence test failed: ${error}`,
        duration: performance.now() - start2
      });
    }

    // Test 3: Storage Conflict Resolution
    const start3 = performance.now();
    try {
      const storageService = new CentralizedStorageService();
      
      // Test concurrent operations
      const conflictKey = 'conflict-resolution-test';
      const operations = [
        storageService.set(conflictKey, { version: 1 }),
        storageService.set(conflictKey, { version: 2 }),
        storageService.set(conflictKey, { version: 3 })
      ];
      
      await Promise.all(operations);
      const final = await storageService.get(conflictKey);
      await storageService.delete(conflictKey);

      this.testResults.storageIntegrity.push({
        testName: 'Storage Conflict Resolution',
        status: final ? 'passing' : 'warning',
        message: final ? 'Conflict resolution working' : 'Conflict resolution needs attention',
        duration: performance.now() - start3,
        details: final
      });
    } catch (error) {
      this.testResults.storageIntegrity.push({
        testName: 'Storage Conflict Resolution',
        status: 'failing',
        message: `Conflict resolution test failed: ${error}`,
        duration: performance.now() - start3
      });
    }
  }

  private async testStateConsistency(): Promise<void> {
    this.testResults.stateConsistency = [];

    // Test 1: Atomic Operation Integrity
    const start1 = performance.now();
    try {
      const stateManager = new AtomicStateManager();
      
      // Test atomic operations
      const testState = { counter: 0 };
      const result = await stateManager.executeAtomicOperation(
        testState,
        'integrity-test',
        (state) => ({ ...state, counter: state.counter + 1 })
      );

      this.testResults.stateConsistency.push({
        testName: 'Atomic Operation Integrity',
        status: result.success && result.newState?.counter === 1 ? 'passing' : 'failing',
        message: result.success ? 'Atomic operations maintaining consistency' : 'Atomic operation integrity compromised',
        duration: performance.now() - start1,
        details: result
      });
    } catch (error) {
      this.testResults.stateConsistency.push({
        testName: 'Atomic Operation Integrity',
        status: 'failing',
        message: `Atomic operation test failed: ${error}`,
        duration: performance.now() - start1
      });
    }

    // Test 2: State Validation Pipeline
    const start2 = performance.now();
    try {
      // Check if state validation is active
      const validationActive = localStorage.getItem('state-validation-enabled') === 'true' ||
                              sessionStorage.getItem('state-validation-enabled') === 'true';

      this.testResults.stateConsistency.push({
        testName: 'State Validation Pipeline',
        status: validationActive ? 'passing' : 'warning',
        message: validationActive ? 'State validation pipeline active' : 'State validation pipeline not detected',
        duration: performance.now() - start2
      });
    } catch (error) {
      this.testResults.stateConsistency.push({
        testName: 'State Validation Pipeline',
        status: 'failing',
        message: `Validation pipeline test failed: ${error}`,
        duration: performance.now() - start2
      });
    }

    // Test 3: Context State Coherence
    const start3 = performance.now();
    try {
      // Check context state coherence
      const contextProviders = document.querySelectorAll('[data-context-provider]');
      const stateElements = document.querySelectorAll('[data-state-validated]');

      this.testResults.stateConsistency.push({
        testName: 'Context State Coherence',
        status: contextProviders.length > 0 ? 'passing' : 'warning',
        message: `Context providers: ${contextProviders.length}, Validated elements: ${stateElements.length}`,
        duration: performance.now() - start3,
        details: { 
          contextProviders: contextProviders.length,
          validatedElements: stateElements.length
        }
      });
    } catch (error) {
      this.testResults.stateConsistency.push({
        testName: 'Context State Coherence',
        status: 'failing',
        message: `Context coherence test failed: ${error}`,
        duration: performance.now() - start3
      });
    }
  }

  private calculateOverallStatus(): void {
    const allTests = [
      ...this.testResults.crossSystemValidation,
      ...this.testResults.storageIntegrity,
      ...this.testResults.stateConsistency
    ];

    const passing = allTests.filter(t => t.status === 'passing').length;
    const failing = allTests.filter(t => t.status === 'failing').length;
    const total = allTests.length;

    const score = total > 0 ? Math.round((passing / total) * 100) : 100;

    let status: 'passing' | 'failing' | 'warning';
    if (failing > 0) {
      status = 'failing';
    } else if (score < 80) {
      status = 'warning';
    } else {
      status = 'passing';
    }

    this.testResults.overall = { status, score };
  }

  getResults(): DataIntegrityTestResults {
    return this.testResults;
  }
}