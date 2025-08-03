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
  Share2
} from 'lucide-react';
import {
  ActionSheet,
  ActionSheetContent,
  ActionSheetHeader,
  ActionSheetTitle,
  ActionSheetItem,
} from '@/components/ui/action-sheet';

export interface CanvasContextMenuProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  nodeName: string;
  nodeId: string;
  nodeType: 'image' | 'artboard' | 'group' | 'annotation';
  selectedCount?: number;
  onRename?: () => void;
  onDelete?: () => void;
  onDuplicate?: () => void;
  onMove?: () => void;
  onAnalyze?: () => void;
  onGroup?: () => void;
  onView?: () => void;
  onDownload?: () => void;
  onShare?: () => void;
}

export const CanvasContextMenu: React.FC<CanvasContextMenuProps> = ({
  open,
  onOpenChange,
  nodeName,
  nodeId,
  nodeType,
  selectedCount = 1,
  onRename,
  onDelete,
  onDuplicate,
  onMove,
  onAnalyze,
  onGroup,
  onView,
  onDownload,
  onShare,
}) => {
  const isMultiple = selectedCount > 1;

  const getNodeTypeLabel = () => {
    switch (nodeType) {
      case 'image': return isMultiple ? 'images' : 'image';
      case 'artboard': return isMultiple ? 'artboards' : 'artboard';
      case 'group': return isMultiple ? 'groups' : 'group';
      case 'annotation': return isMultiple ? 'annotations' : 'annotation';
      default: return isMultiple ? 'items' : 'item';
    }
  };

  const menuItems = [
    {
      icon: <Eye className="h-5 w-5" />,
      label: isMultiple ? `View ${selectedCount} ${getNodeTypeLabel()}` : `View ${getNodeTypeLabel()}`,
      action: onView,
      show: !!onView && nodeType === 'image',
    },
    {
      icon: <Edit3 className="h-5 w-5" />,
      label: 'Rename',
      action: onRename,
      show: !!onRename && !isMultiple,
    },
    {
      icon: <Copy className="h-5 w-5" />,
      label: isMultiple ? `Duplicate ${selectedCount} ${getNodeTypeLabel()}` : `Duplicate ${getNodeTypeLabel()}`,
      action: onDuplicate,
      show: !!onDuplicate,
    },
    {
      icon: <Move className="h-5 w-5" />,
      label: isMultiple ? `Move ${selectedCount} ${getNodeTypeLabel()}` : `Move ${getNodeTypeLabel()}`,
      action: onMove,
      show: !!onMove,
    },
    {
      icon: <Layers className="h-5 w-5" />,
      label: isMultiple ? `Group ${selectedCount} ${getNodeTypeLabel()}` : 'Add to group',
      action: onGroup,
      show: !!onGroup && selectedCount > 1,
    },
    {
      icon: <BarChart3 className="h-5 w-5" />,
      label: isMultiple ? `Analyze ${selectedCount} ${getNodeTypeLabel()}` : `Analyze ${getNodeTypeLabel()}`,
      action: onAnalyze,
      show: !!onAnalyze && (nodeType === 'image' || nodeType === 'artboard'),
    },
    {
      icon: <Download className="h-5 w-5" />,
      label: isMultiple ? `Download ${selectedCount} ${getNodeTypeLabel()}` : `Download ${getNodeTypeLabel()}`,
      action: onDownload,
      show: !!onDownload && (nodeType === 'image' || nodeType === 'artboard'),
    },
    {
      icon: <Share2 className="h-5 w-5" />,
      label: isMultiple ? `Share ${selectedCount} ${getNodeTypeLabel()}` : `Share ${getNodeTypeLabel()}`,
      action: onShare,
      show: !!onShare,
    },
    {
      icon: <Trash2 className="h-5 w-5" />,
      label: isMultiple ? `Delete ${selectedCount} ${getNodeTypeLabel()}` : `Delete ${getNodeTypeLabel()}`,
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
            {isMultiple ? `${selectedCount} ${getNodeTypeLabel()} selected` : nodeName}
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