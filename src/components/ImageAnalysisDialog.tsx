import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Brain, Wand2, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

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
  const [selectedAIModel, setSelectedAIModel] = useState<'claude' | 'openai'>('claude');
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const handleAnalyze = async () => {
    if (isAnalyzing) return;

    setIsAnalyzing(true);
    
    try {
      toast.info('Starting AI analysis...');

      const { data, error } = await supabase.functions.invoke('ux-analysis', {
        body: {
          type: 'ANALYZE_IMAGE',
          payload: {
            imageId,
            imageUrl,
            imageName,
            userContext: userContext || ''
          },
          aiModel: selectedAIModel
        }
      });

      if (error) {
        throw error;
      }

      if (!data.success) {
        throw new Error(data.error || 'Analysis failed');
      }

      toast.success('AI analysis completed successfully!');
      onAnalysisComplete(data.data);
      onClose();
    } catch (error) {
      console.error('Analysis failed:', error);
      toast.error(error.message || 'Analysis failed. Please try again.');
    } finally {
      setIsAnalyzing(false);
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
            Analyze "{imageName}" with advanced AI models using pre-extracted metadata
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
          
          {/* AI Model Selection */}
          <div className="space-y-2">
            <Label htmlFor="ai-model">
              AI Model
            </Label>
            <Select value={selectedAIModel} onValueChange={(value: 'claude' | 'openai') => setSelectedAIModel(value)}>
              <SelectTrigger>
                <SelectValue placeholder="Select AI model" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="claude">
                  Claude Opus 4 - Most Advanced
                </SelectItem>
                <SelectItem value="openai">
                  GPT-4.1 - Fast & Reliable
                </SelectItem>
              </SelectContent>
            </Select>
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
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
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