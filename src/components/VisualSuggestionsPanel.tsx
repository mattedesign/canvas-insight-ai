/**
 * Visual Suggestions Panel - Displays Stability.ai generated suggestions and mockups
 */

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { 
  Lightbulb, 
  Image, 
  Palette, 
  RefreshCw, 
  Download, 
  Eye,
  Wand2,
  Sparkles
} from 'lucide-react';

interface VisualSuggestion {
  id: string;
  type: 'mockup' | 'improvement' | 'variation' | 'inpainting';
  title: string;
  description: string;
  prompt: string;
  priority: 'high' | 'medium' | 'low';
  estimatedImpact: string;
}

interface GeneratedImage {
  suggestionId: string;
  imageUrl: string;
  prompt: string;
  model: string;
  title?: string;
  description?: string;
}

interface VisualSuggestionsPanelProps {
  suggestions: VisualSuggestion[];
  generatedImages?: GeneratedImage[];
  onGenerateMockup?: (suggestion: VisualSuggestion) => Promise<void>;
  onRegenerateImage?: (imageId: string) => Promise<void>;
  isLoading?: boolean;
}

export function VisualSuggestionsPanel({
  suggestions = [],
  generatedImages = [],
  onGenerateMockup,
  onRegenerateImage,
  isLoading = false
}: VisualSuggestionsPanelProps) {
  const [selectedImage, setSelectedImage] = useState<GeneratedImage | null>(null);
  const [loadingImageId, setLoadingImageId] = useState<string | null>(null);

  const priorityColors = {
    high: 'destructive',
    medium: 'default',
    low: 'secondary'
  } as const;

  const typeIcons = {
    mockup: Palette,
    improvement: Lightbulb,
    variation: RefreshCw,
    inpainting: Wand2
  };

  const handleGenerateMockup = async (suggestion: VisualSuggestion) => {
    if (!onGenerateMockup) return;
    
    setLoadingImageId(suggestion.id);
    try {
      await onGenerateMockup(suggestion);
      toast.success(`Generated mockup for "${suggestion.title}"`);
    } catch (error) {
      toast.error('Failed to generate mockup');
      console.error('Error generating mockup:', error);
    } finally {
      setLoadingImageId(null);
    }
  };

  const handleRegenerateImage = async (imageId: string) => {
    if (!onRegenerateImage) return;
    
    setLoadingImageId(imageId);
    try {
      await onRegenerateImage(imageId);
      toast.success('Image regenerated successfully');
    } catch (error) {
      toast.error('Failed to regenerate image');
      console.error('Error regenerating image:', error);
    } finally {
      setLoadingImageId(null);
    }
  };

  const downloadImage = async (imageUrl: string, filename: string) => {
    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success('Image downloaded');
    } catch (error) {
      toast.error('Failed to download image');
      console.error('Error downloading image:', error);
    }
  };

  if (suggestions.length === 0 && generatedImages.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            Visual Suggestions
          </CardTitle>
          <CardDescription>
            AI-powered visual improvements and mockups will appear here
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            Run an analysis to see visual suggestions
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5" />
          Visual Suggestions
        </CardTitle>
        <CardDescription>
          AI-generated visual improvements and mockups based on UX analysis
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="suggestions" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="suggestions" className="flex items-center gap-2">
              <Lightbulb className="h-4 w-4" />
              Suggestions ({suggestions.length})
            </TabsTrigger>
            <TabsTrigger value="mockups" className="flex items-center gap-2">
              <Image className="h-4 w-4" />
              Generated ({generatedImages.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="suggestions" className="mt-4">
            <ScrollArea className="h-96">
              <div className="space-y-4">
                {suggestions.map((suggestion) => {
                  const Icon = typeIcons[suggestion.type];
                  return (
                    <Card key={suggestion.id} className="border-l-4 border-l-primary/20">
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-2">
                            <Icon className="h-5 w-5 mt-0.5 text-primary" />
                            <div>
                              <CardTitle className="text-base">{suggestion.title}</CardTitle>
                              <div className="flex items-center gap-2 mt-1">
                                <Badge variant={priorityColors[suggestion.priority]}>
                                  {suggestion.priority}
                                </Badge>
                                <Badge variant="outline" className="text-xs">
                                  {suggestion.type}
                                </Badge>
                              </div>
                            </div>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleGenerateMockup(suggestion)}
                            disabled={isLoading || loadingImageId === suggestion.id}
                            className="shrink-0"
                          >
                            {loadingImageId === suggestion.id ? (
                              <RefreshCw className="h-4 w-4 animate-spin" />
                            ) : (
                              <Wand2 className="h-4 w-4" />
                            )}
                            Generate
                          </Button>
                        </div>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <p className="text-sm text-muted-foreground mb-2">
                          {suggestion.description}
                        </p>
                        <Separator className="my-2" />
                        <p className="text-xs text-muted-foreground">
                          <strong>Expected Impact:</strong> {suggestion.estimatedImpact}
                        </p>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="mockups" className="mt-4">
            <ScrollArea className="h-96">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {generatedImages.map((image) => (
                  <Card key={`${image.suggestionId}-${image.imageUrl}`} className="overflow-hidden">
                    <div className="aspect-video relative bg-muted">
                      <img
                        src={image.imageUrl}
                        alt={image.title || 'Generated mockup'}
                        className="w-full h-full object-cover cursor-pointer"
                        onClick={() => setSelectedImage(image)}
                      />
                      <div className="absolute inset-0 bg-black/0 hover:bg-black/20 transition-colors duration-200 flex items-center justify-center opacity-0 hover:opacity-100">
                        <Button variant="secondary" size="sm">
                          <Eye className="h-4 w-4 mr-2" />
                          View Full
                        </Button>
                      </div>
                    </div>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium text-sm truncate">
                          {image.title || 'Generated Mockup'}
                        </h4>
                        <Badge variant="outline" className="text-xs">
                          {image.model}
                        </Badge>
                      </div>
                      {image.description && (
                        <p className="text-xs text-muted-foreground mb-3 line-clamp-2">
                          {image.description}
                        </p>
                      )}
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => downloadImage(image.imageUrl, `mockup-${image.suggestionId}.png`)}
                          className="flex-1"
                        >
                          <Download className="h-3 w-3 mr-1" />
                          Download
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleRegenerateImage(image.suggestionId)}
                          disabled={loadingImageId === image.suggestionId}
                        >
                          {loadingImageId === image.suggestionId ? (
                            <RefreshCw className="h-3 w-3 animate-spin" />
                          ) : (
                            <RefreshCw className="h-3 w-3" />
                          )}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>

        {/* Full-size image dialog */}
        <Dialog open={!!selectedImage} onOpenChange={() => setSelectedImage(null)}>
          <DialogContent className="max-w-4xl max-h-[90vh]">
            <DialogHeader>
              <DialogTitle>{selectedImage?.title || 'Generated Mockup'}</DialogTitle>
            </DialogHeader>
            {selectedImage && (
              <div className="space-y-4">
                <div className="aspect-video bg-muted rounded-lg overflow-hidden">
                  <img
                    src={selectedImage.imageUrl}
                    alt={selectedImage.title || 'Generated mockup'}
                    className="w-full h-full object-contain"
                  />
                </div>
                {selectedImage.description && (
                  <p className="text-sm text-muted-foreground">
                    {selectedImage.description}
                  </p>
                )}
                <div className="flex items-center gap-2">
                  <Button
                    onClick={() => downloadImage(selectedImage.imageUrl, `mockup-${selectedImage.suggestionId}.png`)}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download Image
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => handleRegenerateImage(selectedImage.suggestionId)}
                    disabled={loadingImageId === selectedImage.suggestionId}
                  >
                    {loadingImageId === selectedImage.suggestionId ? (
                      <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <RefreshCw className="h-4 w-4 mr-2" />
                    )}
                    Regenerate
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}