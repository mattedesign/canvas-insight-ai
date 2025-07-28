import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';

interface LoadingSpinnerProps {
  message?: string;
  size?: 'sm' | 'md' | 'lg';
  fullScreen?: boolean;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  message = "Loading...",
  size = 'md',
  fullScreen = false
}) => {
  const sizeClass = {
    sm: 'h-4 w-4',
    md: 'h-8 w-8',
    lg: 'h-12 w-12'
  }[size];

  const content = (
    <div className="flex flex-col items-center gap-4">
      <Loader2 className={`${sizeClass} animate-spin text-primary`} />
      <p className="text-muted-foreground text-sm">{message}</p>
    </div>
  );

  if (fullScreen) {
    return (
      <div className="flex h-screen bg-background items-center justify-center">
        {content}
      </div>
    );
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardContent className="p-6">
        {content}
      </CardContent>
    </Card>
  );
};