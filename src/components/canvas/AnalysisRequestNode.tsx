import React from 'react';
import { Handle, Position } from '@xyflow/react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Brain, Sparkles, X } from 'lucide-react';

interface AnalysisRequestNodeData {
  imageId: string;
  imageName: string;
  onStartAnalysis: (context?: string, aiModel?: string) => void;
  onCancel: () => void;
}

interface AnalysisRequestNodeProps {
  data: AnalysisRequestNodeData;
}

export const AnalysisRequestNode: React.FC<AnalysisRequestNodeProps> = ({ data }) => {
  const [userContext, setUserContext] = React.useState('');
  const [selectedAIModel, setSelectedAIModel] = React.useState<string>('claude');

  const handleStartAnalysis = () => {
    data.onStartAnalysis(userContext || undefined, selectedAIModel);
  };

  return (
    <Card className="w-[380px] p-4 bg-card border border-border shadow-lg">
      <Handle type="target" position={Position.Left} className="w-3 h-3" />
      
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Brain className="w-5 h-5 text-primary" />
            <h3 className="text-sm font-semibold text-foreground">AI Analysis Request</h3>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={data.onCancel}
            className="h-8 w-8 p-0"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
        
        <div className="text-xs text-muted-foreground">
          Image: <span className="font-medium">{data.imageName}</span>
        </div>
        
        <div className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="ai-model" className="text-xs font-medium">
              AI Model
            </Label>
            <Select value={selectedAIModel} onValueChange={setSelectedAIModel}>
              <SelectTrigger id="ai-model" className="h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="claude">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-3 h-3" />
                    Claude Vision
                  </div>
                </SelectItem>
                <SelectItem value="openai">
                  <div className="flex items-center gap-2">
                    <Brain className="w-3 h-3" />
                    GPT-4 Vision
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="context" className="text-xs font-medium">
              Additional Context (Optional)
            </Label>
            <Textarea
              id="context"
              placeholder="Describe what you'd like the AI to focus on..."
              value={userContext}
              onChange={(e) => setUserContext(e.target.value)}
              className="text-xs resize-none"
              rows={3}
            />
          </div>
        </div>
        
        <div className="flex items-center gap-2 pt-2">
          <Button 
            onClick={handleStartAnalysis}
            size="sm"
            className="flex-1"
          >
            <Brain className="w-3 h-3 mr-1" />
            Start Analysis
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            onClick={data.onCancel}
          >
            Cancel
          </Button>
        </div>
      </div>
    </Card>
  );
};