import React from 'react';
import { 
  Grid3X3, 
  Bell, 
  RotateCcw, 
  Gem, 
  User, 
  Plus,
  Eye,
  BarChart3,
  Trash2,
  Network,
  MapPin,
  EyeOff
} from 'lucide-react';
import { UXAnalysis, UploadedImage } from '@/types/ux-analysis';

interface SidebarProps {
  onClearCanvas: () => void;
  onAddImages: () => void;
  uploadedImages: UploadedImage[];
  analyses: UXAnalysis[];
  selectedView: 'gallery' | 'canvas' | 'summary';
  onViewChange: (view: 'gallery' | 'canvas' | 'summary') => void;
  selectedImageId: string | null;
  onImageSelect: (imageId: string) => void;
  showAnnotations: boolean;
  onToggleAnnotations: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  onClearCanvas,
  onAddImages,
  uploadedImages,
  analyses,
  selectedView,
  onViewChange,
  selectedImageId,
  onImageSelect,
  showAnnotations,
  onToggleAnnotations,
}) => {
  const sidebarIcons = [
    { icon: Plus, label: 'Add', active: false },
    { icon: Grid3X3, label: 'Grid', active: true },
    { icon: Bell, label: 'Notifications', active: false },
    { icon: RotateCcw, label: 'History', active: false },
    { icon: Gem, label: 'Assets', active: false },
    { icon: User, label: 'Profile', active: false },
  ];

  return (
    <div className="w-16 bg-sidebar flex flex-col items-center py-4 space-y-4">
      {/* Logo */}
      <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center text-primary-foreground font-bold text-lg">
        UX
      </div>

      {/* Navigation Icons */}
      <div className="flex flex-col space-y-3">
        {sidebarIcons.map((item, index) => (
          <button
            key={index}
            onClick={item.label === 'Add' ? onAddImages : undefined}
            className={`
              w-10 h-10 rounded-lg flex items-center justify-center transition-all
              ${item.active 
                ? 'bg-sidebar-accent text-sidebar-primary-foreground' 
                : 'text-sidebar-foreground hover:bg-sidebar-accent/50'
              }
            `}
            title={item.label === 'Add' ? 'Add Images' : item.label}
          >
            <item.icon className="w-5 h-5" />
          </button>
        ))}
      </div>


      {/* View Toggle */}
      {analyses.length > 0 && (
        <div className="flex flex-col space-y-2 mt-8">
          <button
            onClick={() => onViewChange('gallery')}
            className={`
              w-10 h-10 rounded-lg flex items-center justify-center transition-all
              ${selectedView === 'gallery'
                ? 'bg-sidebar-accent text-sidebar-primary-foreground'
                : 'text-sidebar-foreground hover:bg-sidebar-accent/50'
              }
            `}
            title="Gallery View"
          >
            <Eye className="w-5 h-5" />
          </button>
          
          <button
            onClick={() => onViewChange('canvas')}
            className={`
              w-10 h-10 rounded-lg flex items-center justify-center transition-all
              ${selectedView === 'canvas'
                ? 'bg-sidebar-accent text-sidebar-primary-foreground'
                : 'text-sidebar-foreground hover:bg-sidebar-accent/50'
              }
            `}
            title="Canvas View"
          >
            <Network className="w-5 h-5" />
          </button>
          
          <button
            onClick={() => onViewChange('summary')}
            className={`
              w-10 h-10 rounded-lg flex items-center justify-center transition-all
              ${selectedView === 'summary'
                ? 'bg-sidebar-accent text-sidebar-primary-foreground'
                : 'text-sidebar-foreground hover:bg-sidebar-accent/50'
              }
            `}
            title="Summary View"
          >
            <BarChart3 className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* Annotation Toggle */}
      {analyses.length > 0 && (
        <div className="mt-4">
          <button
            onClick={onToggleAnnotations}
            className={`
              w-10 h-10 rounded-lg flex items-center justify-center transition-all
              ${showAnnotations
                ? 'bg-sidebar-accent text-sidebar-primary-foreground'
                : 'text-sidebar-foreground hover:bg-sidebar-accent/50'
              }
            `}
            title={showAnnotations ? "Hide Annotations" : "Show Annotations"}
          >
            {showAnnotations ? <MapPin className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}
          </button>
        </div>
      )}

      {/* Clear Canvas */}
      {uploadedImages.length > 0 && (
        <div className="mt-auto">
          <button
            onClick={onClearCanvas}
            className="w-10 h-10 rounded-lg flex items-center justify-center text-sidebar-foreground hover:bg-destructive hover:text-destructive-foreground transition-all"
            title="Clear Canvas"
          >
            <Trash2 className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* User Avatar */}
      <div className="mt-auto">
        <div className="w-10 h-10 bg-gradient-to-br from-primary to-sidebar-accent rounded-lg flex items-center justify-center">
          <User className="w-5 h-5 text-primary-foreground" />
        </div>
      </div>
    </div>
  );
};