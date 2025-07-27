import React, { useState, useEffect } from 'react';
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
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ImageGroup, UploadedImage } from '@/types/ux-analysis';

interface GroupEditDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onUpdateGroup: (groupId: string, name: string, description: string, color: string) => void;
  group: ImageGroup | null;
  groupImages: UploadedImage[];
}

const GROUP_COLORS = [
  '#3b82f6', // blue
  '#ef4444', // red
  '#10b981', // emerald
  '#f59e0b', // amber
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#06b6d4', // cyan
  '#84cc16', // lime
];

export const GroupEditDialog: React.FC<GroupEditDialogProps> = ({
  isOpen,
  onClose,
  onUpdateGroup,
  group,
  groupImages,
}) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedColor, setSelectedColor] = useState(GROUP_COLORS[0]);

  // Update form values when group changes
  useEffect(() => {
    if (group) {
      setName(group.name);
      setDescription(group.description);
      setSelectedColor(group.color);
    }
  }, [group]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim() && group) {
      onUpdateGroup(group.id, name.trim(), description.trim(), selectedColor);
      onClose();
    }
  };

  const handleClose = () => {
    // Reset to original values on close
    if (group) {
      setName(group.name);
      setDescription(group.description);
      setSelectedColor(group.color);
    }
    onClose();
  };

  if (!group) return null;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Edit Group</DialogTitle>
            <DialogDescription>
              Update the settings for this group with {groupImages.length} images.
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">
                Name
              </Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter group name"
                className="col-span-3"
                required
              />
            </div>
            
            <div className="grid grid-cols-4 items-start gap-4">
              <Label htmlFor="description" className="text-right pt-2">
                Description
              </Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Optional description"
                className="col-span-3"
                rows={2}
              />
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">Color</Label>
              <div className="col-span-3 flex gap-2 flex-wrap">
                {GROUP_COLORS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    className={`w-6 h-6 rounded-full border-2 transition-all ${
                      selectedColor === color 
                        ? 'border-foreground scale-110' 
                        : 'border-transparent hover:scale-105'
                    }`}
                    style={{ backgroundColor: color }}
                    onClick={() => setSelectedColor(color)}
                  />
                ))}
              </div>
            </div>
            
            <div className="grid grid-cols-4 items-start gap-4">
              <Label className="text-right pt-2">Images</Label>
              <div className="col-span-3 flex flex-wrap gap-1">
                {groupImages.map((image) => (
                  <Badge key={image.id} variant="secondary" className="text-xs">
                    {image.name}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={!name.trim()}>
              Update Group
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};