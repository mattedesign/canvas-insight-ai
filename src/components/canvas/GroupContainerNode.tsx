import React from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { ImageGroup } from '@/types/ux-analysis';
import { Button } from '@/components/ui/button';
import { LayoutGrid, Layers, Edit2 } from 'lucide-react';

interface GroupContainerNodeData {
  group: ImageGroup;
  displayMode: 'standard' | 'stacked';
  onUngroup?: (groupId: string) => void;
  onDelete?: (groupId: string) => void;
  onEdit?: (groupId: string) => void;
  onDisplayModeChange?: (groupId: string, mode: 'standard' | 'stacked') => void;
}

export const GroupContainerNode: React.FC<NodeProps> = ({ 
  data,
  selected 
}) => {
  const { group, displayMode = 'standard', onUngroup, onDelete, onEdit, onDisplayModeChange } = data as unknown as GroupContainerNodeData;

  const handleDisplayModeToggle = () => {
    const newMode = displayMode === 'standard' ? 'stacked' : 'standard';
    onDisplayModeChange?.(group.id, newMode);
  };

  return (
    <>
      {/* Group header */}
      <div className="group-header">
        <div className="flex items-center gap-2">
          <h3 className="group-title">{group.name}</h3>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDisplayModeToggle}
            className="h-6 w-6 p-0"
            title={`Switch to ${displayMode === 'standard' ? 'stacked' : 'side-by-side'} view`}
          >
            {displayMode === 'standard' ? <Layers className="w-3 h-3" /> : <LayoutGrid className="w-3 h-3" />}
          </Button>
        </div>
        <div className="group-actions">
          {onEdit && (
            <button 
              onClick={() => onEdit(group.id)}
              className="group-action-btn"
              title="Edit group"
            >
              <Edit2 className="w-3 h-3" />
            </button>
          )}
          {onUngroup && (
            <button 
              onClick={() => onUngroup(group.id)}
              className="group-action-btn"
              title="Ungroup"
            >
              ⊟
            </button>
          )}
          {onDelete && (
            <button 
              onClick={() => onDelete(group.id)}
              className="group-action-btn"
              title="Delete group"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Connection handle for analysis card */}
      <Handle 
        type="source" 
        position={Position.Right} 
        id="analysis"
        className="group-analysis-handle"
      />
    </>
  );
};