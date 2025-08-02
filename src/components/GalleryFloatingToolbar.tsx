import React, { useState } from 'react';
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
  Trash2,
  ChevronDown,
  Eye,
  EyeOff,
  MessageSquarePlus,
  MessageCircle,
  Target
} from 'lucide-react';
import { useFilteredToast } from '@/hooks/use-filtered-toast';
import { ChatPanel } from './ChatPanel';

export type GalleryToolMode = 'cursor' | 'draw';

interface GalleryFloatingToolbarProps {
  onZoomIn: () => void;
  onZoomOut: () => void;
  onReset: () => void;
  onDelete: () => void;
  onToggleAnnotations: () => void;
  onToolChange?: (tool: GalleryToolMode) => void;
  onAddComment?: () => void;
  showAnnotations: boolean;
  zoomLevel: number;
  currentTool?: GalleryToolMode;
}

export const GalleryFloatingToolbar: React.FC<GalleryFloatingToolbarProps> = ({
  onZoomIn,
  onZoomOut,
  onReset,
  onDelete,
  onToggleAnnotations,
  onToolChange,
  onAddComment,
  showAnnotations,
  zoomLevel,
  currentTool = 'cursor'
}) => {
  const { toast } = useFilteredToast();
  const [isChatOpen, setIsChatOpen] = useState(false);

  const handleZoomIn = () => {
    onZoomIn();
    // Remove zoom toast - this is routine UI feedback
  };

  const handleZoomOut = () => {
    onZoomOut();
    // Remove zoom toast - this is routine UI feedback
  };

  const handleReset = () => {
    onReset();
    // Remove zoom toast - this is routine UI feedback
  };

  const handleDelete = () => {
    onDelete();
    // COMMENTED OUT: Repetitive delete confirmation toast
    // toast({ description: "Image deleted", category: "success" });
  };

  const handleAddComment = () => {
    if (onAddComment) {
      onAddComment();
      toast({ description: "Comment mode activated. Click anywhere to add a comment.", category: "action-required" });
    }
  };

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

  return (
    <>
      <div className="fixed bottom-0 left-1/2 transform -translate-x-1/2 z-50 pb-4">
        <div className="flex items-center bg-background/95 backdrop-blur-sm border border-border rounded-xl shadow-lg p-2 gap-1">
          {/* Tool Selection Dropdown */}
          {onToolChange && (
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
                      <span className="text-xs text-muted-foreground">Select and interact</span>
                    </div>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onToolChange('draw')} className="gap-2">
                    <PenTool className="h-4 w-4" />
                    <div className="flex flex-col">
                      <span>Draw</span>
                      <span className="text-xs text-muted-foreground">Paint regions for editing</span>
                    </div>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <Separator orientation="vertical" className="h-6" />
            </>
          )}

          {/* Zoom Controls */}
          <DropdownMenu>
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
              <DropdownMenuItem onClick={handleReset} className="gap-2">
                <Maximize className="h-4 w-4" />
                <span>Reset view</span>
                <span className="ml-auto text-xs text-muted-foreground">⌘0</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => {
                onZoomIn();
                onZoomIn();
                // Remove zoom toast - this is routine UI feedback
              }} className="gap-2">
                <Target className="h-4 w-4" />
                <span>Zoom to 200%</span>
                <span className="ml-auto text-xs text-muted-foreground">⌘2</span>
              </DropdownMenuItem>
              <Separator className="my-1" />
              <DropdownMenuItem onClick={onToggleAnnotations} className="gap-2">
                {showAnnotations ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                <span>Annotations</span>
                <span className="ml-auto text-xs text-muted-foreground">
                  {showAnnotations ? 'On' : 'Off'}
                </span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Separator orientation="vertical" className="h-6" />

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

          <Separator orientation="vertical" className="h-6" />

          {/* Delete Button */}
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-8 w-8 p-0 text-destructive hover:text-destructive-foreground hover:bg-destructive"
            onClick={handleDelete}
            title="Delete image"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Chat Panel */}
      <ChatPanel isOpen={isChatOpen} onClose={() => setIsChatOpen(false)} />
    </>
  );
};