import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

interface CanvasItemDeletionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  itemCount: number;
  itemType: 'image' | 'annotation' | 'group' | 'artboard' | 'item';
  isDeleting: boolean;
}

export const CanvasItemDeletionDialog = ({
  isOpen,
  onClose,
  onConfirm,
  itemCount,
  itemType,
  isDeleting
}: CanvasItemDeletionDialogProps) => {
  const isMultiple = itemCount > 1;
  const typeLabel = isMultiple ? `${itemType}s` : itemType;
  
  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {isMultiple ? `Delete ${itemCount} ${typeLabel}` : `Delete ${typeLabel}`}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {isMultiple 
              ? `Are you sure you want to delete these ${itemCount} ${typeLabel}? This action will permanently remove them from your canvas.`
              : `Are you sure you want to delete this ${typeLabel}? This action will permanently remove it from your canvas.`
            }
            <br />
            <br />
            <strong>This action cannot be undone.</strong>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
          <AlertDialogAction 
            onClick={onConfirm}
            disabled={isDeleting}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isDeleting ? 'Deleting...' : 'Delete'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};