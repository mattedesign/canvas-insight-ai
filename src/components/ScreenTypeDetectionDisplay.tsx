import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ImageContext } from '@/types/contextTypes';
import { 
  Monitor, 
  Smartphone, 
  Globe, 
  ShoppingCart, 
  FileText, 
  Layout,
  Palette,
  Building,
  Users,
  Zap
} from 'lucide-react';

interface ScreenTypeDetectionDisplayProps {
  imageContext: ImageContext;
  detectionConfidence: number;
  isLoading?: boolean;
}

export function ScreenTypeDetectionDisplay({ 
  imageContext, 
  detectionConfidence,
  isLoading = false 
}: ScreenTypeDetectionDisplayProps) {
  
  const getInterfaceIcon = (type: string) => {
    const icons = {
      dashboard: Monitor,
      mobile: Smartphone,
      landing: Globe,
      ecommerce: ShoppingCart,
      form: FileText,
      app: Layout,
      saas: Zap,
      portfolio: Palette,
      content: FileText
    };
    const Icon = icons[type] || Layout;
    return <Icon className="h-5 w-5" />;
  };

  const getComplexityColor = (complexity: string) => {
    switch (complexity) {
      case 'simple': return 'bg-green-500';
      case 'moderate': return 'bg-yellow-500';
      case 'complex': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getMaturityStageColor = (stage: string) => {
    switch (stage) {
      case 'prototype': return 'destructive';
      case 'mvp': return 'secondary';
      case 'growth': return 'default';
      case 'mature': return 'outline';
      default: return 'secondary';
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
            Detecting Screen Type...
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="bg-muted animate-pulse rounded h-4"></div>
            <div className="bg-muted animate-pulse rounded h-4 w-3/4"></div>
            <div className="bg-muted animate-pulse rounded h-4 w-1/2"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between text-base">
          <div className="flex items-center gap-2">
            {getInterfaceIcon(imageContext.primaryType)}
            Screen Type Analysis
          </div>
          <Badge variant="outline" className="text-xs">
            {Math.round(detectionConfidence * 100)}% Confidence
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Primary Interface Type */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Interface Type</span>
            <Badge variant="default" className="capitalize flex items-center gap-1">
              {getInterfaceIcon(imageContext.primaryType)}
              {imageContext.primaryType}
            </Badge>
          </div>
          <Progress value={detectionConfidence * 100} className="h-2" />
        </div>

        {/* Domain & Industry */}
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Domain</span>
          <Badge variant="secondary" className="capitalize flex items-center gap-1">
            <Building className="h-3 w-3" />
            {imageContext.domain}
          </Badge>
        </div>

        {/* Complexity Level */}
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Complexity</span>
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${getComplexityColor(imageContext.complexity)}`}></div>
            <Badge variant="outline" className="capitalize text-xs">
              {imageContext.complexity}
            </Badge>
          </div>
        </div>

        {/* Platform */}
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Platform</span>
          <Badge variant="outline" className="capitalize text-xs">
            {imageContext.platform}
          </Badge>
        </div>

        {/* Sub-types */}
        {imageContext.subTypes && imageContext.subTypes.length > 0 && (
          <div className="space-y-2">
            <span className="text-sm font-medium">Pattern Types</span>
            <div className="flex flex-wrap gap-1">
              {imageContext.subTypes.map((subType, index) => (
                <Badge key={index} variant="outline" className="text-xs">
                  {subType}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Target Audience */}
        {imageContext.targetAudience && (
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Target Audience</span>
            <Badge variant="secondary" className="text-xs flex items-center gap-1">
              <Users className="h-3 w-3" />
              {imageContext.targetAudience}
            </Badge>
          </div>
        )}

        {/* Maturity Stage */}
        {imageContext.maturityStage && (
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Maturity Stage</span>
            <Badge 
              variant={getMaturityStageColor(imageContext.maturityStage)} 
              className="text-xs capitalize"
            >
              {imageContext.maturityStage}
            </Badge>
          </div>
        )}

        {/* Design System Detection */}
        {imageContext.designSystem && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Design System</span>
              <Badge 
                variant={imageContext.designSystem.detected ? "default" : "secondary"} 
                className="text-xs"
              >
                {imageContext.designSystem.detected ? "Detected" : "Not Detected"}
              </Badge>
            </div>
            {imageContext.designSystem.detected && (
              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span>Consistency Score</span>
                  <span>{Math.round((imageContext.designSystem.consistency || 0) * 100)}%</span>
                </div>
                <Progress 
                  value={(imageContext.designSystem.consistency || 0) * 100} 
                  className="h-1" 
                />
              </div>
            )}
          </div>
        )}

        {/* User Intent */}
        {imageContext.userIntent && imageContext.userIntent.length > 0 && (
          <div className="space-y-2">
            <span className="text-sm font-medium">Likely User Goals</span>
            <div className="flex flex-wrap gap-1">
              {imageContext.userIntent.slice(0, 3).map((intent, index) => (
                <Badge key={index} variant="outline" className="text-xs">
                  {intent}
                </Badge>
              ))}
              {imageContext.userIntent.length > 3 && (
                <Badge variant="outline" className="text-xs">
                  +{imageContext.userIntent.length - 3} more
                </Badge>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}