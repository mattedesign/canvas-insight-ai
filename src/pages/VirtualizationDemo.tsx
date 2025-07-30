import React, { useState, useEffect } from 'react';
import { PerformantCanvasView } from '@/components/canvas/PerformantCanvasView';
import { useAppContext } from '@/context/SimplifiedAppContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const VirtualizationDemo: React.FC = () => {
  const { state } = useAppContext();
  const [demoImageCount, setDemoImageCount] = useState(10);
  
  // Generate demo images for testing virtualization
  const generateDemoImages = (count: number) => {
    return Array.from({ length: count }, (_, i) => ({
      id: `demo-${i}`,
      name: `Demo Image ${i + 1}.jpg`,
      url: `https://picsum.photos/400/300?random=${i}`,
      file: null,
      size: Math.floor(Math.random() * 1000000) + 500000, // 0.5-1.5MB
      type: 'image/jpeg' as const,
      dimensions: { width: 400, height: 300 },
      status: 'completed' as const,
      createdAt: new Date(Date.now() - i * 60000), // Spread over time
      userId: 'demo-user',
      projectId: 'demo-project',
      analysis: null
    }));
  };

  const generateDemoAnalyses = (count: number) => {
    return Array.from({ length: Math.min(count, 20) }, (_, i) => ({
      id: `analysis-${i}`,
      imageId: `demo-${i}`,
      imageName: `Demo Image ${i + 1}.jpg`,
      imageUrl: `https://picsum.photos/400/300?random=${i}`,
      visualAnnotations: [],
      suggestions: [
        {
          id: `suggestion-${i}`,
          category: 'usability' as const,
          title: `Demo suggestion ${i + 1}`,
          description: 'This is a demo suggestion for testing purposes',
          impact: 'medium' as const,
          effort: 'low' as const,
          actionItems: ['Review design', 'Update implementation'],
          relatedAnnotations: []
        }
      ],
      summary: {
        overallScore: 70 + Math.floor(Math.random() * 30),
        categoryScores: {
          usability: 75,
          accessibility: 80,
          visual: 85,
          content: 70
        },
        keyIssues: [],
        strengths: []
      },
      metadata: {
        objects: [],
        text: [],
        colors: [],
        faces: 0
      },
      userContext: '',
      analysisType: 'full_analysis' as const,
      status: 'completed' as const,
      createdAt: new Date()
    }));
  };

  const [demoImages, setDemoImages] = useState(() => generateDemoImages(demoImageCount));
  const [demoAnalyses, setDemoAnalyses] = useState(() => generateDemoAnalyses(demoImageCount));

  useEffect(() => {
    setDemoImages(generateDemoImages(demoImageCount));
    setDemoAnalyses(generateDemoAnalyses(demoImageCount));
  }, [demoImageCount]);

  const performanceMetrics = {
    shouldVirtualize: demoImageCount > 50,
    estimatedMemoryUsage: `${(demoImageCount * 0.5).toFixed(1)}MB`,
    renderingMode: demoImageCount > 50 ? 'Virtualized' : 'Standard ReactFlow'
  };

  return (
    <div className="p-6 bg-background min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">Canvas Virtualization Demo</h1>
          <p className="text-muted-foreground">
            Test the virtualized canvas rendering with different dataset sizes
          </p>
        </div>

        <Tabs defaultValue="demo" className="w-full">
          <TabsList>
            <TabsTrigger value="demo">Virtualization Demo</TabsTrigger>
            <TabsTrigger value="real">Real Project Data</TabsTrigger>
          </TabsList>
          
          <TabsContent value="demo" className="space-y-6">
            {/* Controls */}
            <Card>
              <CardHeader>
                <CardTitle>Demo Controls</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-4">
                  <label className="text-sm font-medium">Image Count:</label>
                  <div className="flex gap-2">
                    {[10, 25, 50, 100, 200].map(count => (
                      <Button
                        key={count}
                        size="sm"
                        variant={demoImageCount === count ? 'default' : 'outline'}
                        onClick={() => setDemoImageCount(count)}
                      >
                        {count}
                      </Button>
                    ))}
                  </div>
                </div>
                
                <div className="flex items-center gap-4">
                  <Badge variant={performanceMetrics.shouldVirtualize ? 'default' : 'secondary'}>
                    {performanceMetrics.renderingMode}
                  </Badge>
                  <span className="text-sm text-muted-foreground">
                    Memory: {performanceMetrics.estimatedMemoryUsage}
                  </span>
                </div>
                
                <div className="text-sm text-muted-foreground">
                  Virtualization automatically activates at 50+ images for optimal performance
                </div>
              </CardContent>
            </Card>

            {/* Canvas Demo */}
            <Card>
              <CardHeader>
                <CardTitle>Canvas Rendering ({demoImages.length} images)</CardTitle>
              </CardHeader>
              <CardContent className="h-96">
                <PerformantCanvasView
                  uploadedImages={demoImages}
                  analyses={demoAnalyses}
                  generatedConcepts={[]}
                  imageGroups={[]}
                  showAnnotations={true}
                  onImageSelect={(id) => console.log('Selected:', id)}
                  onOpenAnalysisPanel={(id) => console.log('Analysis:', id)}
                  onAnalysisComplete={(imageId, analysis) => console.log('Complete:', imageId)}
                />
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="real" className="space-y-6">
            {/* Real Project Data */}
            <Card>
              <CardHeader>
                <CardTitle>Real Project Data</CardTitle>
              </CardHeader>
              <CardContent>
                {state.uploadedImages.length > 0 ? (
                  <div className="h-96">
                    <PerformantCanvasView
                      uploadedImages={state.uploadedImages}
                      analyses={state.analyses}
                      generatedConcepts={[]}
                      imageGroups={state.imageGroups}
                      showAnnotations={true}
                      onImageSelect={(id) => console.log('Selected:', id)}
                      onOpenAnalysisPanel={(id) => console.log('Analysis:', id)}
                      onAnalysisComplete={(imageId, analysis) => console.log('Complete:', imageId)}
                    />
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <p>No project data available</p>
                    <p className="text-sm">Upload images to see real virtualization performance</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default VirtualizationDemo;