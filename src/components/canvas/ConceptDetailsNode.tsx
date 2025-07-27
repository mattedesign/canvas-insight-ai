import React from 'react';
import { Handle, Position } from '@xyflow/react';
import { GeneratedConcept } from '@/types/ux-analysis';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Lightbulb } from 'lucide-react';

interface ConceptDetailsNodeData {
  concept: GeneratedConcept;
}

interface ConceptDetailsNodeProps {
  data: ConceptDetailsNodeData;
}

export const ConceptDetailsNode: React.FC<ConceptDetailsNodeProps> = ({ data }) => {
  const { concept } = data;
  
  return (
    <div className="relative">
      <Handle
        type="target"
        position={Position.Left}
        className="bg-primary border-2 border-background"
      />
      
      <Card className="w-80 shadow-lg">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-medium">Concept Details</CardTitle>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {/* Description */}
          <div>
            <h5 className="text-sm font-medium text-foreground mb-1">Description</h5>
            <p className="text-sm text-muted-foreground leading-relaxed">{concept.description}</p>
          </div>
          
          {/* Key Improvements */}
          {concept.improvements.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Lightbulb className="h-4 w-4 text-primary" />
                <h5 className="text-sm font-medium text-foreground">Key Improvements</h5>
              </div>
              <div className="space-y-2">
                {concept.improvements.map((improvement, index) => (
                  <div 
                    key={index} 
                    className="text-sm text-muted-foreground pl-3 border-l-2 border-primary/30 leading-relaxed"
                  >
                    {improvement}
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {/* Creation Date */}
          <div className="pt-2 border-t border-border">
            <p className="text-xs text-muted-foreground">
              Generated: {new Date(concept.createdAt).toLocaleDateString()}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};