import React from 'react';
import { 
  Edit3, 
  Trash2, 
  Copy, 
  FolderOpen, 
  BarChart3,
  Star,
  Archive,
  MoreHorizontal
} from 'lucide-react';
import {
  ActionSheet,
  ActionSheetContent,
  ActionSheetHeader,
  ActionSheetTitle,
  ActionSheetItem,
} from '@/components/ui/action-sheet';
import { useIsMobile } from '@/hooks/useIsMobile';

export interface ProjectContextMenuProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectName: string;
  projectId: string;
  selectedCount?: number;
  onRename?: () => void;
  onDelete?: () => void;
  onDuplicate?: () => void;
  onOpen?: () => void;
  onAnalyze?: () => void;
  onFavorite?: () => void;
  onArchive?: () => void;
}

export const ProjectContextMenu: React.FC<ProjectContextMenuProps> = ({
  open,
  onOpenChange,
  projectName,
  projectId,
  selectedCount = 1,
  onRename,
  onDelete,
  onDuplicate,
  onOpen,
  onAnalyze,
  onFavorite,
  onArchive,
}) => {
  const isMobile = useIsMobile();
  const isMultiple = selectedCount > 1;

  const menuItems = [
    {
      icon: <FolderOpen className="h-5 w-5" />,
      label: isMultiple ? `Open ${selectedCount} projects` : 'Open project',
      action: onOpen,
      show: !!onOpen,
    },
    {
      icon: <Edit3 className="h-5 w-5" />,
      label: 'Rename',
      action: onRename,
      show: !!onRename && !isMultiple,
    },
    {
      icon: <Copy className="h-5 w-5" />,
      label: isMultiple ? `Duplicate ${selectedCount} projects` : 'Duplicate',
      action: onDuplicate,
      show: !!onDuplicate,
    },
    {
      icon: <BarChart3 className="h-5 w-5" />,
      label: isMultiple ? `Analyze ${selectedCount} projects` : 'Analyze usage',
      action: onAnalyze,
      show: !!onAnalyze,
    },
    {
      icon: <Star className="h-5 w-5" />,
      label: isMultiple ? `Favorite ${selectedCount} projects` : 'Add to favorites',
      action: onFavorite,
      show: !!onFavorite,
    },
    {
      icon: <Archive className="h-5 w-5" />,
      label: isMultiple ? `Archive ${selectedCount} projects` : 'Archive',
      action: onArchive,
      show: !!onArchive,
    },
    {
      icon: <Trash2 className="h-5 w-5" />,
      label: isMultiple ? `Delete ${selectedCount} projects` : 'Delete',
      action: onDelete,
      show: !!onDelete,
      variant: 'destructive' as const,
    },
  ];

  return (
    <ActionSheet open={open} onOpenChange={onOpenChange}>
      <ActionSheetContent>
        <ActionSheetHeader>
          <ActionSheetTitle>
            {isMultiple ? `${selectedCount} projects selected` : projectName}
          </ActionSheetTitle>
        </ActionSheetHeader>
        
        <div className="grid gap-1">
          {menuItems
            .filter(item => item.show)
            .map((item, index) => (
              <ActionSheetItem
                key={index}
                icon={item.icon}
                variant={item.variant}
                onClick={() => {
                  item.action?.();
                  onOpenChange(false);
                }}
              >
                {item.label}
              </ActionSheetItem>
            ))}
        </div>
      </ActionSheetContent>
    </ActionSheet>
  );
};