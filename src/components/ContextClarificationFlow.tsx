import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { AnalysisContext, ClarifiedContext } from '@/types/contextTypes';
import { HelpCircle, User, Monitor } from 'lucide-react';

interface ContextClarificationFlowProps {
  context: AnalysisContext;
  onClarificationComplete: (clarifiedContext: ClarifiedContext) => void;
  onSkip: () => void;
}

export function ContextClarificationFlow({ 
  context, 
  onClarificationComplete, 
  onSkip 
}: ContextClarificationFlowProps) {
  const [responses, setResponses] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleResponseChange = (questionKey: string, value: string) => {
    setResponses(prev => ({
      ...prev,
      [questionKey]: value
    }));
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      // Enhanced context with user responses
      const clarifiedContext: ClarifiedContext = {
        ...context,
        clarificationResponses: responses,
        enhancedConfidence: 0.9,
        clarificationNeeded: false,
        // Update specific fields based on responses
        user: {
          ...context.user,
          inferredRole: responses.role as any || context.user.inferredRole,
          goals: responses.goals ? [responses.goals] : context.user.goals
        },
        image: {
          ...context.image,
          primaryType: responses.interfaceType as any || context.image.primaryType,
          domain: responses.domain || context.image.domain
        }
      };

      onClarificationComplete(clarifiedContext);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <HelpCircle className="h-5 w-5" />
          Let's clarify a few details
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Help us provide better analysis by answering these optional questions.
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Current Detection Status */}
        <div className="bg-muted/50 p-4 rounded-lg">
          <h4 className="font-medium mb-2">What we detected:</h4>
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline" className="flex items-center gap-1">
              <Monitor className="h-3 w-3" />
              {context.image.primaryType}
            </Badge>
            <Badge variant="secondary">
              {context.image.domain}
            </Badge>
            <Badge variant="outline">
              {Math.round(context.confidence * 100)}% confidence
            </Badge>
          </div>
        </div>

        {/* Interface Type Clarification */}
        <div className="space-y-2">
          <Label htmlFor="interfaceType">What type of interface is this?</Label>
          <Select value={responses.interfaceType || ''} onValueChange={(value) => handleResponseChange('interfaceType', value)}>
            <SelectTrigger>
              <SelectValue placeholder="Select interface type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="dashboard">Dashboard</SelectItem>
              <SelectItem value="landing">Landing Page</SelectItem>
              <SelectItem value="mobile">Mobile App</SelectItem>
              <SelectItem value="ecommerce">E-commerce Site</SelectItem>
              <SelectItem value="form">Form/Survey</SelectItem>
              <SelectItem value="saas">SaaS Application</SelectItem>
              <SelectItem value="portfolio">Portfolio</SelectItem>
              <SelectItem value="content">Content Site</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* User Role Clarification */}
        <div className="space-y-2">
          <Label htmlFor="role">What's your role or perspective?</Label>
          <Select value={responses.role || ''} onValueChange={(value) => handleResponseChange('role', value)}>
            <SelectTrigger>
              <SelectValue placeholder="Select your role" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="designer">Designer</SelectItem>
              <SelectItem value="developer">Developer</SelectItem>
              <SelectItem value="product">Product Manager</SelectItem>
              <SelectItem value="business">Business Owner</SelectItem>
              <SelectItem value="marketing">Marketing</SelectItem>
              <SelectItem value="other">Other</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Domain/Industry */}
        <div className="space-y-2">
          <Label htmlFor="domain">What industry or domain is this for?</Label>
          <Input
            id="domain"
            placeholder="e.g., healthcare, finance, education, retail..."
            value={responses.domain || ''}
            onChange={(e) => handleResponseChange('domain', e.target.value)}
          />
        </div>

        {/* Goals */}
        <div className="space-y-2">
          <Label htmlFor="goals">What would you like me to focus on?</Label>
          <Input
            id="goals"
            placeholder="e.g., conversion optimization, accessibility, mobile experience..."
            value={responses.goals || ''}
            onChange={(e) => handleResponseChange('goals', e.target.value)}
          />
        </div>

        {/* Action Buttons */}
        <div className="flex justify-between pt-4">
          <Button 
            variant="outline" 
            onClick={onSkip}
            disabled={isSubmitting}
          >
            Skip for now
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Processing...' : 'Continue with Analysis'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}