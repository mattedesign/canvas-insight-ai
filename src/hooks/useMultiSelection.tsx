import { useState, useCallback } from 'react';

export interface MultiSelectionState {
  selectedIds: string[];
  isMultiSelectMode: boolean;
  lastSelectedId?: string;
}

export const useMultiSelection = (allIds: string[] = []) => {
  const [state, setState] = useState<MultiSelectionState>({
    selectedIds: [],
    isMultiSelectMode: false,
    lastSelectedId: undefined,
  });

  const toggleSelection = useCallback((id: string, modifierKey: 'ctrl' | 'shift' | 'none' = 'none') => {
    setState(prev => {
      if (modifierKey === 'ctrl') {
        // Ctrl/Cmd+Click: Toggle individual items
        const newSelectedIds = prev.selectedIds.includes(id)
          ? prev.selectedIds.filter(selectedId => selectedId !== id)
          : [...prev.selectedIds, id];
        
        return {
          selectedIds: newSelectedIds,
          isMultiSelectMode: newSelectedIds.length > 1,
          lastSelectedId: id,
        };
      } else if (modifierKey === 'shift' && prev.lastSelectedId && allIds.length > 0) {
        // Shift+Click: Range selection
        const lastIndex = allIds.indexOf(prev.lastSelectedId);
        const currentIndex = allIds.indexOf(id);
        
        if (lastIndex !== -1 && currentIndex !== -1) {
          const start = Math.min(lastIndex, currentIndex);
          const end = Math.max(lastIndex, currentIndex);
          const rangeIds = allIds.slice(start, end + 1);
          
          return {
            selectedIds: rangeIds,
            isMultiSelectMode: rangeIds.length > 1,
            lastSelectedId: id,
          };
        }
      }
      
      // Regular click: Single selection
      return {
        selectedIds: [id],
        isMultiSelectMode: false,
        lastSelectedId: id,
      };
    });
  }, [allIds]);

  const selectMultiple = useCallback((ids: string[]) => {
    setState({
      selectedIds: ids,
      isMultiSelectMode: ids.length > 1,
      lastSelectedId: ids[ids.length - 1],
    });
  }, []);

  const clearSelection = useCallback(() => {
    setState({
      selectedIds: [],
      isMultiSelectMode: false,
      lastSelectedId: undefined,
    });
  }, []);

  const selectAll = useCallback((allIds: string[]) => {
    setState({
      selectedIds: allIds,
      isMultiSelectMode: allIds.length > 1,
      lastSelectedId: allIds[allIds.length - 1],
    });
  }, []);

  const isSelected = useCallback((id: string) => {
    return state.selectedIds.includes(id);
  }, [state.selectedIds]);

  const canGroup = useCallback(() => {
    return state.selectedIds.length >= 2;
  }, [state.selectedIds.length]);

  return {
    state,
    toggleSelection,
    selectMultiple,
    clearSelection,
    selectAll,
    isSelected,
    canGroup,
  };
};