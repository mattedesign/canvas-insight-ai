import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

interface ProjectDeletionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  projectCount: number;
  isDeleting: boolean;
}

export const ProjectDeletionDialog = ({
  isOpen,
  onClose,
  onConfirm,
  projectCount,
  isDeleting
}: ProjectDeletionDialogProps) => {
  const isMultiple = projectCount > 1;
  
  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {isMultiple ? `Delete ${projectCount} Projects` : 'Delete Project'}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {isMultiple 
              ? `Are you sure you want to delete these ${projectCount} projects? This will permanently remove all associated images, analyses, and data.`
              : 'Are you sure you want to delete this project? This will permanently remove all associated images, analyses, and data.'
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