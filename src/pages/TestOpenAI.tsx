import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { supabase } from "@/integrations/supabase/client";
import { ImageUploadZone } from '@/components/ImageUploadZone';
import { AnalysisPanel } from '@/components/AnalysisPanel';
import { UXAnalysis } from '@/types/ux-analysis';
import { Loader2, Brain, Eye, Code, FileImage, Clock, CheckCircle, AlertCircle } from 'lucide-react';

interface TestResult {
  id: string;
  analysis: UXAnalysis;
  model: string;
  timestamp: Date;
  executionTime: number;
  promptUsed: string;
}

const OPENAI_MODELS = [
  { value: 'gpt-4.1-2025-04-14', label: 'GPT-4.1 (Latest)' },
  { value: 'o4-mini-2025-04-16', label: 'O4 Mini (Fast Reasoning)' },
  { value: 'o3-2025-04-16', label: 'O3 (Powerful Reasoning)' },
  { value: 'gpt-4o', label: 'GPT-4o (Vision)' }
];

export default function TestOpenAI() {
  const [selectedModel, setSelectedModel] = useState('gpt-4.1-2025-04-14');
  const [userContext, setUserContext] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [uploadedImage, setUploadedImage] = useState<{ file: File; url: string; id: string } | null>(null);
  const [analysisResult, setAnalysisResult] = useState<UXAnalysis | null>(null);
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [isAnalysisPanelOpen, setIsAnalysisPanelOpen] = useState(false);
  const [promptUsed, setPromptUsed] = useState('');
  const [executionTime, setExecutionTime] = useState(0);
  const { toast } = useToast();

  const handleImageUpload = useCallback(async (files: File[]) => {
    if (files.length === 0) return;
    
    const file = files[0];
    
    // Create temporary URL for preview
    const imageUrl = URL.createObjectURL(file);
    const imageId = `test-${Date.now()}`;
    
    setUploadedImage({
      file,
      url: imageUrl,
      id: imageId
    });
    
    toast({
      title: "Image Ready",
      description: "Image uploaded and ready for analysis.",
    });
  }, [toast]);

  const handleAnalyze = useCallback(async () => {
    if (!uploadedImage) {
      toast({
        title: "No Image",
        description: "Please upload an image first.",
        variant: "destructive",
      });
      return;
    }

    setIsAnalyzing(true);
    const startTime = Date.now();
    
    try {
      // Upload image to Supabase storage for analysis
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('images')
        .upload(`test/${uploadedImage.id}`, uploadedImage.file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        throw new Error(`Upload failed: ${uploadError.message}`);
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('images')
        .getPublicUrl(uploadData.path);

      const publicUrl = urlData.publicUrl;

      toast({
        title: "Analysis Started",
        description: `Analyzing with ${OPENAI_MODELS.find(m => m.value === selectedModel)?.label}...`,
      });

      // Call the OpenAI test analysis function
      const { data, error } = await supabase.functions.invoke('openai-test', {
        body: {
          imageUrl: publicUrl,
          imageName: uploadedImage.file.name,
          imageId: uploadedImage.id,
          userContext: userContext.trim() || undefined,
          model: selectedModel
        }
      });

      if (error) {
        throw error;
      }

      if (!data.success) {
        throw new Error(data.error || 'Analysis failed');
      }

      const endTime = Date.now();
      const execution = endTime - startTime;
      
      setAnalysisResult(data.analysis);
      setPromptUsed(data.promptUsed);
      setExecutionTime(execution);
      setIsAnalysisPanelOpen(true);

      // Store test result
      const testResult: TestResult = {
        id: `test-${Date.now()}`,
        analysis: data.analysis,
        model: selectedModel,
        timestamp: new Date(),
        executionTime: execution,
        promptUsed: data.promptUsed
      };
      
      setTestResults(prev => [testResult, ...prev.slice(0, 4)]); // Keep last 5 results

      toast({
        title: "Analysis Complete",
        description: `Analysis completed in ${(execution / 1000).toFixed(1)}s`,
      });

    } catch (error) {
      console.error('Analysis failed:', error);
      toast({
        title: "Analysis Failed",
        description: error.message || "Failed to analyze image. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsAnalyzing(false);
    }
  }, [uploadedImage, selectedModel, userContext, toast]);

  const selectedModelInfo = OPENAI_MODELS.find(m => m.value === selectedModel);

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">OpenAI UX Analysis Test</h1>
          <p className="text-muted-foreground">
            Test OpenAI models directly for UX analysis without the multi-stage pipeline
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Column - Configuration & Upload */}
          <div className="space-y-6">
            {/* Model Selection */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Brain className="w-5 h-5" />
                  Model Configuration
                </CardTitle>
                <CardDescription>
                  Select the OpenAI model to test
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="model-select">OpenAI Model</Label>
                  <Select value={selectedModel} onValueChange={setSelectedModel}>
                    <SelectTrigger id="model-select">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {OPENAI_MODELS.map((model) => (
                        <SelectItem key={model.value} value={model.value}>
                          {model.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                {selectedModelInfo && (
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="text-sm font-medium">{selectedModelInfo.label}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {selectedModel === 'gpt-4.1-2025-04-14' && 'Latest flagship model with vision capabilities'}
                      {selectedModel === 'o4-mini-2025-04-16' && 'Fast reasoning model optimized for efficiency'}
                      {selectedModel === 'o3-2025-04-16' && 'Powerful reasoning model for complex analysis'}
                      {selectedModel === 'gpt-4o' && 'Older vision model with proven capabilities'}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* User Context */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileImage className="w-5 h-5" />
                  Analysis Context
                </CardTitle>
                <CardDescription>
                  Provide additional context for the analysis (optional)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Textarea
                  placeholder="e.g., This is a mobile app login screen targeting accessibility compliance..."
                  value={userContext}
                  onChange={(e) => setUserContext(e.target.value)}
                  rows={4}
                />
              </CardContent>
            </Card>

            {/* Image Upload */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Eye className="w-5 h-5" />
                  Image Upload
                </CardTitle>
                <CardDescription>
                  Upload a design file for analysis
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ImageUploadZone 
                  onImageUpload={handleImageUpload}
                  isUploading={false}
                />
                
                {uploadedImage && (
                  <div className="mt-4 p-4 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <img
                        src={uploadedImage.url}
                        alt="Uploaded preview"
                        className="w-16 h-16 object-cover rounded border"
                      />
                      <div>
                        <p className="font-medium">{uploadedImage.file.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {(uploadedImage.file.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Analysis Button */}
            <Button
              onClick={handleAnalyze}
              disabled={!uploadedImage || isAnalyzing}
              className="w-full"
              size="lg"
            >
              {isAnalyzing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Brain className="w-4 h-4 mr-2" />
                  Start Analysis
                </>
              )}
            </Button>
          </div>

          {/* Right Column - Results */}
          <div className="space-y-6">
            {/* Current Analysis Status */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Code className="w-5 h-5" />
                  Analysis Status
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isAnalyzing && (
                  <div className="flex items-center gap-2 text-yellow-600">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Analyzing with {selectedModelInfo?.label}...</span>
                  </div>
                )}
                
                {analysisResult && !isAnalyzing && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 text-green-600">
                      <CheckCircle className="w-4 h-4" />
                      <span>Analysis Complete</span>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Model:</span>
                        <p className="font-medium">{selectedModelInfo?.label}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Time:</span>
                        <p className="font-medium">{(executionTime / 1000).toFixed(1)}s</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Score:</span>
                        <p className="font-medium">{analysisResult.summary.overallScore}/100</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Issues:</span>
                        <p className="font-medium">{analysisResult.visualAnnotations.length}</p>
                      </div>
                    </div>
                    
                    <Button
                      onClick={() => setIsAnalysisPanelOpen(true)}
                      variant="outline"
                      className="w-full"
                    >
                      View Detailed Results
                    </Button>
                  </div>
                )}
                
                {!analysisResult && !isAnalyzing && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <AlertCircle className="w-4 h-4" />
                    <span>No analysis performed yet</span>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Prompt Preview */}
            {promptUsed && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileImage className="w-5 h-5" />
                    Prompt Used
                  </CardTitle>
                  <CardDescription>
                    The exact prompt sent to {selectedModelInfo?.label}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="p-3 bg-muted rounded-lg text-sm font-mono max-h-32 overflow-y-auto">
                    {promptUsed}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Test History */}
            {testResults.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="w-5 h-5" />
                    Recent Tests
                  </CardTitle>
                  <CardDescription>
                    History of recent analysis runs
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {testResults.map((result) => (
                      <div key={result.id} className="p-3 border rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <Badge variant="outline">{OPENAI_MODELS.find(m => m.value === result.model)?.label}</Badge>
                          <span className="text-xs text-muted-foreground">
                            {result.timestamp.toLocaleTimeString()}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div>Score: {result.analysis.summary.overallScore}/100</div>
                          <div>Time: {(result.executionTime / 1000).toFixed(1)}s</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>

      {/* Analysis Panel */}
      {analysisResult && uploadedImage && (
        <AnalysisPanel
          analysis={analysisResult}
          image={{
            id: uploadedImage.id,
            name: uploadedImage.file.name,
            url: uploadedImage.url,
            file: uploadedImage.file,
            dimensions: { width: 0, height: 0 }
          }}
          isOpen={isAnalysisPanelOpen}
          onClose={() => setIsAnalysisPanelOpen(false)}
        />
      )}
    </div>
  );
}