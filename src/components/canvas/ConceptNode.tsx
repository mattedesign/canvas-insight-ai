import React from 'react';
import { Handle, Position } from '@xyflow/react';
import { GeneratedConcept } from '@/types/ux-analysis';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Lightbulb, Sparkles } from 'lucide-react';

interface ConceptNodeData {
  concept: GeneratedConcept;
}

interface ConceptNodeProps {
  data: ConceptNodeData;
}

export const ConceptNode: React.FC<ConceptNodeProps> = ({ data }) => {
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
      </div>
      
      {/* Info panel at bottom */}
      <div className="p-4 space-y-3 bg-background border-t border-border">
        {/* Title */}
        <div className="space-y-1">
          <h4 className="font-medium text-foreground text-sm">{concept.title}</h4>
          <p className="text-xs text-muted-foreground line-clamp-2">{concept.description}</p>
        </div>
        
        {/* Key Improvements - Compact display */}
        {concept.improvements.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-1">
              <Lightbulb className="h-3 w-3 text-primary" />
              <span className="text-xs font-medium text-foreground">Key Improvements</span>
            </div>
            <div className="space-y-1">
              {concept.improvements.slice(0, 2).map((improvement, index) => (
                <div key={index} className="text-xs text-muted-foreground pl-2 border-l border-primary/30 line-clamp-1">
                  {improvement}
                </div>
              ))}
              {concept.improvements.length > 2 && (
                <div className="text-xs text-muted-foreground/70 pl-2">
                  +{concept.improvements.length - 2} more improvements
                </div>
              )}
            </div>
          </div>
        )}
      </div>
      
      <Handle
        type="source"
        position={Position.Right}
        className="bg-primary border-2 border-background"
      />
    </div>
  );
};