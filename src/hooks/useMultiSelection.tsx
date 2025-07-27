import { useState, useCallback } from 'react';

export interface MultiSelectionState {
  selectedIds: string[];
  isMultiSelectMode: boolean;
}

export const useMultiSelection = () => {
  const [state, setState] = useState<MultiSelectionState>({
    selectedIds: [],
    isMultiSelectMode: false,
  });

  const toggleSelection = useCallback((id: string, isCtrlOrCmd: boolean) => {
    setState(prev => {
      if (isCtrlOrCmd) {
        // Multi-select mode
        const newSelectedIds = prev.selectedIds.includes(id)
          ? prev.selectedIds.filter(selectedId => selectedId !== id)
          : [...prev.selectedIds, id];
        
        return {
          selectedIds: newSelectedIds,
          isMultiSelectMode: newSelectedIds.length > 1,
        };
      } else {
        // Single select mode
        return {
          selectedIds: [id],
          isMultiSelectMode: false,
        };
      }
    });
  }, []);

  const selectMultiple = useCallback((ids: string[]) => {
    setState({
      selectedIds: ids,
      isMultiSelectMode: ids.length > 1,
    });
  }, []);

  const clearSelection = useCallback(() => {
    setState({
      selectedIds: [],
      isMultiSelectMode: false,
    });
  }, []);

  const selectAll = useCallback((allIds: string[]) => {
    setState({
      selectedIds: allIds,
      isMultiSelectMode: allIds.length > 1,
    });
  }, []);

  const isSelected = useCallback((id: string) => {
    return state.selectedIds.includes(id);
  }, [state.selectedIds]);

  return {
    state,
    toggleSelection,
    selectMultiple,
    clearSelection,
    selectAll,
    isSelected,
  };
};