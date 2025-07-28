import React, { useState } from 'react';
import { Sidebar } from '@/components/Sidebar';
import { SummaryDashboard } from '@/components/summary/SummaryDashboard';
import { SubscriptionManagement } from '@/components/SubscriptionManagement';
import { useAppContext } from '@/context/AppContext';
import { useAuth } from '@/context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useDashboardMetrics } from '@/hooks/useDashboardMetrics';
import { Button } from '@/components/ui/button';
import { CreditCard, BarChart3 } from 'lucide-react';

const Dashboard = () => {
  const navigate = useNavigate();
  const [activeView, setActiveView] = useState<'summary' | 'subscription'>('summary');
  const { 
    uploadedImages, 
    analyses, 
    selectedImageId,
    showAnnotations,
    handleClearCanvas,
    handleImageSelect,
    handleToggleAnnotations
  } = useAppContext();
  const { subscription } = useAuth();

  const { metrics, loading, error, refreshMetrics } = useDashboardMetrics();

  const handleAddImages = () => {
    navigate('/canvas');
  };

  const handleNavigateToPreviousAnalyses = () => {
    navigate('/projects');
  };

  return (
    <div className="flex h-screen bg-background">
      <Sidebar 
        onClearCanvas={handleClearCanvas}
        onAddImages={handleAddImages}
        uploadedImages={uploadedImages}
        analyses={analyses}
        selectedView={activeView === 'subscription' ? 'summary' : activeView}
        onViewChange={(view) => {
          if (view === 'summary' || view === 'subscription') {
            setActiveView(view);
          }
        }}
        selectedImageId={selectedImageId}
        onImageSelect={handleImageSelect}
        showAnnotations={showAnnotations}
        onToggleAnnotations={handleToggleAnnotations}
        onNavigateToPreviousAnalyses={handleNavigateToPreviousAnalyses}
      />
      
      <div className="flex-1 flex flex-col">
        {/* Top Navigation */}
        <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="flex h-14 items-center px-6 gap-4">
            <Button
              variant={activeView === 'summary' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setActiveView('summary')}
              className="flex items-center gap-2"
            >
              <BarChart3 className="h-4 w-4" />
              Analytics
            </Button>
            <Button
              variant={activeView === 'subscription' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setActiveView('subscription')}
              className="flex items-center gap-2"
            >
              <CreditCard className="h-4 w-4" />
              Subscription
            </Button>
            
            {/* Subscription Status Badge */}
            {subscription && (
              <div className="ml-auto text-sm text-muted-foreground">
                {subscription.subscription_tier.charAt(0).toUpperCase() + subscription.subscription_tier.slice(1)} Plan
                {subscription.analysis_limit !== -1 && (
                  <span className="ml-2">
                    ({subscription.analysis_count}/{subscription.analysis_limit} analyses)
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-auto">
          {activeView === 'summary' ? (
            <SummaryDashboard 
              analyses={analyses}
              metrics={metrics}
              loading={loading}
              error={error}
              onRefresh={refreshMetrics}
            />
          ) : (
            <div className="p-6">
              <SubscriptionManagement 
                onSubscriptionChange={() => {
                  refreshMetrics();
                }}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;