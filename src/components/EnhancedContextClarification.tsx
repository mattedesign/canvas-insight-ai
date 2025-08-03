import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { AnalysisContext } from '@/types/contextTypes';
import { Eye, User, Target, AlertCircle } from 'lucide-react';

interface EnhancedContextClarificationProps {
  analysisContext: AnalysisContext;
  questions: string[];
  onSubmit: (responses: Record<string, string>) => void;
  onCancel: () => void;
}

export function EnhancedContextClarification({ 
  analysisContext, 
  questions, 
  onSubmit, 
  onCancel 
}: EnhancedContextClarificationProps) {
  const [responses, setResponses] = useState<Record<string, string>>({});

  const handleSubmit = () => {
    onSubmit(responses);
  };

  const handleResponseChange = (questionIndex: number, value: string) => {
    setResponses(prev => ({
      ...prev,
      [questionIndex.toString()]: value
    }));
  };

  const getQuestionType = (question: string): 'role' | 'interface' | 'goals' | 'domain' | 'text' => {
    const q = question.toLowerCase();
    if (q.includes('role') || q.includes('designer') || q.includes('developer')) return 'role';
    if (q.includes('interface') || q.includes('type') || q.includes('dashboard')) return 'interface';
    if (q.includes('domain') || q.includes('industry') || q.includes('business')) return 'domain';
    if (q.includes('focus') || q.includes('goal') || q.includes('improve')) return 'goals';
    return 'text';
  };

  const renderQuestionInput = (question: string, index: number) => {
    const type = getQuestionType(question);
    const value = responses[index.toString()] || '';

    switch (type) {
      case 'role':
        return (
          <RadioGroup 
            value={value} 
            onValueChange={(val) => handleResponseChange(index, val)}
            className="mt-2"
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="designer" id={`role-designer-${index}`} />
              <Label htmlFor={`role-designer-${index}`}>Designer</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="developer" id={`role-developer-${index}`} />
              <Label htmlFor={`role-developer-${index}`}>Developer</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="product-manager" id={`role-pm-${index}`} />
              <Label htmlFor={`role-pm-${index}`}>Product Manager</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="business-owner" id={`role-business-${index}`} />
              <Label htmlFor={`role-business-${index}`}>Business Owner</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="other" id={`role-other-${index}`} />
              <Label htmlFor={`role-other-${index}`}>Other</Label>
            </div>
          </RadioGroup>
        );

      case 'interface':
        return (
          <RadioGroup 
            value={value} 
            onValueChange={(val) => handleResponseChange(index, val)}
            className="mt-2"
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="dashboard" id={`interface-dashboard-${index}`} />
              <Label htmlFor={`interface-dashboard-${index}`}>Dashboard</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="landing-page" id={`interface-landing-${index}`} />
              <Label htmlFor={`interface-landing-${index}`}>Landing Page</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="mobile-app" id={`interface-mobile-${index}`} />
              <Label htmlFor={`interface-mobile-${index}`}>Mobile App</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="ecommerce" id={`interface-ecommerce-${index}`} />
              <Label htmlFor={`interface-ecommerce-${index}`}>E-commerce Site</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="form" id={`interface-form-${index}`} />
              <Label htmlFor={`interface-form-${index}`}>Form</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="saas" id={`interface-saas-${index}`} />
              <Label htmlFor={`interface-saas-${index}`}>SaaS Application</Label>
            </div>
          </RadioGroup>
        );

      case 'domain':
        return (
          <RadioGroup 
            value={value} 
            onValueChange={(val) => handleResponseChange(index, val)}
            className="mt-2"
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="finance" id={`domain-finance-${index}`} />
              <Label htmlFor={`domain-finance-${index}`}>Finance/Banking</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="healthcare" id={`domain-healthcare-${index}`} />
              <Label htmlFor={`domain-healthcare-${index}`}>Healthcare</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="ecommerce" id={`domain-ecommerce-${index}`} />
              <Label htmlFor={`domain-ecommerce-${index}`}>E-commerce/Retail</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="education" id={`domain-education-${index}`} />
              <Label htmlFor={`domain-education-${index}`}>Education</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="technology" id={`domain-tech-${index}`} />
              <Label htmlFor={`domain-tech-${index}`}>Technology/SaaS</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="other" id={`domain-other-${index}`} />
              <Label htmlFor={`domain-other-${index}`}>Other</Label>
            </div>
          </RadioGroup>
        );

      default:
        return (
          <Textarea
            value={value}
            onChange={(e) => handleResponseChange(index, e.target.value)}
            placeholder="Please provide more details..."
            className="mt-2"
            rows={3}
          />
        );
    }
  };

  const allQuestionsAnswered = questions.every((_, index) => 
    responses[index.toString()]?.trim()
  );

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <div className="flex items-center gap-2">
          <AlertCircle className="h-5 w-5 text-orange-500" />
          <CardTitle>Help Us Understand Your Interface Better</CardTitle>
        </div>
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <Eye className="h-4 w-4" />
            <span>Detected: {analysisContext.image.primaryType}</span>
          </div>
          <div className="flex items-center gap-1">
            <User className="h-4 w-4" />
            <span>Role: {analysisContext.user.inferredRole || 'Unknown'}</span>
          </div>
          <Badge variant="outline" className="text-xs">
            Confidence: {Math.round(analysisContext.confidence * 100)}%
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-6">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start gap-2">
            <Target className="h-5 w-5 text-blue-600 mt-0.5" />
            <div>
              <h4 className="font-medium text-blue-900">Why we're asking</h4>
              <p className="text-sm text-blue-700 mt-1">
                These details help us provide more specific and actionable UX insights tailored to your interface type and goals.
              </p>
            </div>
          </div>
        </div>

        {questions.map((question, index) => (
          <div key={index} className="space-y-2">
            <Label className="text-base font-medium">{question}</Label>
            {renderQuestionInput(question, index)}
          </div>
        ))}

        <div className="flex gap-3 pt-4">
          <Button 
            onClick={handleSubmit}
            disabled={!allQuestionsAnswered}
            className="flex-1"
          >
            Continue Analysis
          </Button>
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}