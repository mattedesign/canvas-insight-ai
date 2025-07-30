import React from 'react';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import { 
  Brain, 
  BarChart3, 
  Wand2, 
  Users, 
  Eye,
  Settings,
  Zap
} from 'lucide-react';

interface AIContextMenuProps {
  children: React.ReactNode;
  imageId?: string;
  imageName?: string;
  imageUrl?: string;
  isSelected?: boolean;
  selectedImageIds?: string[];
  onAnalyzeImage?: (imageId: string) => void;
  onCompareModels?: (imageId: string) => void;
  onBatchAnalysis?: (imageIds: string[]) => void;
  onGroupAnalysis?: (imageIds: string[]) => void;
  onEnhancedAnalysis?: (imageId: string) => void;
  onViewAnalysis?: (imageId: string) => void;
}

export const AIContextMenu: React.FC<AIContextMenuProps> = ({
  children,
  imageId,
  imageName,
  imageUrl,
  isSelected,
  selectedImageIds = [],
  onAnalyzeImage,
  onCompareModels,
  onBatchAnalysis,
  onGroupAnalysis,
  onEnhancedAnalysis,
  onViewAnalysis
}) => {
  const hasSelection = selectedImageIds.length > 0;
  const hasMultipleSelected = selectedImageIds.length > 1;
  const isCurrentImageSelected = imageId && selectedImageIds.includes(imageId);

  const handleAnalyzeImage = () => {
    if (imageId && onAnalyzeImage) {
      onAnalyzeImage(imageId);
    }
  };

  const handleCompareModels = () => {
    if (imageId && onCompareModels) {
      onCompareModels(imageId);
    }
  };

  const handleBatchAnalysis = () => {
    if (hasSelection && onBatchAnalysis) {
      onBatchAnalysis(selectedImageIds);
    }
  };

  const handleGroupAnalysis = () => {
    if (hasMultipleSelected && onGroupAnalysis) {
      onGroupAnalysis(selectedImageIds);
    }
  };

  const handleEnhancedAnalysis = () => {
    if (imageId && onEnhancedAnalysis) {
      onEnhancedAnalysis(imageId);
    }
  };

  const handleViewAnalysis = () => {
    if (imageId && onViewAnalysis) {
      onViewAnalysis(imageId);
    }
  };

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        {children}
      </ContextMenuTrigger>
      <ContextMenuContent className="w-64">
        {/* Single Image Actions */}
        {imageId && (
          <>
            <ContextMenuItem onClick={handleAnalyzeImage}>
              <Brain className="h-4 w-4 mr-2" />
              Analyze with AI
            </ContextMenuItem>
            
            <ContextMenuItem onClick={handleViewAnalysis}>
              <Eye className="h-4 w-4 mr-2" />
              View Analysis
            </ContextMenuItem>

            <ContextMenuSub>
              <ContextMenuSubTrigger>
                <Wand2 className="h-4 w-4 mr-2" />
                Advanced Analysis
              </ContextMenuSubTrigger>
              <ContextMenuSubContent className="w-48">
                <ContextMenuItem onClick={handleEnhancedAnalysis}>
                  <Zap className="h-4 w-4 mr-2" />
                  Enhanced Analysis
                </ContextMenuItem>
                <ContextMenuItem onClick={handleCompareModels}>
                  <BarChart3 className="h-4 w-4 mr-2" />
                  Compare AI Models
                </ContextMenuItem>
              </ContextMenuSubContent>
            </ContextMenuSub>

            <ContextMenuSeparator />
          </>
        )}

        {/* Multi-Selection Actions */}
        {hasSelection && (
          <>
            <ContextMenuItem 
              onClick={handleBatchAnalysis}
              disabled={!hasSelection}
            >
              <Brain className="h-4 w-4 mr-2" />
              Batch Analysis ({selectedImageIds.length} images)
            </ContextMenuItem>

            {hasMultipleSelected && (
              <ContextMenuItem onClick={handleGroupAnalysis}>
                <Users className="h-4 w-4 mr-2" />
                Group Analysis ({selectedImageIds.length} images)
              </ContextMenuItem>
            )}

            <ContextMenuSeparator />
          </>
        )}

        {/* AI Model Settings */}
        <ContextMenuSub>
          <ContextMenuSubTrigger>
            <Settings className="h-4 w-4 mr-2" />
            AI Settings
          </ContextMenuSubTrigger>
          <ContextMenuSubContent className="w-48">
            <ContextMenuItem>
              <Brain className="h-4 w-4 mr-2" />
              Change AI Model
            </ContextMenuItem>
            <ContextMenuItem>
              <BarChart3 className="h-4 w-4 mr-2" />
              Model Performance
            </ContextMenuItem>
          </ContextMenuSubContent>
        </ContextMenuSub>
      </ContextMenuContent>
    </ContextMenu>
  );
};