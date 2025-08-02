import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Users, 
  Brain, 
  Lightbulb, 
  TrendingUp, 
  Target,
  MessageSquare,
  Clock,
  CheckCircle,
  AlertCircle,
  Loader2
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import type { ImageGroup, UploadedImage } from '@/types/ux-analysis';

interface GroupAnalysisWorkflowProps {
  group: ImageGroup;
  images: UploadedImage[];
  onAnalysisComplete?: (analysis: any) => void;
}

interface AnalysisStage {
  id: string;
  name: string;
  description: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  progress: number;
  result?: any;
  duration?: number;
}

interface GroupAnalysisTemplate {
  id: string;
  name: string;
  description: string;
  prompts: string[];
  focusAreas: string[];
}

const ANALYSIS_TEMPLATES: GroupAnalysisTemplate[] = [
  {
    id: 'comprehensive',
    name: 'Comprehensive UX Review',
    description: 'Complete analysis covering all UX aspects',
    prompts: [
      'Analyze the overall user flow and information architecture across these screens',
      'Evaluate visual consistency and design system adherence',
      'Identify accessibility issues and improvement opportunities',
      'Assess content clarity and information hierarchy'
    ],
    focusAreas: ['User Flow', 'Visual Design', 'Accessibility', 'Content Strategy']
  },
  {
    id: 'conversion',
    name: 'Conversion Optimization',
    description: 'Focus on improving conversion rates and user actions',
    prompts: [
      'Identify potential conversion bottlenecks and friction points',
      'Analyze call-to-action placement and effectiveness',
      'Evaluate form design and completion flow',
      'Suggest improvements for user engagement and action completion'
    ],
    focusAreas: ['Conversion Funnel', 'CTAs', 'Forms', 'User Engagement']
  },
  {
    id: 'mobile',
    name: 'Mobile Experience Review',
    description: 'Specialized analysis for mobile user experience',
    prompts: [
      'Evaluate mobile-specific usability and touch interactions',
      'Analyze responsive design implementation and mobile optimization',
      'Assess mobile navigation patterns and accessibility',
      'Identify mobile-specific opportunities for improvement'
    ],
    focusAreas: ['Touch Interactions', 'Responsive Design', 'Mobile Navigation', 'Performance']
  },
  {
    id: 'accessibility',
    name: 'Accessibility Audit',
    description: 'Comprehensive accessibility compliance review',
    prompts: [
      'Evaluate WCAG 2.1 compliance across all screens',
      'Analyze color contrast, text readability, and visual indicators',
      'Assess keyboard navigation and screen reader compatibility',
      'Provide specific recommendations for accessibility improvements'
    ],
    focusAreas: ['WCAG Compliance', 'Color Contrast', 'Keyboard Navigation', 'Screen Readers']
  }
];

export const GroupAnalysisWorkflow: React.FC<GroupAnalysisWorkflowProps> = ({
  group,
  images,
  onAnalysisComplete
}) => {
  const [selectedTemplate, setSelectedTemplate] = useState<GroupAnalysisTemplate | null>(null);
  const [customPrompt, setCustomPrompt] = useState('');
  const [analysisStages, setAnalysisStages] = useState<AnalysisStage[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [currentStage, setCurrentStage] = useState(0);
  const [analysisResults, setAnalysisResults] = useState<any>(null);
  const { toast } = useToast();

  const initializeAnalysisStages = useCallback((template: GroupAnalysisTemplate) => {
    const stages: AnalysisStage[] = template.prompts.map((prompt, index) => ({
      id: `stage-${index}`,
      name: template.focusAreas[index] || `Analysis ${index + 1}`,
      description: prompt,
      status: 'pending',
      progress: 0
    }));

    // Add synthesis stage
    stages.push({
      id: 'synthesis',
      name: 'Synthesis & Recommendations',
      description: 'Combining insights and generating comprehensive recommendations',
      status: 'pending',
      progress: 0
    });

    setAnalysisStages(stages);
  }, []);

  const runGroupAnalysis = async () => {
    if (!selectedTemplate && !customPrompt.trim()) {
      toast({
        title: "Analysis Required",
        description: "Please select a template or enter a custom prompt",
        variant: "destructive"
      });
      return;
    }

    setIsRunning(true);
    setCurrentStage(0);
    
    try {
      const analysisPrompts = selectedTemplate 
        ? selectedTemplate.prompts 
        : [customPrompt.trim()];

      initializeAnalysisStages(selectedTemplate || {
        id: 'custom',
        name: 'Custom Analysis',
        description: 'Custom group analysis',
        prompts: analysisPrompts,
        focusAreas: ['Custom Analysis']
      });

      const stageResults: any[] = [];

      // Run each analysis stage
      for (let i = 0; i < analysisPrompts.length; i++) {
        await runAnalysisStage(i, analysisPrompts[i], stageResults);
      }

      // Run synthesis stage
      await runSynthesisStage(stageResults);

      // Combine all results
      const finalAnalysis = {
        groupId: group.id,
        template: selectedTemplate?.name || 'Custom',
        stageResults,
        synthesis: stageResults[stageResults.length - 1],
        metadata: {
          imageCount: images.length,
          analysisDate: new Date().toISOString(),
          focusAreas: selectedTemplate?.focusAreas || ['Custom']
        }
      };

      setAnalysisResults(finalAnalysis);
      
      if (onAnalysisComplete) {
        onAnalysisComplete(finalAnalysis);
      }

      toast({
        title: "Analysis Complete",
        description: `Successfully analyzed ${images.length} images with ${analysisPrompts.length} focus areas`,
      });

    } catch (error) {
      console.error('Group analysis failed:', error);
      toast({
        title: "Analysis Failed",
        description: "Failed to complete group analysis. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsRunning(false);
    }
  };

  const runAnalysisStage = async (stageIndex: number, prompt: string, stageResults: any[]) => {
    // Update stage status
    setAnalysisStages(prev => prev.map((stage, index) => 
      index === stageIndex 
        ? { ...stage, status: 'running', progress: 0 }
        : stage
    ));

    const startTime = Date.now();
    let progressInterval: NodeJS.Timeout | null = null;

    try {
      // Simulate progress updates
      progressInterval = setInterval(() => {
        setAnalysisStages(prev => prev.map((stage, index) => 
          index === stageIndex 
            ? { ...stage, progress: Math.min(stage.progress + 10, 90) }
            : stage
        ));
      }, 500);

      // Call AI analysis for the group
      const { data, error } = await supabase.functions.invoke('ux-analysis', {
        body: {
          type: 'ANALYZE_GROUP',
          payload: {
            groupId: group.id,
            images: images.map(img => ({
              id: img.id,
              name: img.name,
              url: img.url
            })),
            prompt: `${prompt}\n\nFocus on analyzing these ${images.length} images as a cohesive user experience flow. Consider their relationships and overall journey.`,
            groupMetadata: {
              name: group.name,
              description: group.description,
              color: group.color
            }
          }
        }
      });

      if (progressInterval) {
        clearInterval(progressInterval);
        progressInterval = null;
      }

      if (error) throw error;

      const duration = Date.now() - startTime;

      // Update stage completion
      setAnalysisStages(prev => prev.map((stage, index) => 
        index === stageIndex 
          ? { 
              ...stage, 
              status: 'completed', 
              progress: 100, 
              result: data,
              duration 
            }
          : stage
      ));

      stageResults.push({
        stage: stageIndex,
        prompt,
        result: data,
        duration
      });

      setCurrentStage(stageIndex + 1);

    } catch (error) {
      if (progressInterval) {
        clearInterval(progressInterval);
        progressInterval = null;
      }
      
      setAnalysisStages(prev => prev.map((stage, index) => 
        index === stageIndex 
          ? { ...stage, status: 'failed', progress: 0 }
          : stage
      ));

      throw error;
    }
  };

  const runSynthesisStage = async (stageResults: any[]) => {
    const synthesisIndex = analysisStages.length - 1;
    
    setAnalysisStages(prev => prev.map((stage, index) => 
      index === synthesisIndex 
        ? { ...stage, status: 'running', progress: 0 }
        : stage
    ));

    const startTime = Date.now();

    try {
      // Combine insights from all stages
      const combinedInsights = stageResults.map(result => result.result).join('\n\n');
      
      const synthesisPrompt = `Based on the following detailed analyses of ${group.name}, provide a comprehensive synthesis that includes:

1. Key themes and patterns identified across all analyses
2. Priority recommendations ranked by impact
3. Implementation roadmap with timeline suggestions
4. Success metrics to track improvements

Previous analyses:
${combinedInsights}

Provide a structured response that executives and development teams can act upon.`;

      const { data, error } = await supabase.functions.invoke('ux-analysis', {
        body: {
          type: 'ANALYZE_GROUP',
          payload: {
            groupId: group.id,
            images: [],
            prompt: synthesisPrompt,
            isSynthesis: true
          }
        }
      });

      if (error) throw error;

      const duration = Date.now() - startTime;

      setAnalysisStages(prev => prev.map((stage, index) => 
        index === synthesisIndex 
          ? { 
              ...stage, 
              status: 'completed', 
              progress: 100, 
              result: data,
              duration 
            }
          : stage
      ));

      stageResults.push({
        stage: 'synthesis',
        prompt: synthesisPrompt,
        result: data,
        duration
      });

    } catch (error) {
      setAnalysisStages(prev => prev.map((stage, index) => 
        index === synthesisIndex 
          ? { ...stage, status: 'failed', progress: 0 }
          : stage
      ));
      throw error;
    }
  };

  const getStageIcon = (status: AnalysisStage['status']) => {
    switch (status) {
      case 'completed': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'running': return <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />;
      case 'failed': return <AlertCircle className="h-4 w-4 text-red-500" />;
      default: return <Clock className="h-4 w-4 text-gray-400" />;
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Group Analysis Workflow
          </CardTitle>
          <CardDescription>
            Analyze {images.length} images from "{group.name}" with AI-powered insights
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Tabs defaultValue="templates" className="space-y-4">
            <TabsList>
              <TabsTrigger value="templates">Analysis Templates</TabsTrigger>
              <TabsTrigger value="custom">Custom Analysis</TabsTrigger>
            </TabsList>

            <TabsContent value="templates" className="space-y-4">
              <div className="grid gap-4">
                {ANALYSIS_TEMPLATES.map((template) => (
                  <Card 
                    key={template.id} 
                    className={`cursor-pointer transition-colors ${
                      selectedTemplate?.id === template.id 
                        ? 'border-primary bg-primary/5' 
                        : 'hover:border-muted-foreground/20'
                    }`}
                    onClick={() => setSelectedTemplate(template)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <div className="mt-1">
                          <Brain className="h-5 w-5" />
                        </div>
                        <div className="flex-1">
                          <h3 className="font-medium">{template.name}</h3>
                          <p className="text-sm text-muted-foreground mb-2">
                            {template.description}
                          </p>
                          <div className="flex flex-wrap gap-1">
                            {template.focusAreas.map((area, index) => (
                              <Badge key={index} variant="outline" className="text-xs">
                                {area}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="custom" className="space-y-4">
              <div>
                <label className="text-sm font-medium">Custom Analysis Prompt</label>
                <Textarea
                  placeholder="Describe what specific aspects you'd like to analyze across these images..."
                  value={customPrompt}
                  onChange={(e) => setCustomPrompt(e.target.value)}
                  className="mt-2"
                  rows={4}
                />
              </div>
            </TabsContent>
          </Tabs>

          <Button 
            onClick={runGroupAnalysis}
            disabled={isRunning || (!selectedTemplate && !customPrompt.trim())}
            className="w-full"
          >
            {isRunning ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Running Analysis...
              </>
            ) : (
              <>
                <Brain className="h-4 w-4 mr-2" />
                Start Group Analysis
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Analysis Progress */}
      {analysisStages.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Analysis Progress</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {analysisStages.map((stage, index) => (
              <div key={stage.id} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {getStageIcon(stage.status)}
                    <span className="font-medium">{stage.name}</span>
                    {stage.duration && (
                      <Badge variant="outline" className="text-xs">
                        {Math.round(stage.duration / 1000)}s
                      </Badge>
                    )}
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {stage.progress}%
                  </span>
                </div>
                <div className="pl-6">
                  <p className="text-sm text-muted-foreground mb-2">
                    {stage.description}
                  </p>
                  <Progress value={stage.progress} className="h-2" />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Analysis Results */}
      {analysisResults && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lightbulb className="h-5 w-5" />
              Analysis Results
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="summary" className="space-y-4">
              <TabsList>
                <TabsTrigger value="summary">Summary</TabsTrigger>
                <TabsTrigger value="insights">Key Insights</TabsTrigger>
                <TabsTrigger value="recommendations">Recommendations</TabsTrigger>
                <TabsTrigger value="timeline">Implementation</TabsTrigger>
              </TabsList>

              <TabsContent value="summary" className="space-y-4">
                <div className="prose max-w-none">
                  <p>Analysis completed for <strong>{group.name}</strong> using {analysisResults.template} template.</p>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 not-prose">
                    <div className="text-center">
                      <div className="text-2xl font-bold">{images.length}</div>
                      <div className="text-sm text-muted-foreground">Images Analyzed</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold">{analysisResults.stageResults.length}</div>
                      <div className="text-sm text-muted-foreground">Analysis Stages</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold">
                        {Math.round(analysisResults.stageResults.reduce((sum: number, stage: any) => sum + (stage.duration || 0), 0) / 1000)}s
                      </div>
                      <div className="text-sm text-muted-foreground">Total Time</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold">{analysisResults.metadata?.focusAreas?.length || 0}</div>
                      <div className="text-sm text-muted-foreground">Focus Areas</div>
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="insights" className="space-y-4">
                {analysisResults.stageResults.slice(0, -1).map((stage: any, index: number) => (
                  <Card key={index}>
                    <CardHeader>
                      <CardTitle className="text-lg">
                        {selectedTemplate?.focusAreas[index] || `Analysis ${index + 1}`}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-sm whitespace-pre-wrap">
                        {typeof stage.result === 'string' ? stage.result : JSON.stringify(stage.result, null, 2)}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </TabsContent>

              <TabsContent value="recommendations" className="space-y-4">
                {analysisResults.synthesis && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Target className="h-5 w-5" />
                        Strategic Recommendations
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-sm whitespace-pre-wrap">
                        {typeof analysisResults.synthesis.result === 'string' 
                          ? analysisResults.synthesis.result 
                          : JSON.stringify(analysisResults.synthesis.result, null, 2)}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              <TabsContent value="timeline" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Implementation Timeline</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="border-l-2 border-primary pl-4">
                        <h4 className="font-medium">Phase 1: Quick Wins (1-2 weeks)</h4>
                        <p className="text-sm text-muted-foreground">
                          Low-effort, high-impact improvements identified in the analysis
                        </p>
                      </div>
                      <div className="border-l-2 border-muted pl-4">
                        <h4 className="font-medium">Phase 2: Medium-term Improvements (1-2 months)</h4>
                        <p className="text-sm text-muted-foreground">
                          Structural changes requiring design and development resources
                        </p>
                      </div>
                      <div className="border-l-2 border-muted pl-4">
                        <h4 className="font-medium">Phase 3: Strategic Initiatives (3-6 months)</h4>
                        <p className="text-sm text-muted-foreground">
                          Major redesigns or new features based on insights
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}
    </div>
  );
};