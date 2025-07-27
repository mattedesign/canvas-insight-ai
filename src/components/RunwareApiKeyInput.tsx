import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ExternalLink, Key } from 'lucide-react';

interface RunwareApiKeyInputProps {
  onApiKeySubmit: (apiKey: string) => void;
  isLoading?: boolean;
}

export const RunwareApiKeyInput: React.FC<RunwareApiKeyInputProps> = ({ 
  onApiKeySubmit, 
  isLoading = false 
}) => {
  const [apiKey, setApiKey] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (apiKey.trim()) {
      onApiKeySubmit(apiKey.trim());
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="text-center">
        <div className="flex items-center justify-center mb-2">
          <Key className="h-8 w-8 text-primary" />
        </div>
        <CardTitle>Runware AI Setup</CardTitle>
        <CardDescription>
          Enter your Runware API key to generate realistic concept images
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="apiKey">API Key</Label>
            <Input
              id="apiKey"
              type="password"
              placeholder="Enter your Runware API key"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              disabled={isLoading}
            />
          </div>
          <Button 
            type="submit" 
            className="w-full" 
            disabled={!apiKey.trim() || isLoading}
          >
            {isLoading ? 'Connecting...' : 'Connect to Runware'}
          </Button>
        </form>
        
        <div className="text-center">
          <a 
            href="https://runware.ai/" 
            target="_blank" 
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary"
          >
            Get your API key at runware.ai
            <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      </CardContent>
    </Card>
  );
};