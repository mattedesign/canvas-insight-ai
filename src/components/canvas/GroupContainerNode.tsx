import React from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { ImageGroup } from '@/types/ux-analysis';

interface GroupContainerNodeData {
  group: ImageGroup;
  onUngroup?: (groupId: string) => void;
  onDelete?: (groupId: string) => void;
}

export const GroupContainerNode: React.FC<NodeProps> = ({ 
  data,
  selected 
}) => {
  const { group, onUngroup, onDelete } = data as unknown as GroupContainerNodeData;

  return (
    <div 
      className={`group-container ${selected ? 'selected' : ''}`}
      style={{ 
        borderColor: group.color,
        minWidth: '200px',
        minHeight: '150px'
      }}
    >
      {/* Group header */}
      <div className="group-header">
        <h3 className="group-title">{group.name}</h3>
        <div className="group-actions">
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

      {/* Content area for images */}
      <div className="group-content">
        {/* Images will be positioned as child nodes */}
      </div>

      {/* Connection handle for analysis card */}
      <Handle 
        type="source" 
        position={Position.Right} 
        id="analysis"
        className="group-analysis-handle"
      />
    </div>
  );
};