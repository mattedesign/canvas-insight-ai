import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Textarea } from '@/components/ui/textarea';
import { HelpCircle } from 'lucide-react';

interface ContextClarificationProps {
  questions: string[];
  partialContext: any;
  onSubmit: (responses: Record<string, string>) => void;
  onCancel: () => void;
}

export function ContextClarification({
  questions,
  partialContext,
  onSubmit,
  onCancel
}: ContextClarificationProps) {
  const [responses, setResponses] = useState<Record<string, string>>({});

  const handleSubmit = () => {
    onSubmit(responses);
  };

  const getQuestionType = (question: string): 'role' | 'interface' | 'goals' | 'text' => {
    if (question.toLowerCase().includes('role') || question.toLowerCase().includes('perspective')) {
      return 'role';
    }
    if (question.toLowerCase().includes('interface') || question.toLowerCase().includes('dashboard') || question.toLowerCase().includes('landing')) {
      return 'interface';
    }
    if (question.toLowerCase().includes('goal') || question.toLowerCase().includes('improve')) {
      return 'goals';
    }
    return 'text';
  };

  const renderQuestionInput = (question: string, index: number) => {
    const type = getQuestionType(question);
    const key = `question_${index}`;

    switch (type) {
      case 'role':
        return (
          <RadioGroup
            value={responses[key] || ''}
            onValueChange={(value) => setResponses({ ...responses, [key]: value })}
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="designer" id="designer" />
              <Label htmlFor="designer">Designer</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="developer" id="developer" />
              <Label htmlFor="developer">Developer</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="product" id="product" />
              <Label htmlFor="product">Product Manager</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="business" id="business" />
              <Label htmlFor="business">Business Stakeholder</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="marketing" id="marketing" />
              <Label htmlFor="marketing">Marketing</Label>
            </div>
          </RadioGroup>
        );

      case 'interface':
        return (
          <RadioGroup
            value={responses[key] || ''}
            onValueChange={(value) => setResponses({ ...responses, [key]: value })}
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="dashboard" id="dashboard" />
              <Label htmlFor="dashboard">Dashboard</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="landing" id="landing" />
              <Label htmlFor="landing">Landing Page</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="mobile" id="mobile" />
              <Label htmlFor="mobile">Mobile App</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="ecommerce" id="ecommerce" />
              <Label htmlFor="ecommerce">E-commerce</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="saas" id="saas" />
              <Label htmlFor="saas">SaaS Application</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="form" id="form" />
              <Label htmlFor="form">Form/Survey</Label>
            </div>
          </RadioGroup>
        );

      default:
        return (
          <Textarea
            value={responses[key] || ''}
            onChange={(e) => setResponses({ ...responses, [key]: e.target.value })}
            placeholder="Type your answer here..."
            className="min-h-[80px]"
          />
        );
    }
  };

  const allQuestionsAnswered = questions.every((_, index) => 
    responses[`question_${index}`] && responses[`question_${index}`].trim() !== ''
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <HelpCircle className="h-5 w-5" />
          Help Us Better Understand Your Needs
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          We need a bit more information to provide the most relevant analysis for your specific context.
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {questions.map((question, index) => (
          <div key={index} className="space-y-2">
            <Label className="text-base">{question}</Label>
            {renderQuestionInput(question, index)}
          </div>
        ))}

        <div className="flex gap-4 pt-4">
          <Button 
            onClick={handleSubmit}
            disabled={!allQuestionsAnswered}
            className="flex-1"
          >
            Continue Analysis
          </Button>
          <Button 
            onClick={onCancel}
            variant="outline"
          >
            Cancel
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}