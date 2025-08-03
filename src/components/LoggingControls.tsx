import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Logger, type LogCategory } from '@/utils/logging';

export const LoggingControls: React.FC = () => {
  const [categories, setCategories] = React.useState<Set<LogCategory>>(new Set(['general'] as LogCategory[]));

  // Only show in development
  if (!import.meta.env.DEV) {
    return null;
  }

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

  return (
    <Card className="fixed bottom-20 left-4 z-50 w-72 shadow-lg">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">Debug Logging</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
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
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            const defaultCategories = new Set(['general'] as LogCategory[]);
            setCategories(defaultCategories);
            Logger.configure({ categories: defaultCategories });
          }}
          className="w-full mt-2"
        >
          Reset to Defaults
        </Button>
      </CardContent>
    </Card>
  );
};