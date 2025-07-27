import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { AIModelSelector } from '@/components/AIModelSelector';
import { useAI } from '@/context/AIContext';
import { useAppContext } from '@/context/AppContext';
import { Brain, Wand2 } from 'lucide-react';

interface ImageAnalysisDialogProps {
  imageId: string;
  imageName: string;
  imageUrl: string;
  onClose: () => void;
  onAnalysisComplete: (analysis: any) => void;
}

export function ImageAnalysisDialog({ 
  imageId, 
  imageName, 
  imageUrl, 
  onClose, 
  onAnalysisComplete 
}: ImageAnalysisDialogProps) {
  const [userContext, setUserContext] = useState('');
  const { selectedAIModel, setSelectedAIModel, isAnalyzing, analyzeImageWithAI } = useAI();

  const handleAnalyze = async () => {
    try {
      const analysis = await analyzeImageWithAI(imageId, imageUrl, imageName, userContext);
      onAnalysisComplete(analysis);
      onClose();
    } catch (error) {
      console.error('Analysis failed:', error);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <Card className="w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            AI UX Analysis
          </CardTitle>
          <CardDescription>
            Analyze "{imageName}" with advanced AI models
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* Image Preview */}
          <div className="flex justify-center">
            <img 
              src={imageUrl} 
              alt={imageName}
              className="max-w-full max-h-48 object-contain rounded-lg border"
            />
          </div>
          
          {/* User Context Input */}
          <div className="space-y-2">
            <Label htmlFor="context">
              Additional Context (Optional)
            </Label>
            <Textarea
              id="context"
              placeholder="Provide any specific context about this design, target audience, or areas you'd like the AI to focus on..."
              value={userContext}
              onChange={(e) => setUserContext(e.target.value)}
              rows={3}
            />
          </div>
          
          {/* AI Model Selector */}
          <AIModelSelector
            selectedModel={selectedAIModel}
            onModelChange={setSelectedAIModel}
            onAnalyze={handleAnalyze}
            isAnalyzing={isAnalyzing}
          />
          
          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button 
              variant="outline" 
              onClick={onClose}
              disabled={isAnalyzing}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleAnalyze}
              disabled={isAnalyzing}
              className="min-w-32"
            >
              {isAnalyzing ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Wand2 className="h-4 w-4 mr-2" />
                  Start Analysis
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}