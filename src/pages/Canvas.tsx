import React, { useState, useCallback } from 'react';
import { Sidebar } from '@/components/Sidebar';
import { CanvasView } from '@/components/canvas/CanvasView';
import { AnalysisPanel } from '@/components/AnalysisPanel';
import { GroupEditDialog } from '@/components/GroupEditDialog';
import { useAppContext } from '@/context/AppContext';
import { useNavigate } from 'react-router-dom';

const Canvas = () => {
  const navigate = useNavigate();
  const { 
    uploadedImages, 
    analyses, 
    generatedConcepts,
    imageGroups,
    groupAnalyses,
    groupPromptSessions,
    groupAnalysesWithPrompts,
    groupDisplayModes,
    selectedImageId,
    showAnnotations,
    isGeneratingConcept,
    handleClearCanvas,
    handleImageSelect,
    handleToggleAnnotations,
    handleGenerateConcept,
    handleCreateGroup,
    handleUngroup,
    handleDeleteGroup,
    handleEditGroup,
    handleGroupDisplayModeChange,
    handleSubmitGroupPrompt,
    handleEditGroupPrompt,
    handleCreateFork
  } = useAppContext();

  const [fileInputRef, setFileInputRef] = useState<HTMLInputElement | null>(null);
  const [analysisPanelOpen, setAnalysisPanelOpen] = useState(false);
  const [selectedAnalysisId, setSelectedAnalysisId] = useState<string | null>(null);
  const [groupEditDialogOpen, setGroupEditDialogOpen] = useState(false);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);

  const handleAddImages = useCallback(() => {
    fileInputRef?.click();
  }, [fileInputRef]);

  const handleFileInputChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (files.length > 0) {
      // Handle additional image uploads
    }
    event.target.value = '';
  }, []);

  const handleNavigateToPreviousAnalyses = () => {
    navigate('/projects');
  };

  const handleViewChange = (view: 'gallery' | 'canvas' | 'summary') => {
    if (view === 'gallery') {
      // Gallery route removed - stay on canvas
      return;
    } else if (view === 'summary') {
      navigate('/dashboard');
    }
  };

  const handleOpenAnalysisPanel = (analysisId: string) => {
    setSelectedAnalysisId(analysisId);
    setAnalysisPanelOpen(true);
  };

  const handleCloseAnalysisPanel = () => {
    setAnalysisPanelOpen(false);
    setSelectedAnalysisId(null);
  };

  const handleOpenGroupEdit = (groupId: string) => {
    setSelectedGroupId(groupId);
    setGroupEditDialogOpen(true);
  };

  const handleCloseGroupEdit = () => {
    setGroupEditDialogOpen(false);
    setSelectedGroupId(null);
  };

  // Redirect to upload if no images
  if (uploadedImages.length === 0) {
    navigate('/upload');
    return null;
  }

  return (
    <div className="flex h-screen bg-background">
      {/* Hidden file input */}
      <input
        ref={setFileInputRef}
        type="file"
        accept="image/*,.html"
        multiple
        onChange={handleFileInputChange}
        className="hidden"
      />
      
      <Sidebar 
        onClearCanvas={handleClearCanvas}
        onAddImages={handleAddImages}
        uploadedImages={uploadedImages}
        analyses={analyses}
        selectedView="canvas"
        onViewChange={handleViewChange}
        selectedImageId={selectedImageId}
        onImageSelect={handleImageSelect}
        showAnnotations={showAnnotations}
        onToggleAnnotations={handleToggleAnnotations}
        onNavigateToPreviousAnalyses={handleNavigateToPreviousAnalyses}
      />
      
      <div 
        className="flex-1 relative transition-all duration-300"
        style={{ 
          marginRight: analysisPanelOpen ? '480px' : '0px' 
        }}
      >
        <CanvasView 
          uploadedImages={uploadedImages} 
          analyses={analyses}
          generatedConcepts={generatedConcepts}
          imageGroups={imageGroups}
          groupAnalyses={groupAnalyses}
          groupPromptSessions={groupPromptSessions}
          groupAnalysesWithPrompts={groupAnalysesWithPrompts}
          groupDisplayModes={groupDisplayModes}
          showAnnotations={showAnnotations}
          onToggleAnnotations={handleToggleAnnotations}
          onViewChange={handleViewChange}
          onImageSelect={handleImageSelect}
          onGenerateConcept={handleGenerateConcept}
          onCreateGroup={handleCreateGroup}
          onUngroup={handleUngroup}
          onDeleteGroup={handleDeleteGroup}
          onEditGroup={handleOpenGroupEdit}
          onGroupDisplayModeChange={handleGroupDisplayModeChange}
          onSubmitGroupPrompt={handleSubmitGroupPrompt}
          onEditGroupPrompt={handleEditGroupPrompt}
          onCreateFork={handleCreateFork}
          onOpenAnalysisPanel={handleOpenAnalysisPanel}
          isGeneratingConcept={isGeneratingConcept}
        />
      </div>
      
      <AnalysisPanel
        analysis={selectedAnalysisId ? analyses.find(a => a.id === selectedAnalysisId) || null : null}
        image={selectedAnalysisId ? uploadedImages.find(img => {
          const analysis = analyses.find(a => a.id === selectedAnalysisId);
          return analysis && img.id === analysis.imageId;
        }) || null : null}
        isOpen={analysisPanelOpen}
        onClose={handleCloseAnalysisPanel}
      />
      
      <GroupEditDialog
        isOpen={groupEditDialogOpen}
        onClose={handleCloseGroupEdit}
        onUpdateGroup={handleEditGroup}
        group={selectedGroupId ? imageGroups.find(g => g.id === selectedGroupId) || null : null}
        groupImages={selectedGroupId ? uploadedImages.filter(img => {
          const group = imageGroups.find(g => g.id === selectedGroupId);
          return group && group.imageIds.includes(img.id);
        }) : []}
      />
    </div>
  );
};

export default Canvas;