/**
 * Comprehensive Canvas State Manager
 * Coordinates all canvas state operations and prevents race conditions
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { Node, Edge, Viewport } from '@xyflow/react';
import { useUndoRedo } from '@/hooks/useUndoRedo';
import { useOptimisticUpdates } from '@/hooks/useOptimisticUpdates';
import { useOfflineCache } from '@/hooks/useOfflineCache';
import { CanvasStateService } from '@/services/CanvasStateService';
import { atomicStateManager } from '@/services/AtomicStateManager';
import { useFilteredToast } from '@/hooks/use-filtered-toast';
import type { AppState } from '@/context/AppStateTypes';
import type { UploadedImage, UXAnalysis, ImageGroup } from '@/types/ux-analysis';
import type { CanvasState as SavedCanvasState } from '@/services/CanvasStateService';

interface CanvasState {
  nodes: Node[];
  edges: Edge[];
  viewport: Viewport;
  selectedNodes: string[];
  canvasSettings: {
    showAnnotations: boolean;
    currentTool: 'cursor' | 'draw';
    zoom: number;
  };
}

interface CanvasStateManagerOptions {
  projectId: string;
  appState: AppState;
  onStateChange?: (state: CanvasState) => void;
  autoSaveInterval?: number;
}

export function useCanvasStateManager({
  projectId,
  appState,
  onStateChange,
  autoSaveInterval = 2000
}: CanvasStateManagerOptions) {
  const [canvasState, setCanvasState] = useState<CanvasState>({
    nodes: [],
    edges: [],
    viewport: { x: 0, y: 0, zoom: 1 },
    selectedNodes: [],
    canvasSettings: {
      showAnnotations: true,
      currentTool: 'cursor',
      zoom: 1
    }
  });

  const { toast } = useFilteredToast();
  const isInitialized = useRef(false);
  const lastSaveTime = useRef<number>(0);
  const pendingChanges = useRef<boolean>(false);

  // Offline cache for canvas operations
  const offlineCache = useOfflineCache();
  
  // Optimistic updates for canvas operations
  const optimisticUpdates = useOptimisticUpdates();

  // Enhanced undo/redo that includes full app state
  const undoRedoManager = useUndoRedo(canvasState.nodes, canvasState.edges);

  // Load initial canvas state
  useEffect(() => {
    if (!projectId || projectId === 'temp-project' || isInitialized.current) return;
    
    const loadCanvasState = async () => {
      try {
        const savedState = await CanvasStateService.loadCanvasState();
        if (savedState) {
          // Convert saved state to canvas state
          const restoredState: CanvasState = {
            nodes: savedState.nodes || [],
            edges: savedState.edges || [],
            viewport: savedState.viewport,
            selectedNodes: savedState.ui_state?.selectedNodes || [],
            canvasSettings: {
              showAnnotations: savedState.ui_state?.showAnnotations ?? true,
              currentTool: savedState.ui_state?.galleryTool || 'cursor',
              zoom: savedState.viewport.zoom
            }
          };
          
          setCanvasState(restoredState);
          undoRedoManager.setIsUpdating(true);
          undoRedoManager.saveState(restoredState.nodes, restoredState.edges);
          undoRedoManager.setIsUpdating(false);
        } else {
          // Initialize with current app state
          initializeFromAppState();
        }
        isInitialized.current = true;
      } catch (error) {
        console.error('Failed to load canvas state:', error);
        initializeFromAppState();
        isInitialized.current = true;
      }
    };

    loadCanvasState();
  }, [projectId]);

  // Initialize canvas from app state
  const initializeFromAppState = useCallback(() => {
    console.log('Initializing canvas from app state with', appState.uploadedImages.length, 'images');
    const initialState: CanvasState = {
      nodes: generateNodesFromAppState(appState),
      edges: generateEdgesFromAppState(appState),
      viewport: { x: 0, y: 0, zoom: 1 },
      selectedNodes: [],
      canvasSettings: {
        showAnnotations: appState.showAnnotations,
        currentTool: 'cursor',
        zoom: 1
      }
    };
    
    setCanvasState(initialState);
    undoRedoManager.saveState(initialState.nodes, initialState.edges);
    isInitialized.current = true; // Mark as initialized here too
  }, [appState, undoRedoManager]);

  // Auto-save mechanism
  useEffect(() => {
    if (!pendingChanges.current) return;

    const saveTimeout = setTimeout(async () => {
      await performAutoSave();
      pendingChanges.current = false;
    }, autoSaveInterval);

    return () => clearTimeout(saveTimeout);
  }, [canvasState, autoSaveInterval]);

  // Perform auto-save
  const performAutoSave = useCallback(async () => {
    // Don't save with temporary project ID
    if (projectId === 'temp-project') return;
    
    const now = Date.now();
    if (now - lastSaveTime.current < 1000) return; // Debounce saves

    const operationId = `canvas-autosave-${now}`;
    
    await atomicStateManager.executeOperation(
      operationId,
      'SYNC',
      async () => {
        const saveData = {
          nodes: canvasState.nodes,
          edges: canvasState.edges,
          viewport: canvasState.viewport,
          ui_state: {
            showAnnotations: canvasState.canvasSettings.showAnnotations,
            galleryTool: canvasState.canvasSettings.currentTool,
            groupDisplayModes: {},
            selectedNodes: canvasState.selectedNodes
          }
        };
        
        const result = await CanvasStateService.saveCanvasState(saveData);
        offlineCache.set(`canvas-${projectId}`, canvasState, 'high', 'synced');
        lastSaveTime.current = now;
        return (result as any).success;
      }
    );
  }, [canvasState, projectId, offlineCache]);

  // Update canvas state with race condition prevention
  const updateCanvasState = useCallback(async (updates: Partial<CanvasState>) => {
    const operationId = `canvas-update-${Date.now()}`;
    
    const result = await atomicStateManager.executeOperation(
      operationId,
      'SYNC',
      async () => {
        setCanvasState(prevState => {
          const newState = { ...prevState, ...updates };
          
          // Save to undo/redo history if nodes or edges changed
          if (updates.nodes || updates.edges) {
            undoRedoManager.saveState(newState.nodes, newState.edges);
          }
          
          pendingChanges.current = true;
          onStateChange?.(newState);
          
          return newState;
        });
        
        return true;
      }
    );

    if (!result.success) {
      console.error('Failed to update canvas state:', result.error);
      toast({
        title: "Canvas Update Failed",
        description: "Failed to update canvas state. Changes may be lost.",
        category: "error",
        variant: "destructive"
      });
    }
  }, [undoRedoManager, onStateChange, toast]);

  // Optimistic node operations
  const optimisticNodeMove = useCallback(async (nodeId: string, position: { x: number; y: number }) => {
    const operationId = optimisticUpdates.createOptimisticOperation(
      'update',
      'image',
      { nodeId, position }
    );

    // Immediately update UI
    setCanvasState(prev => ({
      ...prev,
      nodes: prev.nodes.map(node => 
        node.id === nodeId 
          ? { ...node, position }
          : node
      )
    }));

    try {
      await updateCanvasState({
        nodes: canvasState.nodes.map(node => 
          node.id === nodeId 
            ? { ...node, position }
            : node
        )
      });
      
      optimisticUpdates.confirmOperation(operationId);
    } catch (error) {
      optimisticUpdates.failOperation(operationId, (error as Error).message);
      // Revert optimistic update
      setCanvasState(prev => ({
        ...prev,
        nodes: canvasState.nodes // Revert to original state
      }));
    }
  }, [canvasState.nodes, optimisticUpdates, updateCanvasState]);

  // Group creation with optimistic updates
  const createGroupOptimistic = useCallback(async (
    name: string,
    imageIds: string[],
    position: { x: number; y: number }
  ) => {
    const groupId = `group-${Date.now()}`;
    const newGroup: ImageGroup = {
      id: groupId,
      name,
      description: '',
      color: '#3b82f6',
      imageIds,
      position,
      createdAt: new Date()
    };

    const { tempGroup, operationId, confirm } = optimisticUpdates.optimisticGroupCreate(
      newGroup,
      async (group) => group
    );

    // Immediately add to canvas
    const groupNode: Node = {
      id: `group-container-${groupId}`,
      type: 'group',
      position,
      data: { group: newGroup },
      style: { width: 400, height: 300 }
    };

    setCanvasState(prev => ({
      ...prev,
      nodes: [...prev.nodes, groupNode]
    }));

    try {
      await updateCanvasState({
        nodes: [...canvasState.nodes, groupNode]
      });
      
      await confirm();
      
      toast({
        title: "Group Created",
        description: `Created group "${name}" with ${imageIds.length} images`,
        category: "success"
      });
    } catch (error) {
      optimisticUpdates.failOperation(operationId, (error as Error).message);
      // Remove optimistic group node
      setCanvasState(prev => ({
        ...prev,
        nodes: prev.nodes.filter(node => node.id !== `group-container-${groupId}`)
      }));
      
      toast({
        title: "Group Creation Failed",
        description: "Failed to create group. Please try again.",
        category: "error",
        variant: "destructive"
      });
    }
  }, [canvasState.nodes, optimisticUpdates, updateCanvasState, toast]);

  // Enhanced undo/redo operations
  const performUndo = useCallback(async () => {
    const operationId = `undo-${Date.now()}`;
    
    await atomicStateManager.executeOperation(
      operationId,
      'LOAD',
      async () => {
        const previousState = undoRedoManager.undo();
        if (previousState) {
          undoRedoManager.setIsUpdating(true);
          await updateCanvasState({
            nodes: previousState.nodes,
            edges: previousState.edges
          });
          undoRedoManager.setIsUpdating(false);
          
          toast({
            title: "Undo",
            description: "Reverted to previous state",
            category: "action-required"
          });
        }
        return true;
      }
    );
  }, [undoRedoManager, updateCanvasState, toast]);

  const performRedo = useCallback(async () => {
    const operationId = `redo-${Date.now()}`;
    
    await atomicStateManager.executeOperation(
      operationId,
      'LOAD',
      async () => {
        const nextState = undoRedoManager.redo();
        if (nextState) {
          undoRedoManager.setIsUpdating(true);
          await updateCanvasState({
            nodes: nextState.nodes,
            edges: nextState.edges
          });
          undoRedoManager.setIsUpdating(false);
          
          toast({
            title: "Redo",
            description: "Applied next state",
            category: "action-required"
          });
        }
        return true;
      }
    );
  }, [undoRedoManager, updateCanvasState, toast]);

  // Sync canvas state when app state changes
  useEffect(() => {
    if (!isInitialized.current) return;
    
    // Preserve existing node positions
    const existingPositions = canvasState.nodes.reduce((acc, node) => {
      acc[node.id] = node.position;
      return acc;
    }, {} as Record<string, { x: number; y: number }>);
    
    const newNodes = generateNodesFromAppState(appState, existingPositions);
    const newEdges = generateEdgesFromAppState(appState);
    
    // Only update if there are actual changes to prevent infinite loops
    // Use shallow comparison instead of deep JSON.stringify to avoid recursion issues
    const hasNodeChanges = newNodes.length !== canvasState.nodes.length || 
      newNodes.some(newNode => {
        const existingNode = canvasState.nodes.find(n => n.id === newNode.id);
        return !existingNode || 
               existingNode.type !== newNode.type ||
               existingNode.position.x !== newNode.position.x ||
               existingNode.position.y !== newNode.position.y ||
               // Compare specific data fields instead of deep stringify
               (existingNode.data?.id !== newNode.data?.id);
      });
    
    const hasEdgeChanges = newEdges.length !== canvasState.edges.length ||
      newEdges.some(newEdge => {
        const existingEdge = canvasState.edges.find(e => e.id === newEdge.id);
        return !existingEdge;
      });
    
    if (hasNodeChanges || hasEdgeChanges) {
      console.log('Canvas state sync: updating nodes/edges due to app state changes');
      updateCanvasState({
        nodes: newNodes,
        edges: newEdges
      });
    }
  }, [appState.uploadedImages, appState.analyses, appState.imageGroups]); // Only watch specific dependencies

  return {
    // State
    canvasState,
    isLoading: !isInitialized.current,
    hasPendingChanges: pendingChanges.current,
    
    // Operations
    updateCanvasState,
    performAutoSave,
    optimisticNodeMove,
    createGroupOptimistic,
    
    // Undo/Redo
    performUndo,
    performRedo,
    canUndo: undoRedoManager.canUndo,
    canRedo: undoRedoManager.canRedo,
    
    // Client state features
    offlineCache
  };
}

// Helper function to generate nodes from app state
function generateNodesFromAppState(
  appState: AppState, 
  nodePositions: Record<string, { x: number; y: number }> = {}
): Node[] {
  const nodes: Node[] = [];
  let yOffset = 0;
  const spacing = 200;

  // Generate image nodes
  appState.uploadedImages.forEach((image, index) => {
    const nodeId = `image-${image.id}`;
    const position = nodePositions[nodeId] || { x: 50, y: yOffset };
    
    nodes.push({
      id: nodeId,
      type: 'image',
      position,
      data: { 
        image,
        analysis: appState.analyses.find(a => a.imageId === image.id)
      }
    });

    yOffset += spacing;
  });

  // Generate group nodes
  appState.imageGroups.forEach((group) => {
    const nodeId = `group-container-${group.id}`;
    const position = nodePositions[nodeId] || group.position;
    
    nodes.push({
      id: nodeId,
      type: 'group',
      position,
      data: { group },
      style: { width: 400, height: 300 }
    });
  });

  return nodes;
}

// Helper function to generate edges from app state
function generateEdgesFromAppState(appState: AppState): Edge[] {
  const edges: Edge[] = [];

  // Generate edges between images and their analyses
  appState.analyses.forEach((analysis) => {
    edges.push({
      id: `edge-${analysis.imageId}-${analysis.id}`,
      source: `image-${analysis.imageId}`,
      target: `analysis-${analysis.id}`,
      type: 'smoothstep',
      animated: true
    });
  });

  return edges;
}