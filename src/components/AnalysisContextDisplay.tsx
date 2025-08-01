import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AnalysisContext } from '@/types/contextTypes';
import { 
  Monitor, 
  Smartphone, 
  Globe, 
  ShoppingCart, 
  FileText, 
  Layout,
  Briefcase,
  Code,
  Palette,
  TrendingUp,
  Megaphone
} from 'lucide-react';

interface AnalysisContextDisplayProps {
  context: AnalysisContext;
}

export function AnalysisContextDisplay({ context }: AnalysisContextDisplayProps) {
  const getInterfaceIcon = (type: string) => {
    const icons = {
      dashboard: Monitor,
      mobile: Smartphone,
      landing: Globe,
      ecommerce: ShoppingCart,
      form: FileText,
      app: Layout
    };
    const Icon = icons[type] || Layout;
    return <Icon className="h-4 w-4" />;
  };

  const getRoleIcon = (role: string) => {
    const icons = {
      designer: Palette,
      developer: Code,
      business: Briefcase,
      product: TrendingUp,
      marketing: Megaphone
    };
    const Icon = icons[role] || Briefcase;
    return <Icon className="h-4 w-4" />;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center justify-between">
          <span>Analysis Context</span>
          <Badge variant="outline" className="text-xs">
            {Math.round(context.confidence * 100)}% Confidence
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Interface Type */}
        <div className="space-y-2">
          <div className="text-xs font-medium text-muted-foreground">Interface Type</div>
          <div className="flex items-center gap-2">
            {getInterfaceIcon(context.image.primaryType)}
            <Badge variant="default" className="capitalize">
              {context.image.primaryType}
            </Badge>
            {context.image.domain && (
              <Badge variant="secondary" className="capitalize">
                {context.image.domain}
              </Badge>
            )}
          </div>
        </div>

        {/* User Role */}
        <div className="space-y-2">
          <div className="text-xs font-medium text-muted-foreground">Your Perspective</div>
          <div className="flex items-center gap-2">
            {getRoleIcon(context.user.inferredRole || 'business')}
            <Badge variant="default" className="capitalize">
              {context.user.inferredRole || 'General'}
            </Badge>
            <Badge variant="outline" className="text-xs capitalize">
              {context.user.expertise} Level
            </Badge>
          </div>
        </div>

        {/* Focus Areas */}
        {context.focusAreas && context.focusAreas.length > 0 && (
          <div className="space-y-2">
            <div className="text-xs font-medium text-muted-foreground">Focus Areas</div>
            <div className="flex flex-wrap gap-1">
              {context.focusAreas.map((area) => (
                <Badge key={area} variant="secondary" className="text-xs">
                  {area}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Industry Standards */}
        {context.industryStandards && context.industryStandards.length > 0 && (
          <div className="space-y-2">
            <div className="text-xs font-medium text-muted-foreground">Compliance Standards</div>
            <div className="flex flex-wrap gap-1">
              {context.industryStandards.map((standard) => (
                <Badge key={standard} variant="outline" className="text-xs">
                  {standard}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}