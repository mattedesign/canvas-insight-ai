import React from 'react';
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { MonitoringService } from './services/MonitoringService'
import { OptimizedPerformanceService } from './services/OptimizedPerformanceService'

// Initialize monitoring and optimized performance tracking
MonitoringService.initialize()
OptimizedPerformanceService.initialize()

// Ensure Inngest is the default dispatch mode
try {
  if (localStorage.getItem('DISPATCH_MODE') !== 'inngest') {
    localStorage.setItem('DISPATCH_MODE', 'inngest');
    console.info('[App] Default dispatch mode set to "inngest"');
  }
} catch (e) {
  console.warn('[App] Could not set default dispatch mode', e);
}

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
  OptimizedPerformanceService.cleanup()
  MonitoringService.cleanup()
})

// Simple error boundary for the root level
class RootErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error?: Error }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Root Error Boundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ 
          padding: '20px', 
          textAlign: 'center',
          fontFamily: 'system-ui, -apple-system, sans-serif'
        }}>
          <h1 style={{ color: '#ef4444' }}>Application Error</h1>
          <p>Something went wrong. Please refresh the page.</p>
          <button 
            onClick={() => window.location.reload()}
            style={{
              marginTop: '10px',
              padding: '10px 20px',
              backgroundColor: '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '5px',
              cursor: 'pointer'
            }}
          >
            Refresh Page
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

try {
  console.log('Starting React app...');
  const rootElement = document.getElementById("root");
  console.log('Root element found:', !!rootElement);
  
  if (!rootElement) {
    throw new Error('Root element not found');
  }
  
  createRoot(rootElement).render(
    <RootErrorBoundary>
      <App />
    </RootErrorBoundary>
  );
  console.log('React app started successfully');
} catch (error) {
  console.error('Error starting React app:', error);
}
