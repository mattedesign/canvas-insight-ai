import React, { useState } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ImageGroup } from '@/types/ux-analysis';
import { MessageSquare, Sparkles, Target, Users, Zap } from 'lucide-react';

interface GroupPromptCollectionNodeData {
  group: ImageGroup;
  onSubmitPrompt?: (groupId: string, prompt: string, isCustom: boolean) => void;
  onAnalyzeGroup?: (groupId: string) => void;
  isLoading?: boolean;
}

const predefinedPrompts = [
  {
    id: 'consistency',
    icon: Target,
    title: 'Design Consistency Analysis',
    description: 'Analyze visual consistency, typography, and component usage across all screens',
    prompt: 'Analyze the design consistency across these screens. Focus on typography, color usage, spacing patterns, component styles, and overall visual harmony. Identify inconsistencies and provide recommendations for a unified design system.'
  },
  {
    id: 'userflow',
    icon: Users,
    title: 'User Flow Assessment',
    description: 'Evaluate user journey continuity and navigation patterns',
    prompt: 'Evaluate the user flow and navigation patterns across these screens. Analyze the logical progression, identify potential friction points, assess information hierarchy, and provide recommendations for improving user journey continuity.'
  },
  {
    id: 'accessibility',
    icon: Zap,
    title: 'Accessibility Review',
    description: 'Comprehensive accessibility assessment for inclusive design',
    prompt: 'Conduct a comprehensive accessibility review of these screens. Check color contrast, text readability, touch target sizes, focus indicators, and overall inclusive design patterns. Provide specific WCAG 2.1 compliance recommendations.'
  },
  {
    id: 'performance',
    icon: Sparkles,
    title: 'Visual Performance',
    description: 'Analyze visual load, hierarchy, and cognitive efficiency',
    prompt: 'Analyze the visual performance and cognitive load of these screens. Evaluate information hierarchy, visual clutter, readability, and user attention flow. Recommend optimizations for better visual efficiency and user comprehension.'
  }
];

export const GroupPromptCollectionNode: React.FC<NodeProps> = ({ data }) => {
  const { group, onSubmitPrompt, onAnalyzeGroup, isLoading } = data as unknown as GroupPromptCollectionNodeData;
  const [selectedPrompt, setSelectedPrompt] = useState<string | null>(null);
  const [customPrompt, setCustomPrompt] = useState('');
  const [showCustomInput, setShowCustomInput] = useState(false);

  const handlePredefinedPromptSubmit = (prompt: string) => {
    if (onSubmitPrompt) {
      onSubmitPrompt(group.id, prompt, false);
    } else if (onAnalyzeGroup) {
      // Fallback to direct group analysis
      onAnalyzeGroup(group.id);
    }
  };

  const handleCustomPromptSubmit = () => {
    if (customPrompt.trim()) {
      if (onSubmitPrompt) {
        onSubmitPrompt(group.id, customPrompt.trim(), true);
      } else if (onAnalyzeGroup) {
        // Fallback to direct group analysis
        onAnalyzeGroup(group.id);
      }
      setCustomPrompt('');
      setShowCustomInput(false);
    }
  };

  return (
    <div className="w-96">
      <Card className="border-2 bg-background">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-primary" />
            <CardTitle className="text-lg">Group Analysis Prompt</CardTitle>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Badge variant="outline" style={{ borderColor: group.color, color: group.color }}>
              {group.name}
            </Badge>
            <span>•</span>
            <span>{group.imageIds.length} images</span>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Predefined Prompts */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-foreground">Choose an analysis focus:</h4>
            
            {predefinedPrompts.map((prompt) => {
              const IconComponent = prompt.icon;
              return (
                <div
                  key={prompt.id}
                  className={`p-3 rounded-lg border-2 transition-all cursor-pointer hover:bg-muted/50 ${
                    selectedPrompt === prompt.id 
                      ? 'border-primary bg-primary/5' 
                      : 'border-border'
                  }`}
                  onClick={() => setSelectedPrompt(prompt.id)}
                >
                  <div className="flex items-start gap-3">
                    <IconComponent className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <h5 className="text-sm font-medium text-foreground mb-1">{prompt.title}</h5>
                      <p className="text-xs text-muted-foreground leading-relaxed">{prompt.description}</p>
                    </div>
                  </div>
                  
                  {selectedPrompt === prompt.id && (
                    <div className="mt-3 pt-3 border-t border-border">
                      <Button
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handlePredefinedPromptSubmit(prompt.prompt);
                        }}
                        disabled={isLoading}
                        className="w-full"
                      >
                        {isLoading ? 'Analyzing...' : 'Start Analysis'}
                      </Button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <Separator />

          {/* Custom Prompt Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium text-foreground">Custom Analysis Prompt</h4>
              {!showCustomInput && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowCustomInput(true)}
                  disabled={isLoading}
                >
                  Write Custom Prompt
                </Button>
              )}
            </div>

            {showCustomInput && (
              <div className="space-y-3">
                <Textarea
                  placeholder={`Describe what you'd like to analyze about the "${group.name}" group. Be specific about the aspects you want to focus on...`}
                  value={customPrompt}
                  onChange={(e) => setCustomPrompt(e.target.value)}
                  className="min-h-20 resize-none"
                />
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={handleCustomPromptSubmit}
                    disabled={!customPrompt.trim() || isLoading}
                    className="flex-1"
                  >
                    {isLoading ? 'Analyzing...' : 'Analyze'}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setShowCustomInput(false);
                      setCustomPrompt('');
                    }}
                    disabled={isLoading}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Connection handle */}
      <Handle 
        type="target" 
        position={Position.Left} 
        className="!bg-primary !border-primary"
      />
      <Handle 
        type="source" 
        position={Position.Right} 
        className="!bg-primary !border-primary"
      />
    </div>
  );
};