import React, { useState } from 'react';
import { Handle, Position } from '@xyflow/react';
import { useLongPress } from '@/hooks/useLongPress';
import { useIsMobile } from '@/hooks/use-mobile';

export interface EnhancedCanvasNodeProps {
  id: string;
  name: string;
  type: 'image' | 'annotation' | 'group' | 'artboard';
  children: React.ReactNode;
  onContextMenu?: (event: React.MouseEvent, nodeId: string) => void;
  onLongPress?: (nodeId: string) => void;
  onSelect?: (nodeId: string, event: React.MouseEvent) => void;
  isSelected?: boolean;
  className?: string;
}

export const EnhancedCanvasNode: React.FC<EnhancedCanvasNodeProps> = ({
  id,
  name,
  type,
  children,
  onContextMenu,
  onLongPress,
  onSelect,
  isSelected = false,
  className = '',
}) => {
  const isMobile = useIsMobile();
  const [isLongPressing, setIsLongPressing] = useState(false);

  const longPressHandlers = useLongPress({
    onLongPress: () => {
      setIsLongPressing(false);
      onLongPress?.(id);
    },
    onStart: () => {
      setIsLongPressing(true);
    },
    onCancel: () => {
      setIsLongPressing(false);
    },
    duration: 500,
    threshold: 10,
    hapticFeedback: true,
    preventContextMenu: isMobile,
  });

  const handleContextMenu = (event: React.MouseEvent) => {
    if (!isMobile) {
      event.preventDefault();
      onContextMenu?.(event, id);
    }
  };

  const handleClick = (event: React.MouseEvent) => {
    if (!isLongPressing) {
      onSelect?.(id, event);
    }
  };

  const nodeClassName = `
    relative cursor-pointer transition-all duration-200
    ${isSelected ? 'ring-2 ring-primary ring-offset-2' : ''}
    ${isLongPressing ? 'scale-95 opacity-80' : ''}
    ${className}
  `;

  return (
    <div
      className={nodeClassName}
      onContextMenu={handleContextMenu}
      onClick={handleClick}
      {...(isMobile ? longPressHandlers : {})}
    >
      {children}
      
      {/* Standard React Flow handles */}
      <Handle
        type="target"
        position={Position.Top}
        className="!bg-primary !border-primary-foreground !w-2 !h-2"
      />
      <Handle
        type="source"
        position={Position.Bottom}
        className="!bg-primary !border-primary-foreground !w-2 !h-2"
      />
      <Handle
        type="target"
        position={Position.Left}
        className="!bg-primary !border-primary-foreground !w-2 !h-2"
      />
      <Handle
        type="source"
        position={Position.Right}
        className="!bg-primary !border-primary-foreground !w-2 !h-2"
      />
    </div>
  );
};