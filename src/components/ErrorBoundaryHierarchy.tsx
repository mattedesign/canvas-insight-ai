/**
 * ErrorBoundaryHierarchy - Hierarchical error boundaries for App → Route → Component levels
 * Phase 1, Step 1.1: Enhanced Error Boundary System
 */

import React, { ReactNode } from 'react';
import { ErrorRecoveryProvider } from './ErrorRecoveryProvider';

// App Level Error Boundary
interface AppErrorBoundaryProps {
  children: ReactNode;
  onRecovery?: () => void;
}

export const AppErrorBoundary: React.FC<AppErrorBoundaryProps> = ({ 
  children, 
  onRecovery 
}) => {
  const handleAppRecovery = () => {
    console.log('[AppErrorBoundary] App-level recovery initiated');
    // Clear any app-level state if needed
    if (onRecovery) {
      onRecovery();
    }
  };

  const handleAppStateRollback = () => {
    console.log('[AppErrorBoundary] App-level state rollback initiated');
    // Could trigger app state reset here
    // For now, reload as last resort
    window.location.reload();
  };

  return (
    <ErrorRecoveryProvider
      name="Application"
      enableRecovery={true}
      enableStateRollback={true}
      onRecovery={handleAppRecovery}
      onStateRollback={handleAppStateRollback}
    >
      {children}
    </ErrorRecoveryProvider>
  );
};

// Route Level Error Boundary
interface RouteErrorBoundaryProps {
  children: ReactNode;
  routeName: string;
  onRecovery?: () => void;
}

export const RouteErrorBoundary: React.FC<RouteErrorBoundaryProps> = ({ 
  children, 
  routeName,
  onRecovery 
}) => {
  const handleRouteRecovery = () => {
    console.log(`[RouteErrorBoundary:${routeName}] Route-level recovery initiated`);
    if (onRecovery) {
      onRecovery();
    }
  };

  const handleRouteStateRollback = () => {
    console.log(`[RouteErrorBoundary:${routeName}] Route-level state rollback initiated`);
    // Could clear route-specific state here
    // For now, navigate to home as fallback
    window.location.href = '/';
  };

  return (
    <ErrorRecoveryProvider
      name={`Route: ${routeName}`}
      enableRecovery={true}
      enableStateRollback={true}
      onRecovery={handleRouteRecovery}
      onStateRollback={handleRouteStateRollback}
    >
      {children}
    </ErrorRecoveryProvider>
  );
};

// Component Level Error Boundary
interface ComponentErrorBoundaryProps {
  children: ReactNode;
  componentName: string;
  fallbackUI?: ReactNode;
  onRecovery?: () => void;
}

export const ComponentErrorBoundary: React.FC<ComponentErrorBoundaryProps> = ({ 
  children, 
  componentName,
  fallbackUI,
  onRecovery 
}) => {
  const handleComponentRecovery = () => {
    console.log(`[ComponentErrorBoundary:${componentName}] Component-level recovery initiated`);
    if (onRecovery) {
      onRecovery();
    }
  };

  const handleComponentStateRollback = () => {
    console.log(`[ComponentErrorBoundary:${componentName}] Component-level state rollback initiated`);
    // Component-level rollback - just retry
    if (onRecovery) {
      onRecovery();
    }
  };

  return (
    <ErrorRecoveryProvider
      name={`Component: ${componentName}`}
      enableRecovery={true}
      enableStateRollback={false} // Components typically don't need state rollback
      onRecovery={handleComponentRecovery}
      onStateRollback={handleComponentStateRollback}
    >
      {children}
    </ErrorRecoveryProvider>
  );
};

// Feature Level Error Boundary (for specific features within components)
interface FeatureErrorBoundaryProps {
  children: ReactNode;
  featureName: string;
  fallbackUI?: ReactNode;
  onRecovery?: () => void;
}

export const FeatureErrorBoundary: React.FC<FeatureErrorBoundaryProps> = ({ 
  children, 
  featureName,
  fallbackUI,
  onRecovery 
}) => {
  const handleFeatureRecovery = () => {
    console.log(`[FeatureErrorBoundary:${featureName}] Feature-level recovery initiated`);
    if (onRecovery) {
      onRecovery();
    }
  };

  return (
    <ErrorRecoveryProvider
      name={`Feature: ${featureName}`}
      enableRecovery={true}
      enableStateRollback={false}
      onRecovery={handleFeatureRecovery}
    >
      {children}
    </ErrorRecoveryProvider>
  );
};

// Convenience wrapper for the full hierarchy
interface ErrorBoundaryWrapperProps {
  children: ReactNode;
  routeName?: string;
  componentName?: string;
  featureName?: string;
  onAppRecovery?: () => void;
  onRouteRecovery?: () => void;
  onComponentRecovery?: () => void;
  onFeatureRecovery?: () => void;
}

export const ErrorBoundaryWrapper: React.FC<ErrorBoundaryWrapperProps> = ({
  children,
  routeName,
  componentName,
  featureName,
  onAppRecovery,
  onRouteRecovery,
  onComponentRecovery,
  onFeatureRecovery
}) => {
  let wrapped = children;

  // Wrap from innermost to outermost
  if (featureName) {
    wrapped = (
      <FeatureErrorBoundary 
        featureName={featureName}
        onRecovery={onFeatureRecovery}
      >
        {wrapped}
      </FeatureErrorBoundary>
    );
  }

  if (componentName) {
    wrapped = (
      <ComponentErrorBoundary 
        componentName={componentName}
        onRecovery={onComponentRecovery}
      >
        {wrapped}
      </ComponentErrorBoundary>
    );
  }

  if (routeName) {
    wrapped = (
      <RouteErrorBoundary 
        routeName={routeName}
        onRecovery={onRouteRecovery}
      >
        {wrapped}
      </RouteErrorBoundary>
    );
  }

  return (
    <AppErrorBoundary onRecovery={onAppRecovery}>
      {wrapped}
    </AppErrorBoundary>
  );
};