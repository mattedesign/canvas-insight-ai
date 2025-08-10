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
      
      let newState;
      
      if (modifierKey === 'ctrl') {
        // Ctrl/Cmd+Click: Toggle individual items
        const newSelectedIds = prev.selectedIds.includes(id)
          ? prev.selectedIds.filter(selectedId => selectedId !== id)
          : [...prev.selectedIds, id];
        
        newState = {
          selectedIds: newSelectedIds,
          isMultiSelectMode: newSelectedIds.length > 1,
          lastSelectedId: id,
        };
      } else if (modifierKey === 'shift') {
        // Shift+Click: Add range to existing selection (persist selection)
        if (prev.lastSelectedId && allIds.length > 0) {
          const lastIndex = allIds.indexOf(prev.lastSelectedId);
          const currentIndex = allIds.indexOf(id);
          if (lastIndex !== -1 && currentIndex !== -1) {
            const start = Math.min(lastIndex, currentIndex);
            const end = Math.max(lastIndex, currentIndex);
            const rangeIds = allIds.slice(start, end + 1);
            const merged = Array.from(new Set([...prev.selectedIds, ...rangeIds]));
            newState = {
              selectedIds: merged,
              isMultiSelectMode: merged.length > 1,
              lastSelectedId: id,
            };
          } else {
            const merged = prev.selectedIds.includes(id)
              ? prev.selectedIds
              : [...prev.selectedIds, id];
            newState = {
              selectedIds: merged,
              isMultiSelectMode: merged.length > 1,
              lastSelectedId: id,
            };
          }
        } else {
          // No anchor yet: add just the clicked item
          const merged = prev.selectedIds.includes(id)
            ? prev.selectedIds
            : [...prev.selectedIds, id];
          newState = {
            selectedIds: merged,
            isMultiSelectMode: merged.length > 1,
            lastSelectedId: id,
          };
        }
      } else {
        // Regular click: Single selection
        newState = {
          selectedIds: [id],
          isMultiSelectMode: false,
          lastSelectedId: id,
        };
      }
      
      
      return newState;
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