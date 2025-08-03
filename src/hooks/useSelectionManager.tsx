import { useCallback } from 'react';
import { useMultiSelection } from './useMultiSelection';

export interface SelectionManagerProps {
  items: Array<{ id: string; [key: string]: any }>;
  onSelectionChange?: (selectedIds: string[]) => void;
}

export const useSelectionManager = ({ items, onSelectionChange }: SelectionManagerProps) => {
  const allIds = items.map(item => item.id);
  const multiSelection = useMultiSelection(allIds);

  const handleItemClick = useCallback((
    id: string, 
    event: React.MouseEvent
  ) => {
    const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
    const isCtrlOrCmd = isMac ? event.metaKey : event.ctrlKey;
    const isShift = event.shiftKey;

    let modifierKey: 'ctrl' | 'shift' | 'none' = 'none';
    if (isCtrlOrCmd) modifierKey = 'ctrl';
    else if (isShift) modifierKey = 'shift';

    multiSelection.toggleSelection(id, modifierKey);
    onSelectionChange?.(multiSelection.state.selectedIds);
  }, [multiSelection, onSelectionChange]);

  const handleSelectAll = useCallback(() => {
    multiSelection.selectAll(allIds);
    onSelectionChange?.(allIds);
  }, [multiSelection, allIds, onSelectionChange]);

  const handleClearSelection = useCallback(() => {
    multiSelection.clearSelection();
    onSelectionChange?.([]);
  }, [multiSelection, onSelectionChange]);

  const handleDelete = useCallback(() => {
    if (multiSelection.state.selectedIds.length > 0) {
      // This should be implemented by the parent component
      console.log('Delete selected items:', multiSelection.state.selectedIds);
    }
  }, [multiSelection.state.selectedIds]);

  const handleGroup = useCallback(() => {
    if (multiSelection.canGroup()) {
      // This should be implemented by the parent component
      console.log('Group selected items:', multiSelection.state.selectedIds);
    }
  }, [multiSelection]);

  return {
    ...multiSelection,
    handleItemClick,
    handleSelectAll,
    handleClearSelection,
    handleDelete,
    handleGroup,
    selectedCount: multiSelection.state.selectedIds.length,
  };
};