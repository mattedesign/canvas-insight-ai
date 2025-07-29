import { useState, useCallback, useRef } from 'react';
import { Node, Edge } from '@xyflow/react';

interface HistoryState {
  nodes: Node[];
  edges: Edge[];
}

export const useUndoRedo = (initialNodes: Node[], initialEdges: Edge[]) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const history = useRef<HistoryState[]>([
    { nodes: initialNodes, edges: initialEdges }
  ]);
  const isUpdating = useRef(false);

  const saveState = useCallback((nodes: Node[], edges: Edge[]) => {
    // Prevent infinite loops when restoring state
    if (isUpdating.current) return;
    
    // Use current index from ref to avoid stale closure
    const currentIdx = currentIndex;
    const newHistory = history.current.slice(0, currentIdx + 1);
    newHistory.push({ nodes: [...nodes], edges: [...edges] });
    
    // Limit history size to prevent memory issues
    if (newHistory.length > 50) {
      newHistory.shift();
    } else {
      setCurrentIndex(prev => prev + 1);
    }
    
    history.current = newHistory;
  }, [currentIndex]);

  const undo = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
      return history.current[currentIndex - 1];
    }
    return null;
  }, [currentIndex]);

  const redo = useCallback(() => {
    if (currentIndex < history.current.length - 1) {
      setCurrentIndex(prev => prev + 1);
      return history.current[currentIndex + 1];
    }
    return null;
  }, [currentIndex]);

  const setIsUpdating = useCallback((value: boolean) => {
    isUpdating.current = value;
  }, []);

  const canUndo = currentIndex > 0;
  const canRedo = currentIndex < history.current.length - 1;

  return {
    saveState,
    undo,
    redo,
    canUndo,
    canRedo,
    setIsUpdating,
  };
};