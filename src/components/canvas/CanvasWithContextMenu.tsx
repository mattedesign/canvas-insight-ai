import React, { useCallback } from 'react';
import { ReactFlow, Background, BackgroundVariant, Controls, MiniMap } from '@xyflow/react';
import { useCanvasContextMenu, CanvasItem, CanvasContextMenuHandlers } from '@/hooks/useCanvasContextMenu';
import { EnhancedCanvasNode } from './EnhancedCanvasNode';
import { toast } from 'sonner';

// Mock data for demonstration
const mockCanvasItems: CanvasItem[] = [
  { id: '1', name: 'Landing Page Screenshot', type: 'image' },
  { id: '2', name: 'Navigation Analysis', type: 'annotation' },
  { id: '3', name: 'User Flow Group', type: 'group' },
  { id: '4', name: 'Design System Board', type: 'artboard' },
];

export const CanvasWithContextMenu: React.FC = () => {
  const contextMenuHandlers: CanvasContextMenuHandlers = {
    onAnalyze: useCallback((itemIds: string[]) => {
      toast.success(`Starting analysis for ${itemIds.length} item(s)`);
      console.log('Analyzing items:', itemIds);
    }, []),
    
    onView: useCallback((itemId: string) => {
      toast.info(`Opening item: ${itemId}`);
      console.log('Viewing item:', itemId);
    }, []),
    
    onDuplicate: useCallback((itemIds: string[]) => {
      toast.success(`Duplicated ${itemIds.length} item(s)`);
      console.log('Duplicating items:', itemIds);
    }, []),
    
    onMove: useCallback((itemIds: string[]) => {
      toast.info(`Move mode activated for ${itemIds.length} item(s)`);
      console.log('Moving items:', itemIds);
    }, []),
    
    onGroup: useCallback((itemIds: string[]) => {
      toast.success(`Grouped ${itemIds.length} items`);
      console.log('Grouping items:', itemIds);
    }, []),
    
    onDownload: useCallback((itemIds: string[]) => {
      toast.success(`Downloading ${itemIds.length} item(s)`);
      console.log('Downloading items:', itemIds);
    }, []),
    
    onShare: useCallback((itemIds: string[]) => {
      toast.info(`Sharing ${itemIds.length} item(s)`);
      console.log('Sharing items:', itemIds);
    }, []),
    
    onDelete: useCallback(async (itemIds: string[]) => {
      // Simulate async deletion
      await new Promise(resolve => setTimeout(resolve, 1000));
      toast.success(`Deleted ${itemIds.length} item(s)`);
      console.log('Deleted items:', itemIds);
    }, []),
  };

  const {
    selectedIds,
    clearSelection,
    isSelected,
    openContextMenu,
    contextMenuProps,
    deleteDialogProps,
    ContextMenu,
    DeleteDialog,
  } = useCanvasContextMenu(mockCanvasItems, contextMenuHandlers);

  const handleNodeContextMenu = useCallback((event: React.MouseEvent, nodeId: string) => {
    const item = mockCanvasItems.find(item => item.id === nodeId);
    if (item) {
      openContextMenu(item);
    }
  }, [openContextMenu]);

  const handleNodeLongPress = useCallback((nodeId: string) => {
    const item = mockCanvasItems.find(item => item.id === nodeId);
    if (item) {
      openContextMenu(item);
    }
  }, [openContextMenu]);

  const handleNodeSelect = useCallback((nodeId: string, event: React.MouseEvent) => {
    // Handle multi-selection with modifier keys
    const isCtrlPressed = event.ctrlKey || event.metaKey;
    const isShiftPressed = event.shiftKey;
    
    if (isCtrlPressed) {
      // Toggle selection
      const item = mockCanvasItems.find(item => item.id === nodeId);
      if (item) {
        // You would implement toggle logic here
        console.log('Toggle selection for:', nodeId);
      }
    } else if (isShiftPressed) {
      // Range selection
      console.log('Range selection to:', nodeId);
    } else {
      // Single selection
      if (selectedIds.length > 0) {
        clearSelection();
      }
      console.log('Single select:', nodeId);
    }
  }, [selectedIds, clearSelection]);

  // Mock nodes for demonstration
  const nodes = mockCanvasItems.map((item, index) => ({
    id: item.id,
    position: { x: 100 + (index % 2) * 300, y: 100 + Math.floor(index / 2) * 200 },
    data: { 
      label: item.name,
      type: item.type,
    },
    type: 'enhanced',
  }));

  const nodeTypes = {
    enhanced: ({ id, data }: any) => {
      const item = mockCanvasItems.find(item => item.id === id);
      if (!item) return null;

      return (
        <EnhancedCanvasNode
          id={id}
          name={item.name}
          type={item.type}
          onContextMenu={handleNodeContextMenu}
          onLongPress={handleNodeLongPress}
          onSelect={handleNodeSelect}
          isSelected={isSelected(id)}
          className="bg-card border border-border rounded-lg p-4 shadow-md"
        >
          <div className="text-sm font-medium text-foreground">
            {data.label}
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            Type: {data.type}
          </div>
        </EnhancedCanvasNode>
      );
    },
  };

  return (
    <div className="w-full h-screen">
      <ReactFlow
        nodes={nodes}
        edges={[]}
        nodeTypes={nodeTypes}
        fitView
        className="bg-background"
      >
        <Background 
          variant={BackgroundVariant.Dots}
          color="hsl(var(--muted-foreground) / 0.35)"
          size={2}
          gap={18}
        />
        <Controls />
        <MiniMap />
      </ReactFlow>
      
      {/* Render context menu and delete dialog */}
      {ContextMenu && <ContextMenu />}
      {DeleteDialog && <DeleteDialog />}
      
      {/* Selection info */}
      {selectedIds.length > 0 && (
        <div className="absolute top-4 left-4 bg-card border border-border rounded-lg p-3 shadow-md">
          <div className="text-sm font-medium text-foreground">
            {selectedIds.length} item(s) selected
          </div>
          <button
            onClick={clearSelection}
            className="text-xs text-muted-foreground hover:text-foreground mt-1"
          >
            Clear selection
          </button>
        </div>
      )}
    </div>
  );
};