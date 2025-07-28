import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

interface NewSessionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreateNew: (name?: string, description?: string) => void;
  onAddToCurrent: () => void;
  hasPreviousData: boolean;
}

export const NewSessionDialog: React.FC<NewSessionDialogProps> = ({
  open,
  onOpenChange,
  onCreateNew,
  onAddToCurrent,
  hasPreviousData
}) => {
  const [projectName, setProjectName] = useState('');
  const [projectDescription, setProjectDescription] = useState('');

  // Handle auto-creation for new users (hooks must be called unconditionally)
  React.useEffect(() => {
    if (!hasPreviousData && open) {
      onCreateNew();
      onOpenChange(false);
    }
  }, [open, onCreateNew, onOpenChange, hasPreviousData]);

  const handleCreateNew = () => {
    onCreateNew(
      projectName.trim() || undefined,
      projectDescription.trim() || undefined
    );
    setProjectName('');
    setProjectDescription('');
    onOpenChange(false);
  };

  const handleAddToCurrent = () => {
    onAddToCurrent();
    onOpenChange(false);
  };

  // Don't render dialog for new users
  if (!hasPreviousData) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Start New Analysis</DialogTitle>
          <DialogDescription>
            You have previous analyses. Would you like to start a new project or add to your current one?
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="project-name">Project Name (Optional)</Label>
            <Input
              id="project-name"
              placeholder="e.g., Mobile App Analysis"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="project-description">Description (Optional)</Label>
            <Textarea
              id="project-description"
              placeholder="Brief description of this analysis project..."
              value={projectDescription}
              onChange={(e) => setProjectDescription(e.target.value)}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={handleAddToCurrent}>
            Add to Current Project
          </Button>
          <Button onClick={handleCreateNew}>
            Create New Project
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};