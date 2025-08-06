import React from 'react';
import { 
  BarChart3,
  Check,
  Trash2,
  Eye,
  Copy,
  Move,
  Layers,
  Download,
  Share2
} from 'lucide-react';
import {
  ActionSheet,
  ActionSheetContent,
  ActionSheetHeader,
  ActionSheetTitle,
  ActionSheetItem,
} from '@/components/ui/action-sheet';
import { useIsMobile } from '@/hooks/use-mobile';

export interface CanvasContextMenuAction {
  id: string;
  label: string;
  icon: React.ReactNode;
  action: () => void;
  variant?: 'default' | 'destructive';
  show?: boolean;
}

export interface UnifiedCanvasContextMenuProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  itemName: string;
  itemId: string;
  itemType: 'image' | 'annotation' | 'group' | 'artboard';
  selectedCount?: number;
  isSelected?: boolean;
  onAnalyze?: () => void;
  onSelect?: () => void;
  onView?: () => void;
  onDuplicate?: () => void;
  onMove?: () => void;
  onGroup?: () => void;
  onDownload?: () => void;
  onShare?: () => void;
  onDelete?: () => void;
}

export const UnifiedCanvasContextMenu: React.FC<UnifiedCanvasContextMenuProps> = ({
  open,
  onOpenChange,
  itemName,
  itemId,
  itemType,
  selectedCount = 1,
  isSelected = false,
  onAnalyze,
  onSelect,
  onView,
  onDuplicate,
  onMove,
  onGroup,
  onDownload,
  onShare,
  onDelete,
}) => {
  const isMobile = useIsMobile();
  const isMultiple = selectedCount > 1;

  const getItemTypeLabel = () => {
    switch (itemType) {
      case 'image': return isMultiple ? 'images' : 'image';
      case 'annotation': return isMultiple ? 'annotations' : 'annotation';
      case 'group': return isMultiple ? 'groups' : 'group';
      case 'artboard': return isMultiple ? 'artboards' : 'artboard';
      default: return isMultiple ? 'items' : 'item';
    }
  };

  const createActions = (): CanvasContextMenuAction[] => [
    {
      id: 'analyze',
      icon: <BarChart3 className="h-5 w-5" />,
      label: isMultiple ? `Analyze ${selectedCount} ${getItemTypeLabel()}` : `Analyze ${getItemTypeLabel()}`,
      action: () => onAnalyze?.(),
      show: !!onAnalyze && (itemType === 'image' || itemType === 'artboard'),
    },
    {
      id: 'select',
      icon: <Check className="h-5 w-5" />,
      label: isSelected ? 'Deselect' : 'Select',
      action: () => onSelect?.(),
      show: !!onSelect && !isMultiple,
    },
    {
      id: 'view',
      icon: <Eye className="h-5 w-5" />,
      label: isMultiple ? `View ${selectedCount} ${getItemTypeLabel()}` : `View ${getItemTypeLabel()}`,
      action: () => onView?.(),
      show: !!onView && itemType === 'image',
    },
    {
      id: 'duplicate',
      icon: <Copy className="h-5 w-5" />,
      label: isMultiple ? `Duplicate ${selectedCount} ${getItemTypeLabel()}` : `Duplicate ${getItemTypeLabel()}`,
      action: () => onDuplicate?.(),
      show: !!onDuplicate,
    },
    {
      id: 'move',
      icon: <Move className="h-5 w-5" />,
      label: isMultiple ? `Move ${selectedCount} ${getItemTypeLabel()}` : `Move ${getItemTypeLabel()}`,
      action: () => onMove?.(),
      show: !!onMove,
    },
    {
      id: 'group',
      icon: <Layers className="h-5 w-5" />,
      label: isMultiple ? `Group ${selectedCount} ${getItemTypeLabel()}` : 'Add to group',
      action: () => onGroup?.(),
      show: !!onGroup && selectedCount > 1,
    },
    {
      id: 'download',
      icon: <Download className="h-5 w-5" />,
      label: isMultiple ? `Download ${selectedCount} ${getItemTypeLabel()}` : `Download ${getItemTypeLabel()}`,
      action: () => onDownload?.(),
      show: !!onDownload && (itemType === 'image' || itemType === 'artboard'),
    },
    {
      id: 'share',
      icon: <Share2 className="h-5 w-5" />,
      label: isMultiple ? `Share ${selectedCount} ${getItemTypeLabel()}` : `Share ${getItemTypeLabel()}`,
      action: () => onShare?.(),
      show: !!onShare,
    },
    {
      id: 'delete',
      icon: <Trash2 className="h-5 w-5" />,
      label: isMultiple ? `Delete ${selectedCount} ${getItemTypeLabel()}` : `Delete ${getItemTypeLabel()}`,
      action: () => onDelete?.(),
      show: !!onDelete,
      variant: 'destructive' as const,
    },
  ];

  const visibleActions = createActions().filter(action => action.show !== false);

  return (
    <ActionSheet open={open} onOpenChange={onOpenChange}>
      <ActionSheetContent>
        <ActionSheetHeader>
          <ActionSheetTitle>
            {isMultiple ? `${selectedCount} ${getItemTypeLabel()} selected` : itemName}
          </ActionSheetTitle>
        </ActionSheetHeader>
        
        <div className="grid gap-1">
          {visibleActions.map((action) => (
            <ActionSheetItem
              key={action.id}
              icon={action.icon}
              variant={action.variant}
              onClick={() => {
                action.action();
                onOpenChange(false);
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