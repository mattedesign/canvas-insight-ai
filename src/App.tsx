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
import { useInngestJobEmitter } from "./hooks/useInngestJobEmitter";


import { LoadingSpinner } from "./components/LoadingSpinner";
import ProtectedRoute from "./components/ProtectedRoute";
import AdminOnlyRoute from "./components/AdminOnlyRoute";

// Lazy load pages for better performance and reduced initial bundle size
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Canvas = lazy(() => import("./pages/SimplifiedCanvas"));
const Projects = lazy(() => import("./pages/Projects"));
const Analytics = lazy(() => import("./pages/Analytics"));
const Subscription = lazy(() => import("./pages/Subscription"));
const Auth = lazy(() => import("./pages/Auth"));
const Admin = lazy(() => import("./pages/Admin"));

const ProductionReadiness = lazy(() => import("./pages/ProductionReadiness"));
// Performance testing dashboard removed for production
const VerificationTests = lazy(() => import("./pages/VerificationTests"));
const UploadPipelineTests = lazy(() => import("./pages/UploadPipelineTests"));
const NotFound = lazy(() => import("./pages/NotFound"));
const GroupAnalysisTestingPage = lazy(() => import("./pages/GroupAnalysisTestingPage"));
const AnalysisV2 = lazy(() => import("./pages/AnalysisV2"));
const GroupAnalysisV2 = lazy(() => import("./pages/GroupAnalysisV2"));
const JobStatus = lazy(() => import("./pages/JobStatus"));

const queryClient = new QueryClient();

// Emergency render monitoring removed - performance optimized

const App = () => {
  console.log('App component rendering...');
  useInngestJobEmitter();
  try {
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
                    <Route path="/admin" element={
                      <RouteErrorBoundary routeName="Admin" fallbackRoute="/dashboard">
                        <AdminOnlyRoute>
                          <Admin />
                        </AdminOnlyRoute>
                      </RouteErrorBoundary>
                    } />
                    <Route path="/subscription" element={
                      <RouteErrorBoundary routeName="Subscription" fallbackRoute="/dashboard">
                        <ProtectedRoute>
                          <Subscription />
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
                     <Route path="/upload-pipeline-tests" element={
                       <RouteErrorBoundary routeName="UploadPipelineTests" fallbackRoute="/dashboard">
                         <ProtectedRoute>
                           <UploadPipelineTests />
                         </ProtectedRoute>
                       </RouteErrorBoundary>
                     } />
{/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
<Route path="/analysis-v2" element={
  <RouteErrorBoundary routeName="AnalysisV2" fallbackRoute="/dashboard">
    <ProtectedRoute>
      <AnalysisV2 />
    </ProtectedRoute>
  </RouteErrorBoundary>
} />
<Route path="/group-analysis-v2" element={
  <RouteErrorBoundary routeName="GroupAnalysisV2" fallbackRoute="/dashboard">
    <ProtectedRoute>
      <GroupAnalysisV2 />
    </ProtectedRoute>
  </RouteErrorBoundary>
} />
<Route path="/dev/group-analysis-test" element={
  <RouteErrorBoundary routeName="GroupAnalysisTest" fallbackRoute="/dashboard">
    <ProtectedRoute>
      <GroupAnalysisTestingPage />
    </ProtectedRoute>
  </RouteErrorBoundary>
} />
<Route path="/job/:jobId" element={
  <RouteErrorBoundary routeName="JobStatus" fallbackRoute="/dashboard">
    <ProtectedRoute>
      <JobStatus />
    </ProtectedRoute>
  </RouteErrorBoundary>
} />
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
  } catch (error) {
    console.error('Error in App component:', error);
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-destructive mb-4">Application Error</h1>
          <p className="text-muted-foreground mb-4">Something went wrong loading the application.</p>
          <button 
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90"
          >
            Reload
          </button>
        </div>
      </div>
    );
  }
};

export default App;
