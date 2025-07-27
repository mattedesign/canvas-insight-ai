import React, { useState } from 'react';
import { X, MessageSquare, Sparkles, RefreshCw, Send } from 'lucide-react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Textarea } from './ui/textarea';
import { Badge } from './ui/badge';
import { Separator } from './ui/separator';
import { AnnotationPoint, Suggestion } from '@/types/ux-analysis';

interface AnnotationCommentProps {
  annotation: AnnotationPoint;
  position: { x: number; y: number };
  onClose: () => void;
  onRequestAnalysis: (prompt: string) => void;
  onGenerateVariation: (prompt: string) => void;
  relatedSuggestions?: Suggestion[];
}

export const AnnotationComment: React.FC<AnnotationCommentProps> = ({
  annotation,
  position,
  onClose,
  onRequestAnalysis,
  onGenerateVariation,
  relatedSuggestions = [],
}) => {
  const [userPrompt, setUserPrompt] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  // Smart positioning to keep dialog in viewport
  const calculateOptimalPosition = () => {
    const dialogWidth = 320; // w-80 = 20rem = 320px
    const dialogHeight = 400; // Estimated height for the dialog
    const margin = 20; // Minimum margin from viewport edges
    const connectorOffset = 20; // Distance from annotation marker
    
    const viewport = {
      width: window.innerWidth,
      height: window.innerHeight,
      scrollX: window.pageXOffset || document.documentElement.scrollLeft,
      scrollY: window.pageYOffset || document.documentElement.scrollTop
    };

    let dialogX = position.x + connectorOffset;
    let dialogY = position.y;
    let transformX = 'none';
    let connectorSide = 'left';
    let connectorPosition = connectorOffset;

    // Check if dialog would overflow on the right
    if (dialogX + dialogWidth + margin > viewport.scrollX + viewport.width) {
      // Position on the left side of the annotation
      dialogX = position.x - connectorOffset;
      transformX = 'translateX(-100%)';
      connectorSide = 'right';
      connectorPosition = 0;
    }

    // Check if dialog would overflow on the left  
    if (dialogX - (transformX === 'translateX(-100%)' ? dialogWidth : 0) < viewport.scrollX + margin) {
      // Center horizontally if both sides would overflow
      dialogX = viewport.scrollX + viewport.width / 2;
      transformX = 'translateX(-50%)';
      connectorSide = 'center';
    }

    // Check if dialog would overflow at the bottom
    if (dialogY + dialogHeight + margin > viewport.scrollY + viewport.height) {
      // Position above the annotation
      dialogY = position.y - dialogHeight - 10;
    }

    // Check if dialog would overflow at the top
    if (dialogY < viewport.scrollY + margin) {
      // Position at the top with margin
      dialogY = viewport.scrollY + margin;
    }

    return {
      dialogX,
      dialogY,
      transformX,
      connectorSide,
      connectorPosition
    };
  };

  const optimalPosition = calculateOptimalPosition();

  const handleRequestAnalysis = async () => {
    if (!userPrompt.trim()) return;
    setIsAnalyzing(true);
    try {
      await onRequestAnalysis(userPrompt);
      setUserPrompt('');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleGenerateVariation = async () => {
    if (!userPrompt.trim()) return;
    setIsGenerating(true);
    try {
      await onGenerateVariation(userPrompt);
      setUserPrompt('');
    } finally {
      setIsGenerating(false);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high':
        return 'destructive';
      case 'medium':
        return 'secondary';
      case 'low':
        return 'outline';
      default:
        return 'outline';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'issue':
        return '⚠️';
      case 'suggestion':
        return '💡';
      case 'success':
        return '✅';
      default:
        return '📝';
    }
  };

  return (
    <div 
      className="fixed z-[60] animate-scale-in pointer-events-auto annotation-dialog"
      style={{
        left: optimalPosition.dialogX,
        top: optimalPosition.dialogY,
        transform: optimalPosition.transformX
      }}
    >
      {/* Connection line */}
      {optimalPosition.connectorSide !== 'center' && (
        <div 
          className="absolute w-5 h-0.5 bg-primary/60 z-10"
          style={{
            left: optimalPosition.connectorSide === 'right' ? '100%' : `-${optimalPosition.connectorPosition}px`,
            top: '20px'
          }}
        />
      )}
      
      <Card className="w-80 bg-popover/95 backdrop-blur-sm border-border shadow-2xl border-2">
        {/* Visual indicator for active annotation */}
        <div className="absolute -left-1 top-4 w-1 h-8 bg-primary rounded-r-sm animate-pulse" />
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 pb-2">
          <div className="flex items-center gap-2">
            <span className="text-lg">{getTypeIcon(annotation.type)}</span>
            <Badge variant={getSeverityColor(annotation.severity)}>
              {annotation.severity} {annotation.type}
            </Badge>
          </div>
          <Button
            size="icon"
            variant="ghost"
            onClick={onClose}
            className="h-6 w-6"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Content */}
        <div className="px-4 pb-2">
          <h4 className="font-semibold text-foreground mb-2">
            {annotation.title}
          </h4>
          <p className="text-sm text-muted-foreground mb-3">
            {annotation.description}
          </p>

          {/* Related Suggestions */}
          {relatedSuggestions.length > 0 && (
            <>
              <Separator className="my-3" />
              <div className="space-y-2">
                <h5 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Suggestions
                </h5>
                {relatedSuggestions.slice(0, 2).map((suggestion) => (
                  <div key={suggestion.id} className="text-xs bg-muted/50 rounded-md p-2">
                    <div className="font-medium text-foreground mb-1">
                      {suggestion.title}
                    </div>
                    <div className="text-muted-foreground">
                      {suggestion.description}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        <Separator />

        {/* Input Section */}
        <div className="p-4 space-y-3">
          <Textarea
            placeholder="Ask for more analysis or describe changes you'd like to see..."
            value={userPrompt}
            onChange={(e) => setUserPrompt(e.target.value)}
            className="resize-none text-sm"
            rows={3}
          />
          
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={handleRequestAnalysis}
              disabled={!userPrompt.trim() || isAnalyzing}
              className="flex-1"
            >
              {isAnalyzing ? (
                <>
                  <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <MessageSquare className="h-3 w-3 mr-1" />
                  Ask AI
                </>
              )}
            </Button>
            
            <Button
              size="sm"
              onClick={handleGenerateVariation}
              disabled={!userPrompt.trim() || isGenerating}
              className="flex-1"
            >
              {isGenerating ? (
                <>
                  <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Sparkles className="h-3 w-3 mr-1" />
                  Generate
                </>
              )}
            </Button>
          </div>
          
          <div className="text-xs text-muted-foreground">
            💡 Try: "How can I improve this?", "Make this more accessible", or "Generate a mobile version"
          </div>
        </div>
      </Card>
    </div>
  );
};