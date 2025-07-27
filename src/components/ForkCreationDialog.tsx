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
import { GitBranch, Loader2 } from 'lucide-react';

interface ForkCreationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateFork: (sessionId: string, forkName: string, forkDescription: string) => Promise<void>;
  sessionId: string;
  originalPrompt?: string;
  groupName?: string;
}

export const ForkCreationDialog: React.FC<ForkCreationDialogProps> = ({
  isOpen,
  onClose,
  onCreateFork,
  sessionId,
  originalPrompt,
  groupName
}) => {
  const [forkName, setForkName] = useState('');
  const [forkDescription, setForkDescription] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const handleSubmit = async () => {
    if (!forkName.trim()) return;

    setIsCreating(true);
    try {
      await onCreateFork(sessionId, forkName.trim(), forkDescription.trim());
      handleClose();
    } catch (error) {
      console.error('Failed to create fork:', error);
    } finally {
      setIsCreating(false);
    }
  };

  const handleClose = () => {
    setForkName('');
    setForkDescription('');
    setIsCreating(false);
    onClose();
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
      event.preventDefault();
      handleSubmit();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md" onKeyDown={handleKeyDown}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <GitBranch className="w-5 h-5" />
            Create Analysis Fork
          </DialogTitle>
          <DialogDescription>
            Create a new branch from this analysis session{groupName ? ` for "${groupName}"` : ''}.
            This will copy the analysis and allow you to explore different directions.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {originalPrompt && (
            <div className="space-y-2">
              <Label className="text-sm font-medium">Original Prompt</Label>
              <div className="text-sm text-muted-foreground bg-muted p-3 rounded-md max-h-24 overflow-y-auto">
                {originalPrompt}
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="fork-name">Fork Name *</Label>
            <Input
              id="fork-name"
              placeholder="e.g., Mobile Optimization, Alternative Layout"
              value={forkName}
              onChange={(e) => setForkName(e.target.value)}
              className="w-full"
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="fork-description">Description (Optional)</Label>
            <Textarea
              id="fork-description"
              placeholder="Describe what you want to explore in this fork..."
              value={forkDescription}
              onChange={(e) => setForkDescription(e.target.value)}
              className="w-full min-h-[80px] resize-none"
            />
          </div>
        </div>

        <DialogFooter className="flex gap-2 sm:gap-0">
          <Button variant="outline" onClick={handleClose} disabled={isCreating}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!forkName.trim() || isCreating}
            className="min-w-[100px]"
          >
            {isCreating ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <GitBranch className="w-4 h-4 mr-2" />
                Create Fork
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};