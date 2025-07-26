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
    <Card className="w-80 bg-background border-border shadow-lg">
      <Handle
        type="target"
        position={Position.Left}
        className="bg-primary border-2 border-background"
      />
      
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold text-foreground flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Improved Concept
          </CardTitle>
          <Badge variant="secondary">
            Generated
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Concept Image */}
        <div className="relative rounded-lg overflow-hidden bg-muted">
          <img 
            src={concept.imageUrl} 
            alt={concept.title}
            className="w-full h-48 object-cover"
          />
        </div>
        
        {/* Title and Description */}
        <div className="space-y-2">
          <h4 className="font-medium text-foreground">{concept.title}</h4>
          <p className="text-sm text-muted-foreground">{concept.description}</p>
        </div>
        
        {/* Key Improvements */}
        {concept.improvements.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Lightbulb className="h-4 w-4 text-primary" />
              <h4 className="font-medium text-foreground text-sm">Key Improvements</h4>
            </div>
            <div className="space-y-1">
              {concept.improvements.slice(0, 3).map((improvement, index) => (
                <div key={index} className="text-sm text-muted-foreground pl-2 border-l-2 border-primary/30">
                  {improvement}
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
      
      <Handle
        type="source"
        position={Position.Right}
        className="bg-primary border-2 border-background"
      />
    </Card>
  );
};