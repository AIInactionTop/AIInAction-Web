"use server";

import { requireAdmin } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import { Resend } from "resend";
import { revalidatePath } from "next/cache";
import { getRecipientsByFilter, type RecipientFilter } from "@/lib/admin-emails";

function replaceVariables(
  text: string,
  vars: Record<string, string>
): string {
  return text.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] || `{{${key}}}`);
}

function getResendClient() {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) throw new Error("Missing RESEND_API_KEY");
  return new Resend(apiKey);
}

export async function sendTestEmail(templateId: string) {
  const admin = await requireAdmin();

  const template = await prisma.emailTemplate.findUnique({
    where: { id: templateId },
  });
  if (!template) throw new Error("Template not found");
  if (!template.htmlContent) throw new Error("Template has no HTML content. Save the template first.");

  const siteUrl = process.env.NEXTAUTH_URL || "https://aiinaction.top";
  const vars = {
    userName: admin.name || "Admin",
    userEmail: admin.email || "",
    siteUrl,
  };

  const subject = replaceVariables(template.subject, vars);
  const html = replaceVariables(template.htmlContent, vars);

  const resend = getResendClient();
  await resend.emails.send({
    from: "AI In Action <noreply@aiinaction.top>",
    to: admin.email!,
    subject: `[TEST] ${subject}`,
    html,
  });
}

export async function sendBulkEmail(templateId: string, filter: RecipientFilter) {
  const admin = await requireAdmin();

  const template = await prisma.emailTemplate.findUnique({
    where: { id: templateId },
  });
  if (!template) throw new Error("Template not found");
  if (!template.htmlContent) throw new Error("Template has no HTML content");

  const recipients = await getRecipientsByFilter(filter);
  if (recipients.length === 0) throw new Error("No recipients match the filter");

  const siteUrl = process.env.NEXTAUTH_URL || "https://aiinaction.top";

  const sendLog = await prisma.emailSendLog.create({
    data: {
      templateId,
      recipientFilter: filter,
      totalCount: recipients.length,
      status: "SENDING",
      sentById: admin.id!,
    },
  });

  const resend = getResendClient();
  let successCount = 0;
  let failCount = 0;

  const batchSize = 100;
  for (let i = 0; i < recipients.length; i += batchSize) {
    const batch = recipients.slice(i, i + batchSize);
    const emails = batch
      .filter((r) => r.email)
      .map((recipient) => {
        const vars = {
          userName: recipient.name || "there",
          userEmail: recipient.email!,
          siteUrl,
        };
        return {
          from: "AI In Action <noreply@aiinaction.top>",
          to: recipient.email!,
          subject: replaceVariables(template.subject, vars),
          html: replaceVariables(template.htmlContent!, vars),
        };
      });

    try {
      const result = await resend.batch.send(emails);
      if (result.error) {
        failCount += emails.length;
      } else {
        successCount += emails.length;
      }
    } catch {
      failCount += emails.length;
    }

    await prisma.emailSendLog.update({
      where: { id: sendLog.id },
      data: { successCount, failCount },
    });
  }

  await prisma.emailSendLog.update({
    where: { id: sendLog.id },
    data: {
      status: failCount === recipients.length ? "FAILED" : "COMPLETED",
      sentAt: new Date(),
      successCount,
      failCount,
    },
  });

  revalidatePath("/admin/emails/logs");
  return { successCount, failCount, total: recipients.length };
}
