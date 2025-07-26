import React from 'react';
import { Handle, Position } from '@xyflow/react';
import { GeneratedConcept } from '@/types/ux-analysis';
import { Badge } from '@/components/ui/badge';
import { Sparkles } from 'lucide-react';

interface ConceptImageNodeData {
  concept: GeneratedConcept;
}

interface ConceptImageNodeProps {
  data: ConceptImageNodeData;
}

export const ConceptImageNode: React.FC<ConceptImageNodeProps> = ({ data }) => {
  const { concept } = data;
  
  return (
    <div className="relative bg-background border border-border rounded-lg shadow-lg overflow-hidden">
      <Handle
        type="target"
        position={Position.Left}
        className="bg-primary border-2 border-background"
      />
      
      {/* Concept Image - Main artboard area */}
      <div className="relative w-80 h-60">
        <img 
          src={concept.imageUrl} 
          alt={concept.title}
          className="w-full h-full object-cover"
        />
        
        {/* Generated Badge overlay */}
        <div className="absolute top-3 right-3">
          <Badge variant="secondary" className="bg-background/90 backdrop-blur-sm">
            <Sparkles className="h-3 w-3 mr-1" />
            Generated
          </Badge>
        </div>
        
        {/* Title overlay at bottom */}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-background/90 to-transparent p-3">
          <h4 className="font-medium text-foreground text-sm">{concept.title}</h4>
        </div>
      </div>
      
      <Handle
        type="source"
        position={Position.Right}
        className="bg-primary border-2 border-background"
      />
    </div>
  );
};