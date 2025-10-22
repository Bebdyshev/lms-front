import { AlertTriangle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import { Button } from './ui/button';

interface UnsavedChangesDialogProps {
  open: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  title?: string;
  description?: string;
}

export function UnsavedChangesDialog({
  open,
  onConfirm,
  onCancel,
  title = 'Unsaved Changes',
  description = 'You have unsaved changes. Are you sure you want to leave this page? Your changes will be lost.'
}: UnsavedChangesDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onCancel()}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-yellow-100">
              <AlertTriangle className="h-6 w-6 text-yellow-600" />
            </div>
            <DialogTitle className="text-xl font-semibold">{title}</DialogTitle>
          </div>
          <DialogDescription className="pt-4 text-base text-gray-700">
            {description}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex gap-3 sm:gap-3 pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            className="flex-1"
          >
            Go Back & Save
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={onConfirm}
            className="flex-1"
          >
            Discard Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default UnsavedChangesDialog;
