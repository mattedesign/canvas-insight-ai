/**
 * Natural Analysis Demo Component
 * Demonstrates the new natural AI analysis pipeline
 */

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Brain, 
  Sparkles, 
  Zap,
  ArrowRight,
  CheckCircle,
  Info
} from 'lucide-react';

export function NaturalAnalysisDemo() {
  const [activeExample, setActiveExample] = useState<'traditional' | 'natural'>('natural');

  const examples = {
    traditional: {
      title: 'Traditional Analysis',
      description: 'Structured analysis with predefined schemas',
      features: [
        'Fixed output format',
        'Comprehensive coverage',
        'Consistent structure',
        'Schema validation'
      ],
      sampleInsight: {
        category: 'Usability',
        score: 75,
        finding: 'Button placement follows standard patterns. Consider increasing contrast ratio for better accessibility.'
      }
    },
    natural: {
      title: 'Natural AI Analysis',
      description: 'Dynamic insights from unfiltered AI responses',
      features: [
        'AI-driven insights',
        'Domain-specific findings',
        'Dynamic adaptation',
        'Context-aware recommendations'
      ],
      sampleInsight: {
        category: 'User Flow Optimization',
        confidence: 0.92,
        finding: 'The checkout process shows three distinct friction points where users might abandon their purchase. The shipping options are buried below the fold, the payment methods lack visual trust indicators, and the form validation provides unclear error messaging.'
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Sparkles className="h-6 w-6 text-primary" />
            </div>
            <div>
              <CardTitle className="text-xl">Natural AI Analysis Pipeline</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Revolutionary approach to UX analysis that preserves AI intelligence
              </p>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* How It Works */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            How Natural Analysis Works
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center space-y-3">
              <div className="p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
                <Brain className="h-8 w-8 text-blue-600 mx-auto" />
              </div>
              <h3 className="font-semibold">1. Natural Collection</h3>
              <p className="text-sm text-muted-foreground">
                Multiple AI models analyze the interface without structural constraints, 
                providing unfiltered, natural insights.
              </p>
            </div>
            
            <div className="text-center space-y-3">
              <div className="p-3 bg-purple-50 dark:bg-purple-950/20 rounded-lg">
                <Sparkles className="h-8 w-8 text-purple-600 mx-auto" />
              </div>
              <h3 className="font-semibold">2. AI Interpretation</h3>
              <p className="text-sm text-muted-foreground">
                A meta-analysis AI synthesizes raw responses into domain-specific, 
                actionable insights based on context.
              </p>
            </div>
            
            <div className="text-center space-y-3">
              <div className="p-3 bg-green-50 dark:bg-green-950/20 rounded-lg">
                <CheckCircle className="h-8 w-8 text-green-600 mx-auto" />
              </div>
              <h3 className="font-semibold">3. Dynamic Display</h3>
              <p className="text-sm text-muted-foreground">
                UI adapts to display whatever insights are found, 
                rather than forcing predefined structures.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Comparison */}
      <Card>
        <CardHeader>
          <CardTitle>Pipeline Comparison</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={activeExample} onValueChange={(v) => setActiveExample(v as any)}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="traditional">Traditional Pipeline</TabsTrigger>
              <TabsTrigger value="natural">Natural AI Pipeline</TabsTrigger>
            </TabsList>
            
            <TabsContent value="traditional" className="space-y-4">
              <div className="p-4 border rounded-lg">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold">{examples.traditional.title}</h3>
                  <Badge variant="secondary">Structured</Badge>
                </div>
                <p className="text-sm text-muted-foreground mb-4">
                  {examples.traditional.description}
                </p>
                
                <div className="space-y-2">
                  <h4 className="text-sm font-medium">Key Features:</h4>
                  <ul className="space-y-1">
                    {examples.traditional.features.map((feature, index) => (
                      <li key={index} className="text-sm text-muted-foreground flex items-center gap-2">
                        <div className="w-1 h-1 bg-muted-foreground rounded-full" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                </div>
                
                <div className="mt-4 p-3 bg-muted/50 rounded-lg">
                  <h5 className="text-sm font-medium mb-2">Sample Output:</h5>
                  <div className="text-sm">
                    <Badge variant="outline" className="mb-2">{examples.traditional.sampleInsight.category}</Badge>
                    <p className="text-muted-foreground">{examples.traditional.sampleInsight.finding}</p>
                  </div>
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="natural" className="space-y-4">
              <div className="p-4 border rounded-lg">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold">{examples.natural.title}</h3>
                  <Badge variant="default">Adaptive</Badge>
                </div>
                <p className="text-sm text-muted-foreground mb-4">
                  {examples.natural.description}
                </p>
                
                <div className="space-y-2">
                  <h4 className="text-sm font-medium">Key Features:</h4>
                  <ul className="space-y-1">
                    {examples.natural.features.map((feature, index) => (
                      <li key={index} className="text-sm text-muted-foreground flex items-center gap-2">
                        <div className="w-1 h-1 bg-primary rounded-full" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                </div>
                
                <div className="mt-4 p-3 bg-primary/5 rounded-lg">
                  <h5 className="text-sm font-medium mb-2">Sample Output:</h5>
                  <div className="text-sm">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge>{examples.natural.sampleInsight.category}</Badge>
                      <Badge variant="outline">
                        {Math.round(examples.natural.sampleInsight.confidence * 100)}% confidence
                      </Badge>
                    </div>
                    <p className="text-muted-foreground">{examples.natural.sampleInsight.finding}</p>
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Benefits */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Why Natural Analysis?
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <h3 className="font-semibold text-green-700 dark:text-green-400">Benefits</h3>
              <ul className="space-y-2">
                <li className="flex items-start gap-2 text-sm">
                  <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                  <span>Preserves AI analysis richness and nuance</span>
                </li>
                <li className="flex items-start gap-2 text-sm">
                  <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                  <span>Generates genuinely relevant, domain-specific insights</span>
                </li>
                <li className="flex items-start gap-2 text-sm">
                  <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                  <span>Adapts to different interface types dynamically</span>
                </li>
                <li className="flex items-start gap-2 text-sm">
                  <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                  <span>Reduces complex validation and transformation logic</span>
                </li>
              </ul>
            </div>
            
            <div className="space-y-3">
              <h3 className="font-semibold text-blue-700 dark:text-blue-400">Use Cases</h3>
              <ul className="space-y-2">
                <li className="flex items-start gap-2 text-sm">
                  <ArrowRight className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                  <span>E-commerce conversion optimization</span>
                </li>
                <li className="flex items-start gap-2 text-sm">
                  <ArrowRight className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                  <span>SaaS onboarding flow analysis</span>
                </li>
                <li className="flex items-start gap-2 text-sm">
                  <ArrowRight className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                  <span>Mobile app usability evaluation</span>
                </li>
                <li className="flex items-start gap-2 text-sm">
                  <ArrowRight className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                  <span>Dashboard design effectiveness</span>
                </li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Implementation Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Info className="h-5 w-5" />
            Implementation Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h3 className="font-semibold mb-3">✅ Completed</h3>
              <ul className="space-y-1 text-sm text-muted-foreground">
                <li>• Natural AI analysis edge function</li>
                <li>• AI insight interpreter service</li>
                <li>• Natural analysis pipeline orchestration</li>
                <li>• Dynamic UI display components</li>
                <li>• Enhanced analysis trigger</li>
                <li>• Context-aware prompt generation</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-3">🔧 Ready for Use</h3>
              <ul className="space-y-1 text-sm text-muted-foreground">
                <li>• Switch between pipelines in UI</li>
                <li>• Upload images for analysis</li>
                <li>• View dynamic insights display</li>
                <li>• See domain-specific findings</li>
                <li>• Experience adaptive recommendations</li>
                <li>• Compare with traditional analysis</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}