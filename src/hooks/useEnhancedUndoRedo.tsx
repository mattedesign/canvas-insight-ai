/**
 * Enhanced Undo/Redo Hook
 * Manages full application state history, not just React Flow nodes/edges
 */

import { useState, useCallback, useRef } from 'react';
import { Node, Edge } from '@xyflow/react';
import type { AppState } from '@/context/AppStateTypes';

interface HistoryState {
  // Canvas state
  nodes: Node[];
  edges: Edge[];
  
  // App state snapshot
  appState: {
    uploadedImages: AppState['uploadedImages'];
    analyses: AppState['analyses'];
    imageGroups: AppState['imageGroups'];
    selectedImageId: AppState['selectedImageId'];
    showAnnotations: AppState['showAnnotations'];
  };
  
  // Metadata
  timestamp: number;
  operationType: 'node_move' | 'group_create' | 'image_upload' | 'analysis_complete' | 'manual';
}

interface UseEnhancedUndoRedoOptions {
  maxHistorySize?: number;
  debounceTime?: number;
}

export const useEnhancedUndoRedo = (
  initialNodes: Node[], 
  initialEdges: Edge[],
  appState: AppState,
  options: UseEnhancedUndoRedoOptions = {}
) => {
  const { maxHistorySize = 50, debounceTime = 500 } = options;
  
  const [currentIndex, setCurrentIndex] = useState(0);
  const history = useRef<HistoryState[]>([
    {
      nodes: initialNodes,
      edges: initialEdges,
      appState: {
        uploadedImages: appState.uploadedImages,
        analyses: appState.analyses,
        imageGroups: appState.imageGroups,
        selectedImageId: appState.selectedImageId,
        showAnnotations: appState.showAnnotations
      },
      timestamp: Date.now(),
      operationType: 'manual'
    }
  ]);
  const isUpdating = useRef(false);
  const lastSaveTime = useRef(Date.now());

  const saveState = useCallback((
    nodes: Node[], 
    edges: Edge[], 
    currentAppState?: AppState,
    operationType: HistoryState['operationType'] = 'manual'
  ) => {
    // Prevent infinite loops when restoring state
    if (isUpdating.current) return;
    
    // Debounce rapid saves
    const now = Date.now();
    if (now - lastSaveTime.current < debounceTime) return;
    lastSaveTime.current = now;
    
    // Use current index from ref to avoid stale closure
    const currentIdx = currentIndex;
    const newHistory = history.current.slice(0, currentIdx + 1);
    
    const newState: HistoryState = {
      nodes: [...nodes],
      edges: [...edges],
      appState: {
        uploadedImages: (currentAppState || appState).uploadedImages,
        analyses: (currentAppState || appState).analyses,
        imageGroups: (currentAppState || appState).imageGroups,
        selectedImageId: (currentAppState || appState).selectedImageId,
        showAnnotations: (currentAppState || appState).showAnnotations
      },
      timestamp: now,
      operationType
    };
    
    newHistory.push(newState);
    
    // Limit history size to prevent memory issues
    if (newHistory.length > maxHistorySize) {
      newHistory.shift();
    } else {
      setCurrentIndex(prev => prev + 1);
    }
    
    history.current = newHistory;
  }, [currentIndex, debounceTime, maxHistorySize, appState]);

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

  const getHistoryInfo = useCallback(() => {
    return {
      currentIndex,
      totalStates: history.current.length,
      canUndo: currentIndex > 0,
      canRedo: currentIndex < history.current.length - 1,
      currentState: history.current[currentIndex],
      recentOperations: history.current
        .slice(-5)
        .map(state => ({
          operationType: state.operationType,
          timestamp: state.timestamp,
          nodesCount: state.nodes.length,
          imagesCount: state.appState.uploadedImages.length
        }))
    };
  }, [currentIndex]);

  const jumpToState = useCallback((index: number) => {
    if (index >= 0 && index < history.current.length) {
      setCurrentIndex(index);
      return history.current[index];
    }
    return null;
  }, []);

  const clearHistory = useCallback(() => {
    const currentState = history.current[currentIndex];
    history.current = [currentState];
    setCurrentIndex(0);
  }, [currentIndex]);

  const canUndo = currentIndex > 0;
  const canRedo = currentIndex < history.current.length - 1;

  return {
    saveState,
    undo,
    redo,
    canUndo,
    canRedo,
    setIsUpdating,
    getHistoryInfo,
    jumpToState,
    clearHistory
  };
};