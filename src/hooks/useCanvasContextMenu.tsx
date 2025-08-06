import { useState, useCallback } from 'react';
import { useMultiSelection } from './useMultiSelection';
import { CanvasItemDeletionDialog } from '@/components/CanvasItemDeletionDialog';
import { UnifiedCanvasContextMenu } from '@/components/UnifiedCanvasContextMenu';

export interface CanvasItem {
  id: string;
  name: string;
  type: 'image' | 'annotation' | 'group' | 'artboard';
}

export interface CanvasContextMenuHandlers {
  onAnalyze?: (itemIds: string[]) => void;
  onView?: (itemId: string) => void;
  onDuplicate?: (itemIds: string[]) => void;
  onMove?: (itemIds: string[]) => void;
  onGroup?: (itemIds: string[]) => void;
  onDownload?: (itemIds: string[]) => void;
  onShare?: (itemIds: string[]) => void;
  onDelete?: (itemIds: string[]) => void;
}

export const useCanvasContextMenu = (
  items: CanvasItem[],
  handlers: CanvasContextMenuHandlers = {}
) => {
  const [contextMenuOpen, setContextMenuOpen] = useState(false);
  const [contextMenuItem, setContextMenuItem] = useState<CanvasItem | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const {
    state: { selectedIds },
    toggleSelection,
    selectMultiple,
    clearSelection,
    isSelected,
    canGroup
  } = useMultiSelection(items.map(item => item.id));

  const openContextMenu = useCallback((item: CanvasItem) => {
    setContextMenuItem(item);
    setContextMenuOpen(true);
  }, []);

  const closeContextMenu = useCallback(() => {
    setContextMenuOpen(false);
    setContextMenuItem(null);
  }, []);

  const handleSelect = useCallback(() => {
    if (!contextMenuItem) return;
    
    const isCurrentlySelected = isSelected(contextMenuItem.id);
    toggleSelection(contextMenuItem.id, 'none');
    
    // Close context menu after selection
    closeContextMenu();
  }, [contextMenuItem, isSelected, toggleSelection, closeContextMenu]);

  const handleAnalyze = useCallback(() => {
    if (!contextMenuItem) return;
    
    const targetIds = isSelected(contextMenuItem.id) 
      ? selectedIds.length > 0 ? selectedIds : [contextMenuItem.id]
      : [contextMenuItem.id];
    
    handlers.onAnalyze?.(targetIds);
    closeContextMenu();
  }, [contextMenuItem, selectedIds, isSelected, handlers, closeContextMenu]);

  const handleView = useCallback(() => {
    if (!contextMenuItem) return;
    
    handlers.onView?.(contextMenuItem.id);
    closeContextMenu();
  }, [contextMenuItem, handlers, closeContextMenu]);

  const handleDuplicate = useCallback(() => {
    if (!contextMenuItem) return;
    
    const targetIds = isSelected(contextMenuItem.id) 
      ? selectedIds.length > 0 ? selectedIds : [contextMenuItem.id]
      : [contextMenuItem.id];
    
    handlers.onDuplicate?.(targetIds);
    closeContextMenu();
  }, [contextMenuItem, selectedIds, isSelected, handlers, closeContextMenu]);

  const handleMove = useCallback(() => {
    if (!contextMenuItem) return;
    
    const targetIds = isSelected(contextMenuItem.id) 
      ? selectedIds.length > 0 ? selectedIds : [contextMenuItem.id]
      : [contextMenuItem.id];
    
    handlers.onMove?.(targetIds);
    closeContextMenu();
  }, [contextMenuItem, selectedIds, isSelected, handlers, closeContextMenu]);

  const handleGroup = useCallback(() => {
    if (!contextMenuItem) return;
    
    const targetIds = selectedIds.length > 1 ? selectedIds : [contextMenuItem.id];
    
    handlers.onGroup?.(targetIds);
    closeContextMenu();
  }, [contextMenuItem, selectedIds, handlers, closeContextMenu]);

  const handleDownload = useCallback(() => {
    if (!contextMenuItem) return;
    
    const targetIds = isSelected(contextMenuItem.id) 
      ? selectedIds.length > 0 ? selectedIds : [contextMenuItem.id]
      : [contextMenuItem.id];
    
    handlers.onDownload?.(targetIds);
    closeContextMenu();
  }, [contextMenuItem, selectedIds, isSelected, handlers, closeContextMenu]);

  const handleShare = useCallback(() => {
    if (!contextMenuItem) return;
    
    const targetIds = isSelected(contextMenuItem.id) 
      ? selectedIds.length > 0 ? selectedIds : [contextMenuItem.id]
      : [contextMenuItem.id];
    
    handlers.onShare?.(targetIds);
    closeContextMenu();
  }, [contextMenuItem, selectedIds, isSelected, handlers, closeContextMenu]);

  const handleDeleteRequest = useCallback(() => {
    setDeleteDialogOpen(true);
  }, []);

  const handleDeleteConfirm = useCallback(async () => {
    if (!contextMenuItem) return;
    
    setIsDeleting(true);
    
    try {
      const targetIds = isSelected(contextMenuItem.id) 
        ? selectedIds.length > 0 ? selectedIds : [contextMenuItem.id]
        : [contextMenuItem.id];
      
      await handlers.onDelete?.(targetIds);
      
      // Clear selection after successful deletion
      clearSelection();
    } catch (error) {
      console.error('Error deleting items:', error);
    } finally {
      setIsDeleting(false);
      setDeleteDialogOpen(false);
      closeContextMenu();
    }
  }, [contextMenuItem, selectedIds, isSelected, handlers, clearSelection, closeContextMenu]);

  const handleDeleteCancel = useCallback(() => {
    setDeleteDialogOpen(false);
  }, []);

  const getSelectedCount = useCallback(() => {
    if (!contextMenuItem) return 1;
    return isSelected(contextMenuItem.id) && selectedIds.length > 0 ? selectedIds.length : 1;
  }, [contextMenuItem, selectedIds, isSelected]);

  const contextMenuProps = contextMenuItem ? {
    open: contextMenuOpen,
    onOpenChange: setContextMenuOpen,
    itemName: contextMenuItem.name,
    itemId: contextMenuItem.id,
    itemType: contextMenuItem.type,
    selectedCount: getSelectedCount(),
    isSelected: isSelected(contextMenuItem.id),
    onAnalyze: handlers.onAnalyze ? handleAnalyze : undefined,
    onSelect: handleSelect,
    onView: handlers.onView ? handleView : undefined,
    onDuplicate: handlers.onDuplicate ? handleDuplicate : undefined,
    onMove: handlers.onMove ? handleMove : undefined,
    onGroup: handlers.onGroup && (canGroup() || selectedIds.length > 1) ? handleGroup : undefined,
    onDownload: handlers.onDownload ? handleDownload : undefined,
    onShare: handlers.onShare ? handleShare : undefined,
    onDelete: handlers.onDelete ? handleDeleteRequest : undefined,
  } : null;

  const deleteDialogProps = contextMenuItem ? {
    isOpen: deleteDialogOpen,
    onClose: handleDeleteCancel,
    onConfirm: handleDeleteConfirm,
    itemCount: getSelectedCount(),
    itemType: contextMenuItem.type,
    isDeleting,
  } : null;

  return {
    // Selection state
    selectedIds,
    selectMultiple,
    clearSelection,
    isSelected,
    canGroup: canGroup(),
    
    // Context menu
    openContextMenu,
    closeContextMenu,
    contextMenuProps,
    
    // Delete dialog
    deleteDialogProps,
    
    // Components (render these in your component)
    ContextMenu: contextMenuProps ? () => (
      <UnifiedCanvasContextMenu {...contextMenuProps} />
    ) : null,
    
    DeleteDialog: deleteDialogProps ? () => (
      <CanvasItemDeletionDialog {...deleteDialogProps} />
    ) : null,
  };
};