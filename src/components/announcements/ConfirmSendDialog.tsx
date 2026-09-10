import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';

interface ConfirmSendDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  scheduled: boolean;
  groupCount: number;
  studentCount: number;
  sending: boolean;
  onConfirm: () => void;
}

const CONFIRM_WORD = 'SEND';

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;

/**
 * The last gate before a broadcast. It names the exact recipient count — the
 * same number the server freezes when it accepts the announcement — and makes
 * the sender type a word rather than click, because a mis-click here reaches
 * every student group at once.
 */
export function ConfirmSendDialog({
  open,
  onOpenChange,
  scheduled,
  groupCount,
  studentCount,
  sending,
  onConfirm,
}: ConfirmSendDialogProps) {
  const [typed, setTyped] = useState('');

  // Every opening starts empty, so a previous confirmation can't carry over.
  useEffect(() => {
    if (open) setTyped('');
  }, [open]);

  const total = groupCount + studentCount;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{scheduled ? 'Schedule this announcement?' : 'Send this announcement?'}</DialogTitle>
          <DialogDescription>
            This will reach {plural(total, 'recipient')}
            {groupCount > 0 && ` — ${plural(groupCount, 'group')}`}
            {studentCount > 0 && ` — ${plural(studentCount, 'student')}`}. Type {CONFIRM_WORD} to
            confirm.
          </DialogDescription>
        </DialogHeader>
        <Input
          value={typed}
          onChange={(event) => setTyped(event.target.value)}
          placeholder={CONFIRM_WORD}
          autoFocus
        />
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={sending}>
            Cancel
          </Button>
          <Button onClick={onConfirm} disabled={sending || typed.trim() !== CONFIRM_WORD}>
            {sending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {scheduled ? 'Schedule' : 'Send'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
