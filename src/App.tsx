import React, { Suspense, lazy } from "react";
import { useEffect, useRef } from 'react';
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AppProvider } from "./context/SimplifiedAppContext";
import { AuthProvider } from "./context/AuthContext";
import { AIProvider } from "./context/AIContext";
import { PerformanceMonitor } from "./components/PerformanceMonitor";
import { RouteErrorBoundary } from "./components/RouteErrorBoundary";

import { LoadingSpinner } from "./components/LoadingSpinner";
import ProtectedRoute from "./components/ProtectedRoute";

// Lazy load pages for better performance and reduced initial bundle size
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Canvas = lazy(() => import("./pages/Canvas"));
const Projects = lazy(() => import("./pages/Projects"));
const Analytics = lazy(() => import("./pages/Analytics"));
const Subscription = lazy(() => import("./pages/Subscription"));
const Auth = lazy(() => import("./pages/Auth"));

const ProductionReadiness = lazy(() => import("./pages/ProductionReadiness"));
const PerformanceTestingDashboard = lazy(() => import("./pages/PerformanceTestingDashboard"));
const VerificationTests = lazy(() => import("./pages/VerificationTests"));
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient();

// Emergency render count monitor - stops infinite loops
const useEmergencyLoopStopper = (componentName: string) => {
  const renderCount = useRef(0);
  const lastRenderTime = useRef(Date.now());
  
  useEffect(() => {
    renderCount.current++;
    const currentTime = Date.now();
    const timeSinceLastRender = currentTime - lastRenderTime.current;
    
    // If more than 50 renders in 1 second, throw error to stop the app
    if (renderCount.current > 50 && timeSinceLastRender < 1000) {
      console.error(`🚨 INFINITE LOOP DETECTED in ${componentName}!`);
      console.error(`Render count: ${renderCount.current} in ${timeSinceLastRender}ms`);
      
      // Nuclear option - reload the page after 2 seconds
      setTimeout(() => {
        window.location.reload();
      }, 2000);
      
      throw new Error(`STOPPED: Infinite loop in ${componentName} - ${renderCount.current} renders`);
    }
    
    // Reset counter every second
    if (timeSinceLastRender > 1000) {
      renderCount.current = 0;
      lastRenderTime.current = currentTime;
    }
  });
  
  // Log excessive renders as warning
  if (renderCount.current > 10) {
    console.warn(`⚠️ High render count in ${componentName}: ${renderCount.current}`);
  }
};

const App = () => {
  useEmergencyLoopStopper('App');
  
  return (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
      <AuthProvider>
        <AIProvider>
          <AppProvider>
            
            <Suspense fallback={
              <div className="min-h-screen flex items-center justify-center bg-background">
                <LoadingSpinner />
              </div>
            }>
              <Routes>
                <Route path="/auth" element={
                  <RouteErrorBoundary routeName="Auth" fallbackRoute="/">
                    <Auth />
                  </RouteErrorBoundary>
                } />
                <Route path="/" element={
                  <RouteErrorBoundary routeName="Dashboard" fallbackRoute="/auth">
                    <ProtectedRoute>
                      <Dashboard />
                    </ProtectedRoute>
                  </RouteErrorBoundary>
                } />
                <Route path="/dashboard" element={
                  <RouteErrorBoundary routeName="Dashboard" fallbackRoute="/">
                    <ProtectedRoute>
                      <Dashboard />
                    </ProtectedRoute>
                  </RouteErrorBoundary>
                } />
                <Route path="/canvas" element={
                  <RouteErrorBoundary routeName="Canvas" fallbackRoute="/dashboard">
                    <ProtectedRoute>
                      <Canvas />
                    </ProtectedRoute>
                  </RouteErrorBoundary>
                } />
                <Route path="/canvas/:projectSlug" element={
                  <RouteErrorBoundary routeName="Canvas Project" fallbackRoute="/projects">
                    <ProtectedRoute>
                      <Canvas />
                    </ProtectedRoute>
                  </RouteErrorBoundary>
                } />
                <Route path="/projects" element={
                  <RouteErrorBoundary routeName="Projects" fallbackRoute="/dashboard">
                    <ProtectedRoute>
                      <Projects />
                    </ProtectedRoute>
                  </RouteErrorBoundary>
                } />
                <Route path="/analytics" element={
                  <RouteErrorBoundary routeName="Analytics" fallbackRoute="/dashboard">
                    <ProtectedRoute>
                      <Analytics />
                    </ProtectedRoute>
                  </RouteErrorBoundary>
                } />
                <Route path="/subscription" element={
                  <RouteErrorBoundary routeName="Subscription" fallbackRoute="/dashboard">
                    <ProtectedRoute>
                      <Subscription />
                    </ProtectedRoute>
                  </RouteErrorBoundary>
                } />
                <Route path="/production" element={
                  <RouteErrorBoundary routeName="Production" fallbackRoute="/dashboard">
                    <ProtectedRoute>
                      <ProductionReadiness />
                    </ProtectedRoute>
                  </RouteErrorBoundary>
                } />
                <Route path="/testing" element={
                  <RouteErrorBoundary routeName="Testing" fallbackRoute="/dashboard">
                    <ProtectedRoute>
                      <PerformanceTestingDashboard />
                    </ProtectedRoute>
                  </RouteErrorBoundary>
                } />
                <Route path="/verification" element={
                  <RouteErrorBoundary routeName="Verification" fallbackRoute="/dashboard">
                    <ProtectedRoute>
                      <VerificationTests />
                    </ProtectedRoute>
                  </RouteErrorBoundary>
                } />
                {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                <Route path="*" element={
                  <RouteErrorBoundary routeName="NotFound" fallbackRoute="/">
                    <NotFound />
                  </RouteErrorBoundary>
                } />
              </Routes>
            </Suspense>
          </AppProvider>
        </AIProvider>
      </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
  );
};

export default App;
