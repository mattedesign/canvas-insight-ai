import React, { Suspense, lazy } from "react";
import { useEffect, useRef } from 'react';
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { FinalAppProvider } from "./context/FinalAppContext";
import { AuthProvider } from "./context/AuthContext";
import { AIProvider } from "./context/AIContext";
// Performance monitoring disabled for production
import { RouteErrorBoundary } from "./components/RouteErrorBoundary";

import { LoadingSpinner } from "./components/LoadingSpinner";
import ProtectedRoute from "./components/ProtectedRoute";

// Lazy load pages for better performance and reduced initial bundle size
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Canvas = lazy(() => import("./pages/SimplifiedCanvas"));
const Projects = lazy(() => import("./pages/Projects"));
const Analytics = lazy(() => import("./pages/Analytics"));
const Subscription = lazy(() => import("./pages/Subscription"));
const Auth = lazy(() => import("./pages/Auth"));

const ProductionReadiness = lazy(() => import("./pages/ProductionReadiness"));
// Performance testing dashboard removed for production
const VerificationTests = lazy(() => import("./pages/VerificationTests"));
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient();

// Emergency render monitoring removed - performance optimized

const App = () => {
  return (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
      <AuthProvider>
        <AIProvider>
          <FinalAppProvider>
            
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
                {/* Testing routes removed for production optimization */}
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
          </FinalAppProvider>
        </AIProvider>
      </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
  );
};

export default App;
