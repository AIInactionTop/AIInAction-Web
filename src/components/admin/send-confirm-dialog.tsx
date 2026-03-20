"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  templateName: string;
  recipientCount: number;
  filterLabel: string;
  onConfirm: () => void;
  isSending: boolean;
};

export function SendConfirmDialog({
  open, onOpenChange, templateName, recipientCount, filterLabel, onConfirm, isSending,
}: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Confirm Email Send</DialogTitle>
          <DialogDescription>
            This action will send emails to real users and cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2 rounded bg-muted p-4 text-sm">
          <p><span className="font-medium">Template:</span> {templateName}</p>
          <p><span className="font-medium">Filter:</span> {filterLabel}</p>
          <p><span className="font-medium">Recipients:</span> {recipientCount}</p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSending}>
            Cancel
          </Button>
          <Button onClick={onConfirm} disabled={isSending}>
            {isSending ? "Sending..." : `Send to ${recipientCount} users`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
