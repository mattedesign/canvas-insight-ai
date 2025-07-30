import React, { useState, memo } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { X, Send, Sparkles, Zap, Target, Palette } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ChatPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

const suggestedPrompts = [
  {
    icon: <Sparkles className="h-4 w-4" />,
    text: "Analyze the visual hierarchy",
    prompt: "Can you analyze the visual hierarchy of this design and suggest improvements?"
  },
  {
    icon: <Zap className="h-4 w-4" />,
    text: "Improve accessibility",
    prompt: "What accessibility improvements would you recommend for this interface?"
  },
  {
    icon: <Target className="h-4 w-4" />,
    text: "Optimize user flow",
    prompt: "How can we optimize the user flow in this design?"
  },
  {
    icon: <Palette className="h-4 w-4" />,
    text: "Review color scheme",
    prompt: "Please review the color scheme and contrast ratios in this design."
  }
];

// ✅ PHASE 4.2: MEMOIZED COMPONENT FOR PERFORMANCE
export const ChatPanel: React.FC<ChatPanelProps> = memo(({ isOpen, onClose }) => {
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleSendMessage = async () => {
    if (!message.trim()) return;
    
    setIsLoading(true);
    
    // Simulate AI processing
    setTimeout(() => {
      setIsLoading(false);
      setMessage('');
      toast({
        title: "Message sent",
        description: "AI is analyzing your request...",
      });
    }, 1000);
  };

  const handleSuggestedPrompt = (prompt: string) => {
    setMessage(prompt);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/50 backdrop-blur-sm">
      <Card className="w-full max-w-md mx-4 bg-background/95 backdrop-blur-sm border shadow-lg animate-scale-in">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
          <CardTitle className="text-lg font-semibold">AI Assistant</CardTitle>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Suggested Prompts */}
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground mb-3">
              Get started with these suggestions:
            </p>
            <div className="grid grid-cols-1 gap-2">
              {suggestedPrompts.map((prompt, index) => (
                <Button
                  key={index}
                  variant="outline"
                  size="sm"
                  className="justify-start gap-2 h-auto p-3 text-left"
                  onClick={() => handleSuggestedPrompt(prompt.prompt)}
                >
                  {prompt.icon}
                  <span className="text-xs">{prompt.text}</span>
                </Button>
              ))}
            </div>
          </div>

          {/* Message Input */}
          <div className="space-y-2">
            <Textarea
              placeholder="Ask AI about your design..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="resize-none min-h-[80px]"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
            />
            <div className="flex justify-between items-center">
              <p className="text-xs text-muted-foreground">
                Press Ctrl+Enter to send
              </p>
              <Button
                onClick={handleSendMessage}
                disabled={!message.trim() || isLoading}
                size="sm"
                className="gap-2"
              >
                {isLoading ? (
                  <>
                    <div className="h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="h-3 w-3" />
                    Send
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}); // ✅ PHASE 4.2: MEMOIZED COMPONENT CLOSING

// ✅ PHASE 4.2: SET DISPLAY NAME FOR DEBUGGING
ChatPanel.displayName = 'ChatPanel';