import React from 'react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger, DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { Separator } from '@/components/ui/separator';
import { 
  ZoomIn, 
  ZoomOut, 
  RotateCcw,
  Maximize,
  Trash2,
  ChevronDown,
  Eye,
  EyeOff
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface GalleryFloatingToolbarProps {
  onZoomIn: () => void;
  onZoomOut: () => void;
  onReset: () => void;
  onDelete: () => void;
  onToggleAnnotations: () => void;
  showAnnotations: boolean;
  zoomLevel: number;
}

export const GalleryFloatingToolbar: React.FC<GalleryFloatingToolbarProps> = ({
  onZoomIn,
  onZoomOut,
  onReset,
  onDelete,
  onToggleAnnotations,
  showAnnotations,
  zoomLevel
}) => {
  const { toast } = useToast();

  const handleZoomIn = () => {
    onZoomIn();
    toast({ description: "Zoomed in" });
  };

  const handleZoomOut = () => {
    onZoomOut();
    toast({ description: "Zoomed out" });
  };

  const handleReset = () => {
    onReset();
    toast({ description: "Reset to fit view" });
  };

  const handleDelete = () => {
    onDelete();
    toast({ description: "Image deleted" });
  };

  return (
    <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50">
      <div className="flex items-center bg-background/95 backdrop-blur-sm border border-border rounded-xl shadow-lg p-2 gap-1">
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
  );
};