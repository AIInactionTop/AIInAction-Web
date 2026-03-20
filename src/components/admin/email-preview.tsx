"use client";

import { useState, useTransition } from "react";
import { useLocale } from "next-intl";
import Link from "next/link";
import { ArrowLeft, Send, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { sendTestEmail } from "@/actions/admin/email-send";

type Props = {
  template: {
    id: string;
    name: string;
    subject: string;
    htmlContent: string | null;
  };
};

const sampleVars: Record<string, string> = {
  userName: "John Doe",
  userEmail: "john@example.com",
  siteUrl: "https://aiinaction.top",
};

function replaceVariables(text: string): string {
  return text.replace(/\{\{(\w+)\}\}/g, (_, key) => sampleVars[key] || `{{${key}}}`);
}

export function EmailPreview({ template }: Props) {
  const locale = useLocale();
  const [isSending, startSending] = useTransition();
  const [testSent, setTestSent] = useState(false);

  const previewSubject = replaceVariables(template.subject);
  const previewHtml = template.htmlContent
    ? replaceVariables(template.htmlContent)
    : null;

  const handleSendTest = () => {
    startSending(async () => {
      try {
        await sendTestEmail(template.id);
        setTestSent(true);
        setTimeout(() => setTestSent(false), 3000);
      } catch (err) {
        alert(err instanceof Error ? err.message : "Failed to send test email");
      }
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild>
            <Link href={`/${locale}/admin/emails/${template.id}`}>
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <h1 className="text-2xl font-bold">Preview: {template.name}</h1>
        </div>
        <Button onClick={handleSendTest} disabled={isSending || !previewHtml}>
          {testSent ? (
            <>
              <CheckCircle className="mr-2 h-4 w-4" />
              Test Sent!
            </>
          ) : (
            <>
              <Send className="mr-2 h-4 w-4" />
              {isSending ? "Sending..." : "Send Test Email"}
            </>
          )}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Subject
          </CardTitle>
          <p className="text-lg font-semibold">{previewSubject}</p>
        </CardHeader>
        <CardContent>
          {previewHtml ? (
            <iframe
              srcDoc={`
                <!DOCTYPE html>
                <html>
                <head>
                  <style>
                    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 20px; }
                    img { max-width: 100%; }
                  </style>
                </head>
                <body>${previewHtml}</body>
                </html>
              `}
              className="w-full rounded border bg-white"
              style={{ minHeight: 400 }}
              title="Email Preview"
            />
          ) : (
            <p className="text-muted-foreground">
              No content yet. Go back to the editor and add content first.
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Sample Variables Used
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2 sm:grid-cols-3">
            {Object.entries(sampleVars).map(([key, value]) => (
              <div key={key} className="rounded bg-muted px-3 py-2 text-sm">
                <span className="font-mono text-xs text-muted-foreground">{`{{${key}}}`}</span>
                <span className="ml-2">{value}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
