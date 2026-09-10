import { Pin } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Checkbox } from '../ui/checkbox';
import { Input } from '../ui/input';
import { Label } from '../ui/label';

interface SendOptionsProps {
  pin: boolean;
  onPinChange: (next: boolean) => void;
  silent: boolean;
  onSilentChange: (next: boolean) => void;
  /** A `datetime-local` value, or '' to send now. */
  scheduledFor: string;
  onScheduledForChange: (next: string) => void;
}

/** Pin, silent delivery and scheduling. */
export function SendOptions({
  pin,
  onPinChange,
  silent,
  onSilentChange,
  scheduledFor,
  onScheduledForChange,
}: SendOptionsProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Options</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-2">
          <Checkbox id="pin" checked={pin} onCheckedChange={(c) => onPinChange(c === true)} />
          <Label htmlFor="pin" className="flex cursor-pointer items-center gap-1.5 text-sm font-normal">
            <Pin className="h-3.5 w-3.5" />
            Pin in each group
          </Label>
        </div>
        <div className="flex items-center gap-2">
          <Checkbox id="silent" checked={silent} onCheckedChange={(c) => onSilentChange(c === true)} />
          <Label htmlFor="silent" className="cursor-pointer text-sm font-normal">
            Send silently (no notification)
          </Label>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Schedule (optional)</Label>
          <Input
            type="datetime-local"
            value={scheduledFor}
            onChange={(event) => onScheduledForChange(event.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            Leave empty to send now. The recipient list is fixed when you send, so a group approved
            later will not receive this.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
