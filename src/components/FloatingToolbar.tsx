import React, { useState, useCallback, useRef } from 'react';
import { useReactFlow } from '@xyflow/react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger, DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { Separator } from '@/components/ui/separator';
import { 
  Hand, 
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
  Upload
} from 'lucide-react';
import { useFilteredToast } from '@/hooks/use-filtered-toast';
import { ChatPanel } from './ChatPanel';

export type ToolMode = 'cursor' | 'draw';

interface FloatingToolbarProps {
  onToolChange: (tool: ToolMode) => void;
  onToggleAnnotations: () => void;
  onToggleAnalysis: () => void;
  onAddComment: () => void;
  onCreateGroup?: () => void;
  onImageUpload?: (files: File[]) => void;
  showAnnotations: boolean;
  showAnalysis: boolean;
  currentTool: ToolMode;
  hasMultiSelection?: boolean;
  selectedCount?: number;
}

export const FloatingToolbar: React.FC<FloatingToolbarProps> = ({
  onToolChange,
  onToggleAnnotations,
  onToggleAnalysis,
  onAddComment,
  onCreateGroup,
  onImageUpload,
  showAnnotations,
  showAnalysis,
  currentTool,
  hasMultiSelection = false,
  selectedCount = 0
}) => {
  const { zoomIn, zoomOut, zoomTo, fitView, getZoom } = useReactFlow();
  const { toast } = useFilteredToast();
  const [isZoomMenuOpen, setIsZoomMenuOpen] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(100);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Update zoom level when zoom changes
  React.useEffect(() => {
    const updateZoom = () => {
      try {
        const currentZoom = getZoom();
        // Ensure currentZoom is a valid number before calculation
        if (typeof currentZoom === 'number' && !isNaN(currentZoom) && isFinite(currentZoom)) {
          setZoomLevel(Math.round(currentZoom * 100));
        } else {
          // Fallback to 100% if zoom is invalid
          setZoomLevel(100);
        }
      } catch (error) {
        console.error('Error getting zoom level:', error);
        setZoomLevel(100);
      }
    };
    
    // Update immediately
    updateZoom();
    
    // Set up an interval to check zoom changes
    const interval = setInterval(updateZoom, 100);
    return () => clearInterval(interval);
  }, [getZoom]);

  const handleZoomIn = useCallback(() => {
    zoomIn();
    // Remove zoom toast - this is routine UI feedback
  }, [zoomIn, toast]);

  const handleZoomOut = useCallback(() => {
    zoomOut();
    // Remove zoom toast - this is routine UI feedback
  }, [zoomOut, toast]);

  const handleZoomTo100 = useCallback(() => {
    zoomTo(1);
    setZoomLevel(100);
    // Remove zoom toast - this is routine UI feedback
  }, [zoomTo, toast]);

  const handleZoomTo200 = useCallback(() => {
    zoomTo(2);
    setZoomLevel(200);
    // Remove zoom toast - this is routine UI feedback
  }, [zoomTo, toast]);

  const handleFitView = useCallback(() => {
    fitView({ duration: 800, padding: 0.1 });
    // Remove zoom toast - this is routine UI feedback
  }, [fitView, toast]);

  const handleKeyboardShortcuts = useCallback((event: KeyboardEvent) => {
    if (event.ctrlKey || event.metaKey) {
      switch (event.key) {
        case '+':
        case '=':
          event.preventDefault();
          handleZoomIn();
          break;
        case '-':
          event.preventDefault();
          handleZoomOut();
          break;
        case '0':
          event.preventDefault();
          handleZoomTo100();
          break;
        case '1':
          event.preventDefault();
          handleFitView();
          break;
        case '2':
          event.preventDefault();
          handleZoomTo200();
          break;
      }
    }
  }, [handleZoomIn, handleZoomOut, handleZoomTo100, handleFitView, handleZoomTo200]);

  React.useEffect(() => {
    window.addEventListener('keydown', handleKeyboardShortcuts);
    return () => window.removeEventListener('keydown', handleKeyboardShortcuts);
  }, [handleKeyboardShortcuts]);

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

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (files.length > 0 && onImageUpload) {
      onImageUpload(files);
      // Remove upload progress toast - handled by main upload flow
    }
    // Reset the input value so the same file can be uploaded again
    event.target.value = '';
  };

  return (
    <>
      <div className="fixed bottom-0 left-1/2 transform -translate-x-1/2 z-50 pb-4">
        <div className="flex items-center bg-background/95 backdrop-blur-sm border border-border rounded-xl shadow-lg p-2 gap-1">
          {/* Move Tool Dropdown */}
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
                  <span className="text-xs text-muted-foreground">Select and move artboards</span>
                </div>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onToolChange('draw')} className="gap-2">
                <PenTool className="h-4 w-4" />
                <div className="flex flex-col">
                  <span>Draw</span>
                  <span className="text-xs text-muted-foreground">Paint regions for inpainting</span>
                </div>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Separator orientation="vertical" className="h-6" />

          {/* Zoom Controls */}
          <DropdownMenu open={isZoomMenuOpen} onOpenChange={setIsZoomMenuOpen}>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 px-3 gap-1">
                <span className="text-xs font-medium">{zoomLevel}%</span>
                <ChevronDown className="h-3 w-3 opacity-50" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="center" className="bg-background/95 backdrop-blur-sm w-48">
              <DropdownMenuItem onClick={handleZoomIn} className="gap-2">
                <ZoomIn className="h-4 w-4" />
                <span>Zoom in</span>
                <span className="ml-auto text-xs text-muted-foreground">⌘+</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleZoomOut} className="gap-2">
                <ZoomOut className="h-4 w-4" />
                <span>Zoom out</span>
                <span className="ml-auto text-xs text-muted-foreground">⌘-</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleZoomTo100} className="gap-2">
                <RotateCcw className="h-4 w-4" />
                <span>Zoom to 100%</span>
                <span className="ml-auto text-xs text-muted-foreground">⌘0</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleZoomTo200} className="gap-2">
                <Target className="h-4 w-4" />
                <span>Zoom to 200%</span>
                <span className="ml-auto text-xs text-muted-foreground">⌘2</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleFitView} className="gap-2">
                <Maximize className="h-4 w-4" />
                <span>Zoom to fit</span>
                <span className="ml-auto text-xs text-muted-foreground">⌘1</span>
              </DropdownMenuItem>
              <Separator className="my-1" />
              <DropdownMenuItem onClick={onToggleAnnotations} className="gap-2">
                {showAnnotations ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                <span>Annotations</span>
                <span className="ml-auto text-xs text-muted-foreground">
                  {showAnnotations ? 'On' : 'Off'}
                </span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onToggleAnalysis} className="gap-2">
                {showAnalysis ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                <span>Analysis</span>
                <span className="ml-auto text-xs text-muted-foreground">
                  {showAnalysis ? 'On' : 'Off'}
                </span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Separator orientation="vertical" className="h-6" />

          {/* Group Creation Button */}
          {onCreateGroup && selectedCount >= 2 && (
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
          )}

          {/* Upload Button */}
          {onImageUpload && (
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
          )}

          {/* Add Comment Button */}
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-8 w-8 p-0"
            onClick={onAddComment}
            title="Add comment"
          >
            <MessageSquarePlus className="h-4 w-4" />
          </Button>

          <Separator orientation="vertical" className="h-6" />

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
        </div>
      </div>

      {/* Chat Panel */}
      <ChatPanel isOpen={isChatOpen} onClose={() => setIsChatOpen(false)} />
    </>
  );
};