import React from "react";
import { useEffect, useRef } from 'react';
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { SimplifiedAppProvider } from "./context/SimplifiedAppContext";
import { AuthProvider } from "./context/AuthContext";
import { AIProvider } from "./context/AIContext";
import { PerformanceMonitor } from "./components/PerformanceMonitor";
import { RenderDiagnostic } from "./components/RenderDiagnostic";
import ProtectedRoute from "./components/ProtectedRoute";
import Dashboard from "./pages/Dashboard";
import Canvas from "./pages/Canvas";
import Projects from "./pages/Projects";
import Analytics from "./pages/Analytics";
import Subscription from "./pages/Subscription";
import Auth from "./pages/Auth";
import TestOpenAI from "./pages/TestOpenAI";
import ProductionReadiness from "./pages/ProductionReadiness";
import PerformanceTestingDashboard from "./pages/PerformanceTestingDashboard";
import NotFound from "./pages/NotFound";

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
          <SimplifiedAppProvider>
            <RenderDiagnostic />
            <PerformanceMonitor componentName="App" />
            <Routes>
              <Route path="/auth" element={<Auth />} />
              <Route path="/" element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              } />
              <Route path="/dashboard" element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              } />
              <Route path="/canvas" element={
                <ProtectedRoute>
                  <Canvas />
                </ProtectedRoute>
              } />
              <Route path="/canvas/:projectSlug" element={
                <ProtectedRoute>
                  <Canvas />
                </ProtectedRoute>
              } />
              <Route path="/projects" element={
                <ProtectedRoute>
                  <Projects />
                </ProtectedRoute>
              } />
              <Route path="/analytics" element={
                <ProtectedRoute>
                  <Analytics />
                </ProtectedRoute>
              } />
              <Route path="/subscription" element={
                <ProtectedRoute>
                  <Subscription />
                </ProtectedRoute>
              } />
              <Route path="/test-openai" element={
                <ProtectedRoute>
                  <TestOpenAI />
                </ProtectedRoute>
              } />
              <Route path="/production" element={
                <ProtectedRoute>
                  <ProductionReadiness />
                </ProtectedRoute>
              } />
              <Route path="/testing" element={
                <ProtectedRoute>
                  <PerformanceTestingDashboard />
                </ProtectedRoute>
              } />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </SimplifiedAppProvider>
        </AIProvider>
      </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
  );
};

export default App;
