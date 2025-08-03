import React from 'react';
import { 
  Edit3, 
  Trash2, 
  Copy, 
  Move,
  BarChart3,
  Layers,
  Eye,
  Download,
  Share2,
  FileText,
  FolderPlus,
  Star,
  Archive
} from 'lucide-react';
import {
  ActionSheet,
  ActionSheetContent,
  ActionSheetHeader,
  ActionSheetTitle,
  ActionSheetItem,
} from '@/components/ui/action-sheet';

export type ContextMenuItemType = 'image' | 'project' | 'group' | 'annotation' | 'artboard';

export interface ContextMenuAction {
  id: string;
  label: string;
  icon: React.ReactNode;
  action: () => void;
  variant?: 'default' | 'destructive';
  show?: boolean;
  disabled?: boolean;
}

export interface UnifiedContextMenuProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  itemName: string;
  itemType: ContextMenuItemType;
  selectedCount?: number;
  actions: ContextMenuAction[];
}

export const UnifiedContextMenu: React.FC<UnifiedContextMenuProps> = ({
  open,
  onOpenChange,
  itemName,
  itemType,
  selectedCount = 1,
  actions,
}) => {
  const isMultiple = selectedCount > 1;

  const getTypeLabel = () => {
    switch (itemType) {
      case 'image': return isMultiple ? 'images' : 'image';
      case 'project': return isMultiple ? 'projects' : 'project';
      case 'group': return isMultiple ? 'groups' : 'group';
      case 'annotation': return isMultiple ? 'annotations' : 'annotation';
      case 'artboard': return isMultiple ? 'artboards' : 'artboard';
      default: return isMultiple ? 'items' : 'item';
    }
  };

  const visibleActions = actions.filter(action => action.show !== false);

  return (
    <ActionSheet open={open} onOpenChange={onOpenChange}>
      <ActionSheetContent>
        <ActionSheetHeader>
          <ActionSheetTitle>
            {isMultiple ? `${selectedCount} ${getTypeLabel()} selected` : itemName}
          </ActionSheetTitle>
        </ActionSheetHeader>
        
        <div className="grid gap-1">
          {visibleActions.map((action) => (
            <ActionSheetItem
              key={action.id}
              icon={action.icon}
              variant={action.variant}
              disabled={action.disabled}
              onClick={() => {
                if (!action.disabled) {
                  action.action();
                  onOpenChange(false);
                }
              }}
            >
              {action.label}
            </ActionSheetItem>
          ))}
        </div>
      </ActionSheetContent>
    </ActionSheet>
  );
};

// Helper function to create common actions
export const createContextMenuActions = {
  view: (onView: () => void, itemType: ContextMenuItemType): ContextMenuAction => ({
    id: 'view',
    label: 'View',
    icon: <Eye className="h-5 w-5" />,
    action: onView,
    show: ['image', 'artboard'].includes(itemType),
  }),

  rename: (onRename: () => void, isMultiple: boolean): ContextMenuAction => ({
    id: 'rename',
    label: 'Rename',
    icon: <Edit3 className="h-5 w-5" />,
    action: onRename,
    show: !isMultiple,
  }),

  duplicate: (onDuplicate: () => void, selectedCount: number, typeLabel: string): ContextMenuAction => ({
    id: 'duplicate',
    label: selectedCount > 1 ? `Duplicate ${selectedCount} ${typeLabel}` : `Duplicate ${typeLabel}`,
    icon: <Copy className="h-5 w-5" />,
    action: onDuplicate,
  }),

  move: (onMove: () => void, selectedCount: number, typeLabel: string): ContextMenuAction => ({
    id: 'move',
    label: selectedCount > 1 ? `Move ${selectedCount} ${typeLabel}` : `Move ${typeLabel}`,
    icon: <Move className="h-5 w-5" />,
    action: onMove,
  }),

  group: (onGroup: () => void, selectedCount: number): ContextMenuAction => ({
    id: 'group',
    label: selectedCount > 1 ? `Group ${selectedCount} items` : 'Add to group',
    icon: <Layers className="h-5 w-5" />,
    action: onGroup,
    show: selectedCount >= 2,
  }),

  analyze: (onAnalyze: () => void, selectedCount: number, typeLabel: string, itemType: ContextMenuItemType): ContextMenuAction => ({
    id: 'analyze',
    label: selectedCount > 1 ? `Analyze ${selectedCount} ${typeLabel}` : `Analyze ${typeLabel}`,
    icon: <BarChart3 className="h-5 w-5" />,
    action: onAnalyze,
    show: ['image', 'artboard'].includes(itemType),
  }),

  download: (onDownload: () => void, selectedCount: number, typeLabel: string, itemType: ContextMenuItemType): ContextMenuAction => ({
    id: 'download',
    label: selectedCount > 1 ? `Download ${selectedCount} ${typeLabel}` : `Download ${typeLabel}`,
    icon: <Download className="h-5 w-5" />,
    action: onDownload,
    show: ['image', 'artboard', 'project'].includes(itemType),
  }),

  share: (onShare: () => void, selectedCount: number, typeLabel: string): ContextMenuAction => ({
    id: 'share',
    label: selectedCount > 1 ? `Share ${selectedCount} ${typeLabel}` : `Share ${typeLabel}`,
    icon: <Share2 className="h-5 w-5" />,
    action: onShare,
  }),

  favorite: (onFavorite: () => void, isFavorited: boolean): ContextMenuAction => ({
    id: 'favorite',
    label: isFavorited ? 'Remove from favorites' : 'Add to favorites',
    icon: <Star className="h-5 w-5" />,
    action: onFavorite,
  }),

  archive: (onArchive: () => void, isArchived: boolean): ContextMenuAction => ({
    id: 'archive',
    label: isArchived ? 'Unarchive' : 'Archive',
    icon: <Archive className="h-5 w-5" />,
    action: onArchive,
  }),

  delete: (onDelete: () => void, selectedCount: number, typeLabel: string): ContextMenuAction => ({
    id: 'delete',
    label: selectedCount > 1 ? `Delete ${selectedCount} ${typeLabel}` : `Delete ${typeLabel}`,
    icon: <Trash2 className="h-5 w-5" />,
    action: onDelete,
    variant: 'destructive' as const,
  }),
};