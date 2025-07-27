import React from 'react';
import { Sidebar } from '@/components/Sidebar';
import { SummaryDashboard } from '@/components/summary/SummaryDashboard';
import { useAppContext } from '@/context/AppContext';
import { useNavigate } from 'react-router-dom';
import { useDashboardMetrics } from '@/hooks/useDashboardMetrics';

const Dashboard = () => {
  const navigate = useNavigate();
  const { 
    uploadedImages, 
    analyses, 
    selectedImageId,
    showAnnotations,
    handleClearCanvas,
    handleImageSelect,
    handleToggleAnnotations
  } = useAppContext();

  const { metrics, loading, error, refreshMetrics } = useDashboardMetrics();

  const handleAddImages = () => {
    navigate('/upload');
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
        selectedView="summary"
        onViewChange={() => {}}
        selectedImageId={selectedImageId}
        onImageSelect={handleImageSelect}
        showAnnotations={showAnnotations}
        onToggleAnnotations={handleToggleAnnotations}
        onNavigateToPreviousAnalyses={handleNavigateToPreviousAnalyses}
      />
      
      <div className="flex-1">
        <SummaryDashboard 
          analyses={analyses}
          metrics={metrics}
          loading={loading}
          error={error}
          onRefresh={refreshMetrics}
        />
      </div>
    </div>
  );
};

export default Dashboard;