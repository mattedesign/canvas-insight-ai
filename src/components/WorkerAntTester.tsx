import React from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { useWorkerAnts } from '../hooks/useWorkerAnts';
import { Bug } from 'lucide-react';

export const WorkerAntTester: React.FC = () => {
  const { deployColony, isProcessing, eventId } = useWorkerAnts({
    onSuccess: (id) => console.log('🎉 Colony deployed with ID:', id),
    onError: (error) => console.error('❌ Colony failed:', error)
  });

  const handleTest = () => {
    // Test with dummy data
    deployColony(
      'https://example.com/test-image.png',
      'test-image-123',
      'test-user-456'
    );
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bug className="w-5 h-5" />
          Worker Ant Colony Tester
        </CardTitle>
        <CardDescription>
          Test your Worker Ant infrastructure
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button 
          onClick={handleTest} 
          disabled={isProcessing}
          className="w-full"
        >
          {isProcessing ? '🐜 Deploying Colony...' : '🚀 Deploy Test Colony'}
        </Button>
        
        {eventId && (
          <div className="p-3 bg-green-50 border border-green-200 rounded-md">
            <p className="text-sm text-green-800">
              Colony deployed! Event ID: <code className="text-xs">{eventId}</code>
            </p>
          </div>
        )}
        
        <div className="text-xs text-muted-foreground space-y-1">
          <p>• Check Inngest dashboard at localhost:8288</p>
          <p>• Make sure API server is running on port 3001</p>
          <p>• Worker ants will process in sequence</p>
        </div>
      </CardContent>
    </Card>
  );
};
