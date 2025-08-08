import React, { memo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useRouterStateManager } from '@/services/RouterStateManager';
import { 
  BarChart3, 
  Folder, 
  Bell, 
  Crown, 
  User,
  Trash2,
  LogOut,
  Brain
} from 'lucide-react';
import { UXAnalysis, UploadedImage } from '@/types/ux-analysis';
import { useAuth } from '@/context/AuthContext';

interface SidebarProps {
  onClearCanvas: () => void;
  onAddImages: () => void;
  uploadedImages: UploadedImage[];
  analyses: UXAnalysis[];
  selectedView: 'gallery' | 'canvas' | 'summary' | 'subscription';
  onViewChange: (view: 'gallery' | 'canvas' | 'summary' | 'subscription') => void;
  selectedImageId: string | null;
  onImageSelect: (imageId: string) => void;
  showAnnotations: boolean;
  onToggleAnnotations: () => void;
  onNavigateToPreviousAnalyses: () => void;
}

// ✅ PHASE 4.2: MEMOIZED COMPONENT FOR PERFORMANCE
export const Sidebar: React.FC<SidebarProps> = memo(({
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
  const { navigate: enhancedNavigate, state: routerState } = useRouterStateManager();
  
  
  const isOnDashboard = location.pathname === '/' || location.pathname === '/dashboard';
  const isOnProjects = location.pathname === '/projects';
  const isOnSubscription = location.pathname === '/subscription';
  const isOnAnalysisV2 = location.pathname === '/analysis-v2';
  
  
  const sidebarIcons = [
    { icon: BarChart3, label: 'Dashboard', active: isOnDashboard },
    { icon: Folder, label: 'Previous', active: isOnProjects },
    { icon: Brain, label: 'Analysis V2', active: isOnAnalysisV2 },
    { icon: Bell, label: 'Notifications', active: false },
    { icon: Crown, label: 'Subscription', active: isOnSubscription },
    { icon: User, label: 'Profile', active: false },
  ];

  return (
    <div className="w-16 bg-sidebar flex flex-col items-center py-4 space-y-4">
      {/* Logo */}
      <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center p-2">
        <img 
          src="/lovable-uploads/c671a789-96c3-47ab-a04b-9f06ab4b4592.png" 
          alt="Logo" 
          className="w-full h-full object-contain"
        />
      </div>

      {/* Navigation Icons */}
      <div className="flex flex-col space-y-3">
        {sidebarIcons.map((item, index) => (
          <button
            key={index}
            onClick={
              item.label === 'Dashboard' ? () => enhancedNavigate('/dashboard') :
              item.label === 'Previous' ? () => enhancedNavigate('/projects') :
              item.label === 'Analysis V2' ? () => enhancedNavigate('/analysis-v2') :
              item.label === 'Subscription' ? () => enhancedNavigate('/subscription') :
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
              item.label === 'Previous' ? 'Previous Analyses' :
              item.label === 'Analysis V2' ? 'Event-driven Analysis' :
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
}); // ✅ PHASE 4.2: MEMOIZED COMPONENT CLOSING

// ✅ PHASE 4.2: SET DISPLAY NAME FOR DEBUGGING
Sidebar.displayName = 'Sidebar';