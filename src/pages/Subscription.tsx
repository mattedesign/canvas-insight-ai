import React from 'react';
import { Sidebar } from '@/components/Sidebar';
import { SubscriptionManagement } from '@/components/SubscriptionManagement';
import { useSimplifiedAppContext } from '@/context/SimplifiedAppContext';
import { useAuth } from '@/context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useDashboardMetrics } from '@/hooks/useDashboardMetrics';

const Subscription = () => {
  const navigate = useNavigate();
  const { 
    state: {
      uploadedImages,
      analyses,
      selectedImageId,
      showAnnotations
    },
    stableHelpers: { clearCanvas }
  } = useSimplifiedAppContext();

  // Create missing handler functions
  const handleClearCanvas = () => clearCanvas();
  const handleImageSelect = (imageId: string) => {
    // This would normally dispatch an action, but for subscription page it's not needed
    console.log('Image selected:', imageId);
  };
  const handleToggleAnnotations = () => {
    // This would normally dispatch an action, but for subscription page it's not needed  
    console.log('Toggle annotations');
  };
  const { subscription } = useAuth();

  const { refreshMetrics } = useDashboardMetrics();

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
        selectedView="subscription"
        onViewChange={() => {}}
        selectedImageId={selectedImageId}
        onImageSelect={handleImageSelect}
        showAnnotations={showAnnotations}
        onToggleAnnotations={handleToggleAnnotations}
        onNavigateToPreviousAnalyses={handleNavigateToPreviousAnalyses}
      />
      
      <div className="flex-1 flex flex-col">
        {/* Page Header */}
        <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="flex h-14 items-center px-6 gap-4">
            <h1 className="text-lg font-semibold">Subscription Management</h1>
            
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
          <div className="p-6">
            <SubscriptionManagement 
              onSubscriptionChange={() => {
                refreshMetrics();
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Subscription;