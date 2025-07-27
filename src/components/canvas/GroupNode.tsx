import React from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Images, BarChart3, Trash2 } from 'lucide-react';
import { ImageGroup } from '@/types/ux-analysis';

interface GroupNodeData {
  group: ImageGroup;
  imageCount: number;
  onViewGroup?: (groupId: string) => void;
  onAnalyzeGroup?: (groupId: string) => void;
  onDeleteGroup?: (groupId: string) => void;
}

export const GroupNode: React.FC<NodeProps> = ({ data }) => {
  const { group, imageCount, onViewGroup, onAnalyzeGroup, onDeleteGroup } = data as unknown as GroupNodeData;

  return (
    <div className="group-node">
      <Handle
        type="target"
        position={Position.Left}
        className="opacity-0"
      />
      
      <Card 
        className="w-80 shadow-lg border-2 transition-all hover:shadow-xl"
        style={{ borderColor: group.color }}
      >
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div 
                className="w-4 h-4 rounded-full"
                style={{ backgroundColor: group.color }}
              />
              <CardTitle className="text-lg font-semibold">
                {group.name}
              </CardTitle>
            </div>
            <Badge variant="secondary" className="flex items-center gap-1">
              <Images className="h-3 w-3" />
              {imageCount}
            </Badge>
          </div>
          {group.description && (
            <p className="text-sm text-muted-foreground mt-1">
              {group.description}
            </p>
          )}
        </CardHeader>
        
        <CardContent className="pt-0">
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => onViewGroup?.(group.id)}
              className="flex-1"
            >
              <Images className="h-4 w-4 mr-2" />
              View
            </Button>
            
            <Button
              size="sm"
              variant="outline"
              onClick={() => onAnalyzeGroup?.(group.id)}
              className="flex-1"
            >
              <BarChart3 className="h-4 w-4 mr-2" />
              Analyze
            </Button>
            
            <Button
              size="sm"
              variant="outline"
              onClick={() => onDeleteGroup?.(group.id)}
              className="text-destructive hover:text-destructive"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
      
      <Handle
        type="source"
        position={Position.Right}
        className="opacity-0"
      />
    </div>
  );
};