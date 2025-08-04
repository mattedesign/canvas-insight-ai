import React, { useState, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger, DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { Separator } from '@/components/ui/separator';
import { 
  MousePointer, 
  PenTool, 
  ZoomIn, 
  ZoomOut, 
  RotateCcw,
  Maximize,
  MessageSquarePlus,
  MessageCircle,
  ChevronDown,
  Eye,
  EyeOff,
  Target,
  Group,
  Upload,
  Trash2
} from 'lucide-react';
import { useFilteredToast } from '@/hooks/use-filtered-toast';
import { ChatPanel } from './ChatPanel';

export type UnifiedToolMode = 'cursor' | 'draw';

// Context for different toolbar modes
export type ToolbarContext = 'canvas' | 'gallery';

interface UnifiedFloatingToolbarProps {
  // Tool management
  onToolChange?: (tool: UnifiedToolMode) => void;
  currentTool?: UnifiedToolMode;
  
  // View controls
  onToggleAnnotations: () => void;
  onToggleAnalysis?: () => void;
  showAnnotations: boolean;
  showAnalysis?: boolean;
  
  // Zoom controls
  zoomLevel: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onReset: () => void;
  onZoomTo100?: () => void;
  onZoomTo200?: () => void;
  onFitView?: () => void;
  
  // Actions
  onAddComment?: () => void;
  onCreateGroup?: () => void;
  onImageUpload?: (files: File[]) => void;
  onDelete?: () => void;
  
  // Multi-selection state
  hasMultiSelection?: boolean;
  selectedCount?: number;
  
  // Context determines which features are available
  context: ToolbarContext;
}

export const UnifiedFloatingToolbar: React.FC<UnifiedFloatingToolbarProps> = ({
  onToolChange,
  currentTool = 'cursor',
  onToggleAnnotations,
  onToggleAnalysis,
  showAnnotations,
  showAnalysis = false,
  zoomLevel,
  onZoomIn,
  onZoomOut,
  onReset,
  onZoomTo100,
  onZoomTo200,
  onFitView,
  onAddComment,
  onCreateGroup,
  onImageUpload,
  onDelete,
  hasMultiSelection = false,
  selectedCount = 0,
  context
}) => {
  const { toast } = useFilteredToast();
  const [isChatOpen, setIsChatOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const getToolIcon = () => {
    switch (currentTool) {
      case 'cursor':
        return <MousePointer className="h-4 w-4" />;
      case 'draw':
        return <PenTool className="h-4 w-4" />;
      default:
        return <MousePointer className="h-4 w-4" />;
    }
  };

  const getToolLabel = () => {
    switch (currentTool) {
      case 'cursor':
        return 'Cursor';
      case 'draw':
        return 'Draw';
      default:
        return 'Cursor';
    }
  };

  const getToolDescription = () => {
    if (context === 'canvas') {
      switch (currentTool) {
        case 'cursor':
          return 'Select and move artboards';
        case 'draw':
          return 'Paint regions for inpainting';
        default:
          return 'Select and interact';
      }
    } else {
      switch (currentTool) {
        case 'cursor':
          return 'Select and interact';
        case 'draw':
          return 'Paint regions for editing';
        default:
          return 'Select and interact';
      }
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (files.length > 0 && onImageUpload) {
      onImageUpload(files);
    }
    event.target.value = '';
  };

  const handleAddComment = () => {
    if (onAddComment) {
      onAddComment();
      toast({ 
        description: "Comment mode activated. Click anywhere to add a comment.", 
        category: "action-required" 
      });
    }
  };

  // Render tool selection dropdown if tool change is available
  const renderToolSelection = () => {
    if (!onToolChange) return null;

    return (
      <>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8 px-3 gap-1">
              {getToolIcon()}
              <span className="text-xs font-medium">{getToolLabel()}</span>
              <ChevronDown className="h-3 w-3 opacity-50" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="bg-background/95 backdrop-blur-sm">
            <DropdownMenuItem onClick={() => onToolChange('cursor')} className="gap-2">
              <MousePointer className="h-4 w-4" />
              <div className="flex flex-col">
                <span>Cursor</span>
                <span className="text-xs text-muted-foreground">
                  {context === 'canvas' ? 'Select and move artboards' : 'Select and interact'}
                </span>
              </div>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onToolChange('draw')} className="gap-2">
              <PenTool className="h-4 w-4" />
              <div className="flex flex-col">
                <span>Draw</span>
                <span className="text-xs text-muted-foreground">
                  {context === 'canvas' ? 'Paint regions for inpainting' : 'Paint regions for editing'}
                </span>
              </div>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <Separator orientation="vertical" className="h-6" />
      </>
    );
  };

  // Render zoom controls
  const renderZoomControls = () => (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="h-8 px-3 gap-1">
            <span className="text-xs font-medium">{zoomLevel}%</span>
            <ChevronDown className="h-3 w-3 opacity-50" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="center" className="bg-background/95 backdrop-blur-sm w-48">
          <DropdownMenuItem onClick={onZoomIn} className="gap-2">
            <ZoomIn className="h-4 w-4" />
            <span>Zoom in</span>
            <span className="ml-auto text-xs text-muted-foreground">⌘+</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onZoomOut} className="gap-2">
            <ZoomOut className="h-4 w-4" />
            <span>Zoom out</span>
            <span className="ml-auto text-xs text-muted-foreground">⌘-</span>
          </DropdownMenuItem>
          
          {/* Canvas-specific zoom options */}
          {context === 'canvas' && onZoomTo100 && (
            <DropdownMenuItem onClick={onZoomTo100} className="gap-2">
              <RotateCcw className="h-4 w-4" />
              <span>Zoom to 100%</span>
              <span className="ml-auto text-xs text-muted-foreground">⌘0</span>
            </DropdownMenuItem>
          )}
          
          {context === 'canvas' && onZoomTo200 && (
            <DropdownMenuItem onClick={onZoomTo200} className="gap-2">
              <Target className="h-4 w-4" />
              <span>Zoom to 200%</span>
              <span className="ml-auto text-xs text-muted-foreground">⌘2</span>
            </DropdownMenuItem>
          )}
          
          {context === 'canvas' && onFitView && (
            <DropdownMenuItem onClick={onFitView} className="gap-2">
              <Maximize className="h-4 w-4" />
              <span>Zoom to fit</span>
              <span className="ml-auto text-xs text-muted-foreground">⌘1</span>
            </DropdownMenuItem>
          )}
          
          {/* Gallery-specific zoom options */}
          {context === 'gallery' && (
            <DropdownMenuItem onClick={onReset} className="gap-2">
              <Maximize className="h-4 w-4" />
              <span>Reset view</span>
              <span className="ml-auto text-xs text-muted-foreground">⌘0</span>
            </DropdownMenuItem>
          )}
          
          {context === 'gallery' && (
            <DropdownMenuItem onClick={() => {
              onZoomIn();
              onZoomIn();
            }} className="gap-2">
              <Target className="h-4 w-4" />
              <span>Zoom to 200%</span>
              <span className="ml-auto text-xs text-muted-foreground">⌘2</span>
            </DropdownMenuItem>
          )}
          
          <Separator className="my-1" />
          <DropdownMenuItem onClick={onToggleAnnotations} className="gap-2">
            {showAnnotations ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
            <span>Annotations</span>
            <span className="ml-auto text-xs text-muted-foreground">
              {showAnnotations ? 'On' : 'Off'}
            </span>
          </DropdownMenuItem>
          
          {/* Canvas-specific analysis toggle */}
          {context === 'canvas' && onToggleAnalysis && (
            <DropdownMenuItem onClick={onToggleAnalysis} className="gap-2">
              {showAnalysis ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
              <span>Analysis</span>
              <span className="ml-auto text-xs text-muted-foreground">
                {showAnalysis ? 'On' : 'Off'}
              </span>
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
      <Separator orientation="vertical" className="h-6" />
    </>
  );

  // Render group creation button (canvas only)
  const renderGroupButton = () => {
    if (context !== 'canvas' || !onCreateGroup || selectedCount < 2) return null;

    return (
      <>
        <Button 
          variant="ghost" 
          size="sm" 
          className="h-8 px-2 gap-1"
          onClick={onCreateGroup}
          title={`Create group from ${selectedCount} selected items`}
        >
          <Group className="h-4 w-4" />
          <span className="text-xs">{selectedCount}</span>
        </Button>
        <Separator orientation="vertical" className="h-6" />
      </>
    );
  };

  // Render upload button (canvas only)
  const renderUploadButton = () => {
    if (context !== 'canvas' || !onImageUpload) return null;

    return (
      <>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*,.html"
          onChange={handleFileChange}
          className="hidden"
        />
        <Button 
          variant="ghost" 
          size="sm" 
          className="h-8 w-8 p-0"
          onClick={handleUploadClick}
          title="Upload images"
        >
          <Upload className="h-4 w-4" />
        </Button>
        <Separator orientation="vertical" className="h-6" />
      </>
    );
  };

  // Render delete button (gallery only)
  const renderDeleteButton = () => {
    if (context !== 'gallery' || !onDelete) return null;

    return (
      <>
        <Separator orientation="vertical" className="h-6" />
        <Button 
          variant="ghost" 
          size="sm" 
          className="h-8 w-8 p-0 text-destructive hover:text-destructive-foreground hover:bg-destructive"
          onClick={onDelete}
          title="Delete image"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </>
    );
  };

  return (
    <>
      <div className="fixed bottom-0 left-1/2 transform -translate-x-1/2 z-50 pb-4">
        <div className="flex items-center bg-background/95 backdrop-blur-sm border border-border rounded-xl shadow-lg p-2 gap-1">
          {/* Tool Selection */}
          {renderToolSelection()}

          {/* Zoom Controls */}
          {renderZoomControls()}

          {/* Group Button (Canvas only) */}
          {renderGroupButton()}

          {/* Upload Button (Canvas only) */}
          {renderUploadButton()}

          {/* Add Comment Button */}
          {onAddComment && (
            <>
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-8 w-8 p-0"
                onClick={handleAddComment}
                title="Add comment"
              >
                <MessageSquarePlus className="h-4 w-4" />
              </Button>
              <Separator orientation="vertical" className="h-6" />
            </>
          )}

          {/* Chat Button */}
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-8 w-8 p-0"
            onClick={() => setIsChatOpen(true)}
            title="Open chat"
          >
            <MessageCircle className="h-4 w-4" />
          </Button>

          {/* Delete Button (Gallery only) */}
          {renderDeleteButton()}
        </div>
      </div>

      {/* Chat Panel */}
      <ChatPanel isOpen={isChatOpen} onClose={() => setIsChatOpen(false)} />
    </>
  );
};