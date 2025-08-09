import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Logger, type LogCategory } from '@/utils/logging';

export const LoggingControls: React.FC = () => {
  const [categories, setCategories] = React.useState<Set<LogCategory>>(new Set(['general'] as LogCategory[]));
  const [dispatchMode, setDispatchMode] = React.useState<'inngest' | 'direct' | 'both'>(() => {
    const v = (typeof localStorage !== 'undefined' && localStorage.getItem('DISPATCH_MODE')) || 'inngest';
    return (['inngest','direct','both'].includes(v) ? (v as 'inngest'|'direct'|'both') : 'inngest');
  });


  const toggleCategory = (category: LogCategory) => {
    const newCategories = new Set(categories);
    if (newCategories.has(category)) {
      newCategories.delete(category);
      Logger.disableCategory(category);
    } else {
      newCategories.add(category);
      Logger.enableCategory(category);
    }
    setCategories(newCategories);
  };

  const logCategories: LogCategory[] = ['performance', 'canvas', 'analysis', 'upload', 'migration', 'api', 'general'];

  const handleDispatchModeChange = (value: 'inngest' | 'direct' | 'both') => {
    setDispatchMode(value);
    try {
      localStorage.setItem('DISPATCH_MODE', value);
      // Optional: surface in console for visibility
      console.log('[Dev] Dispatch mode set to', value);
    } catch (e) {
      console.warn('Failed to persist DISPATCH_MODE', e);
    }
  };

  return (
    <Card className="fixed bottom-20 left-4 z-50 w-72 shadow-lg">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">Debug Controls</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Logging categories */}
        {logCategories.map((category) => (
          <div key={category} className="flex items-center justify-between">
            <Label htmlFor={category} className="text-xs capitalize">
              {category}
            </Label>
            <Switch
              id={category}
              checked={categories.has(category)}
              onCheckedChange={() => toggleCategory(category)}
            />
          </div>
        ))}

        {/* Dispatch mode selector */}
        <div className="pt-1">
          <Label htmlFor="dispatch-mode" className="text-xs">Dispatch Mode</Label>
          <Select value={dispatchMode} onValueChange={(v) => handleDispatchModeChange(v as 'inngest'|'direct'|'both')}>
            <SelectTrigger id="dispatch-mode" className="h-8 mt-1">
              <SelectValue placeholder="Select mode" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="inngest">Inngest (default, recommended)</SelectItem>
              <SelectItem value="direct">Direct (legacy, compare)</SelectItem>
              <SelectItem value="both">Both (diagnostics only)</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleDispatchModeChange('inngest')}
            className="w-full mt-2"
          >
            Reset Dispatch Mode
          </Button>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            const defaultCategories = new Set(['general'] as LogCategory[]);
            setCategories(defaultCategories);
            Logger.configure({ categories: defaultCategories });
          }}
          className="w-full"
        >
          Reset Logging
        </Button>
      </CardContent>
    </Card>
  );
};
