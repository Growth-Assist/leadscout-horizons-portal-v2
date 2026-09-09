import React from 'react';
import { AlertCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { MAX_BULK_CLOSE_REASON_LENGTH } from '@/utils/bulkBriefClose.js';

const BulkCloseBriefsDialog = ({
  open,
  onOpenChange,
  selectedBriefs,
  closeReason,
  onCloseReasonChange,
  onConfirm,
  submitting,
  error
}) => {
  const count = selectedBriefs.length;
  const reasonLength = closeReason.length;
  const canSubmit = count > 0
    && closeReason.trim().length > 0
    && reasonLength <= MAX_BULK_CLOSE_REASON_LENGTH
    && !submitting;

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !submitting && onOpenChange(nextOpen)}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Close {count} selected {count === 1 ? 'brief' : 'briefs'}?</DialogTitle>
          <DialogDescription>
            Closed briefs will leave the active queue and remain available from the Closed view.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="max-h-32 overflow-y-auto rounded-md border border-border/60 bg-muted/20 p-3">
            <ul className="space-y-1 text-sm text-foreground">
              {selectedBriefs.slice(0, 8).map((brief) => (
                <li key={`${brief.company_id}:${brief.run_id}`} className="truncate">
                  {brief.company_name || brief.company_id}
                </li>
              ))}
            </ul>
            {count > 8 && (
              <p className="mt-2 text-xs text-muted-foreground">And {count - 8} more</p>
            )}
          </div>

          <div className="space-y-2">
            <label htmlFor="bulk-close-reason" className="text-sm font-medium text-foreground">
              Close reason <span className="text-destructive">*</span>
            </label>
            <Textarea
              id="bulk-close-reason"
              value={closeReason}
              onChange={(event) => onCloseReasonChange(event.target.value)}
              maxLength={MAX_BULK_CLOSE_REASON_LENGTH}
              placeholder="Explain why these briefs no longer require action..."
              rows={5}
              disabled={submitting}
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>This reason will be recorded against every selected brief.</span>
              <span className="tabular-nums">{reasonLength.toLocaleString()} / {MAX_BULK_CLOSE_REASON_LENGTH.toLocaleString()}</span>
            </div>
          </div>

          {error && (
            <div className="flex gap-2 rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive" role="alert">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={onConfirm} disabled={!canSubmit}>
            {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Close {count} {count === 1 ? 'brief' : 'briefs'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default BulkCloseBriefsDialog;
