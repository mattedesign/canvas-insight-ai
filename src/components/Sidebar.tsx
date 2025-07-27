import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  BarChart3, 
  Plus, 
  Folder, 
  Bell, 
  Crown, 
  User,
  Trash2,
  LogOut
} from 'lucide-react';
import { UXAnalysis, UploadedImage } from '@/types/ux-analysis';
import { useAuth } from '@/context/AuthContext';

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
  onNavigateToPreviousAnalyses: () => void;
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
  onNavigateToPreviousAnalyses,
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { signOut, user } = useAuth();
  
  const isOnUploadScreen = location.pathname === '/upload';
  const isOnDashboard = location.pathname === '/' || location.pathname === '/dashboard';
  const isOnProjects = location.pathname === '/projects';
  
  
  const sidebarIcons = [
    { icon: BarChart3, label: 'Dashboard', active: isOnDashboard },
    { icon: Plus, label: 'Add', active: isOnUploadScreen },
    { icon: Folder, label: 'Previous', active: isOnProjects },
    { icon: Bell, label: 'Notifications', active: false },
    { icon: Crown, label: 'Subscription', active: false },
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
            onClick={
              item.label === 'Dashboard' ? () => navigate('/dashboard') :
              item.label === 'Add' ? () => navigate('/upload') :
              item.label === 'Previous' ? () => navigate('/projects') :
              undefined
            }
            className={`
              w-10 h-10 rounded-lg flex items-center justify-center transition-all
              ${item.active 
                ? 'bg-sidebar-accent text-sidebar-primary-foreground' 
                : 'text-sidebar-foreground hover:bg-sidebar-accent/50'
              }
            `}
            title={
              item.label === 'Dashboard' ? 'Dashboard' :
              item.label === 'Add' ? 'Add Images' :
              item.label === 'Previous' ? 'Previous Analyses' :
              item.label === 'Notifications' ? 'Notifications' :
              item.label === 'Subscription' ? 'Subscription' :
              item.label === 'Profile' ? 'Profile' :
              item.label
            }
          >
            <item.icon className="w-5 h-5" />
          </button>
        ))}
      </div>



      {/* Bottom Actions */}
      <div className="mt-auto flex flex-col space-y-2">
        {/* Clear Canvas */}
        {uploadedImages.length > 0 && (
          <button
            onClick={onClearCanvas}
            className="w-10 h-10 rounded-lg flex items-center justify-center text-sidebar-foreground hover:bg-destructive hover:text-destructive-foreground transition-all"
            title="Clear Canvas"
          >
            <Trash2 className="w-5 h-5" />
          </button>
        )}
        
        {/* Logout */}
        <button
          onClick={() => signOut()}
          className="w-10 h-10 rounded-lg flex items-center justify-center text-sidebar-foreground hover:bg-sidebar-accent/50 transition-all"
          title={`Sign out (${user?.email})`}
        >
          <LogOut className="w-5 h-5" />
        </button>
      </div>

    </div>
  );
};