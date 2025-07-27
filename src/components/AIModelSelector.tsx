import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Brain, Eye, Lightbulb, Zap, CheckCircle, AlertCircle } from 'lucide-react';

interface AIModel {
  id: 'auto' | 'claude-vision' | 'google-vision' | 'openai';
  name: string;
  description: string;
  icon: React.ReactNode;
  strengths: string[];
  bestFor: string[];
  status: 'available' | 'configuring' | 'unavailable';
  badge?: string;
}

interface AIModelSelectorProps {
  selectedModel: string;
  onModelChange: (model: string) => void;
  onAnalyze: () => void;
  isAnalyzing?: boolean;
}

const aiModels: AIModel[] = [
  {
    id: 'auto',
    name: 'Smart Selection',
    description: 'Automatically selects the best available AI model for optimal results',
    icon: <Brain className="h-5 w-5 text-primary" />,
    strengths: ['Optimal model selection', 'Fallback support', 'Best performance'],
    bestFor: ['General use', 'Reliability', 'Performance'],
    status: 'available',
    badge: 'Recommended'
  },
  {
    id: 'claude-vision',
    name: 'Claude Vision',
    description: 'Advanced visual reasoning and comprehensive UX critique by Anthropic',
    icon: <Eye className="h-5 w-5 text-purple-600" />,
    strengths: ['Deep UX analysis', 'Accessibility insights', 'Detailed critique'],
    bestFor: ['UX audits', 'Accessibility review', 'Design critique'],
    status: 'available',
    badge: 'Best for UX'
  },
  {
    id: 'google-vision',
    name: 'Google Vision',
    description: 'Powerful object detection, text recognition, and content analysis',
    icon: <Zap className="h-5 w-5 text-blue-600" />,
    strengths: ['Object detection', 'Text recognition', 'Face detection'],
    bestFor: ['Content analysis', 'Layout detection', 'Image elements'],
    status: 'available'
  },
  {
    id: 'openai',
    name: 'OpenAI GPT-4o',
    description: 'Versatile AI with vision capabilities for general UX analysis',
    icon: <Lightbulb className="h-5 w-5 text-green-600" />,
    strengths: ['Versatile analysis', 'Good reasoning', 'Detailed feedback'],
    bestFor: ['General analysis', 'Quick insights', 'Balanced feedback'],
    status: 'available'
  }
];

export function AIModelSelector({ selectedModel, onModelChange, onAnalyze, isAnalyzing = false }: AIModelSelectorProps) {
  const [showDetails, setShowDetails] = useState(false);

  const getStatusIcon = (status: AIModel['status']) => {
    switch (status) {
      case 'available':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'configuring':
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      case 'unavailable':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
    }
  };

  const getStatusText = (status: AIModel['status']) => {
    switch (status) {
      case 'available':
        return 'Ready';
      case 'configuring':
        return 'Setup Required';
      case 'unavailable':
        return 'Unavailable';
    }
  };

  return (
    <Card className="w-full">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg">AI Analysis Model</CardTitle>
            <CardDescription>
              Choose the AI model for your UX analysis
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowDetails(!showDetails)}
          >
            {showDetails ? 'Simple View' : 'Detailed View'}
          </Button>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <RadioGroup
          value={selectedModel}
          onValueChange={onModelChange}
          className="space-y-3"
        >
          {aiModels.map((model) => (
            <div key={model.id} className="space-y-2">
              <div className="flex items-center space-x-2">
                <RadioGroupItem 
                  value={model.id} 
                  id={model.id}
                  disabled={model.status === 'unavailable'}
                />
                <Label 
                  htmlFor={model.id} 
                  className="flex-1 cursor-pointer"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      {model.icon}
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="font-medium">{model.name}</span>
                          {model.badge && (
                            <Badge variant="secondary" className="text-xs">
                              {model.badge}
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {model.description}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {getStatusIcon(model.status)}
                      <span className="text-xs text-muted-foreground">
                        {getStatusText(model.status)}
                      </span>
                    </div>
                  </div>
                </Label>
              </div>
              
              {showDetails && selectedModel === model.id && (
                <div className="ml-6 p-3 bg-muted/50 rounded-md space-y-2">
                  <div>
                    <h4 className="text-sm font-medium text-green-700 dark:text-green-400">
                      Strengths
                    </h4>
                    <ul className="text-xs text-muted-foreground space-y-1">
                      {model.strengths.map((strength, index) => (
                        <li key={index} className="flex items-center space-x-1">
                          <div className="w-1 h-1 bg-green-500 rounded-full" />
                          <span>{strength}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  
                  <div>
                    <h4 className="text-sm font-medium text-blue-700 dark:text-blue-400">
                      Best For
                    </h4>
                    <ul className="text-xs text-muted-foreground space-y-1">
                      {model.bestFor.map((use, index) => (
                        <li key={index} className="flex items-center space-x-1">
                          <div className="w-1 h-1 bg-blue-500 rounded-full" />
                          <span>{use}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
            </div>
          ))}
        </RadioGroup>
        
        <div className="pt-4 border-t">
          <Button 
            onClick={onAnalyze}
            disabled={isAnalyzing}
            className="w-full"
          >
            {isAnalyzing ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                Analyzing with {aiModels.find(m => m.id === selectedModel)?.name}...
              </>
            ) : (
              <>
                <Brain className="h-4 w-4 mr-2" />
                Start AI Analysis
              </>
            )}
          </Button>
        </div>
        
        {selectedModel !== 'auto' && (
          <div className="text-xs text-muted-foreground text-center">
            💡 Tip: Use "Smart Selection" for automatic optimization
          </div>
        )}
      </CardContent>
    </Card>
  );
}