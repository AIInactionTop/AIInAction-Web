"use client";

import { useState, useTransition, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useLocale } from "next-intl";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RecipientFilterSelect } from "@/components/admin/recipient-filter-select";
import { SendConfirmDialog } from "@/components/admin/send-confirm-dialog";
import { sendBulkEmail } from "@/actions/admin/email-send";
import type { RecipientFilter } from "@/lib/admin-emails";

type Props = {
  template: {
    id: string;
    name: string;
    subject: string;
    htmlContent: string | null;
  };
};

const filterLabels: Record<RecipientFilter, string> = {
  all: "All Users",
  active_30d: "Active (30 days)",
  completed_challenge: "Completed Challenge",
  has_project: "Has Project",
};

export function SendEmailClient({ template }: Props) {
  const locale = useLocale();
  const router = useRouter();
  const [filter, setFilter] = useState<RecipientFilter | "">("");
  const [recipientCount, setRecipientCount] = useState<number | null>(null);
  const [isCountLoading, setIsCountLoading] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isSending, startSending] = useTransition();

  const handleFilterChange = useCallback(async (value: RecipientFilter) => {
    setFilter(value);
    setRecipientCount(null);
    setIsCountLoading(true);
    try {
      const res = await fetch(`/api/admin/recipient-count?filter=${value}`);
      const data = await res.json();
      setRecipientCount(data.count);
    } finally {
      setIsCountLoading(false);
    }
  }, []);

  const handleConfirmSend = () => {
    if (!filter) return;
    startSending(async () => {
      await sendBulkEmail(template.id, filter);
      setShowConfirm(false);
      router.push(`/${locale}/admin/emails/logs`);
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link href={`/${locale}/admin/emails/${template.id}`}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <h1 className="text-2xl font-bold">Send: {template.name}</h1>
      </div>

      {!template.htmlContent && (
        <Card className="border-destructive">
          <CardContent className="p-4 text-sm text-destructive">
            This template has no content. Go back to the editor and add content before sending.
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Email Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded bg-muted p-3 text-sm">
            <p><span className="font-medium">Subject:</span> {template.subject}</p>
          </div>

          <RecipientFilterSelect
            value={filter}
            onChange={handleFilterChange}
            recipientCount={recipientCount}
            loading={isCountLoading}
          />

          <Button
            onClick={() => setShowConfirm(true)}
            disabled={!filter || recipientCount === null || recipientCount === 0 || !template.htmlContent}
          >
            Send Email
          </Button>
        </CardContent>
      </Card>

      {filter && recipientCount !== null && (
        <SendConfirmDialog
          open={showConfirm}
          onOpenChange={setShowConfirm}
          templateName={template.name}
          recipientCount={recipientCount}
          filterLabel={filterLabels[filter]}
          onConfirm={handleConfirmSend}
          isSending={isSending}
        />
      )}
    </div>
  );
}
