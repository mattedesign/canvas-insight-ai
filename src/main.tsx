import React from 'react';
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { MonitoringService } from './services/MonitoringService'
import { PerformanceOptimizationService } from './services/PerformanceOptimizationService'
import { ErrorRecoveryBoundary } from './components/ErrorRecoveryBoundary'
import { DataValidationProvider } from './components/DataValidationProvider'

// Initialize monitoring and performance optimization as early as possible
MonitoringService.initialize()
PerformanceOptimizationService.initialize()

createRoot(document.getElementById("root")!).render(
  <ErrorRecoveryBoundary>
    <DataValidationProvider>
      <App />
    </DataValidationProvider>
  </ErrorRecoveryBoundary>
);
