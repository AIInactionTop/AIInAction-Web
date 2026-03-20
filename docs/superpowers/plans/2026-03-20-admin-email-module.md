# Admin Email Module Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an admin module with email template management (TipTap editor), recipient filtering, preview/test, bulk send via Resend batch API, and send history tracking.

**Architecture:** Admin pages under `src/app/[locale]/admin/` with `requireAdminPage()` auth guard. Email templates stored in PostgreSQL (TipTap JSON + cached HTML). Server actions for mutations, lib functions for reads. Reuses existing `RichEditor` TipTap component as a base for the email template editor.

**Tech Stack:** Next.js 16 (App Router), Prisma + PostgreSQL, TipTap (already installed), Resend (already configured), shadcn/ui, next-intl

**Spec:** `docs/superpowers/specs/2026-03-20-admin-email-module-design.md`

---

### Task 1: Database Schema — Enums and Models

**Files:**
- Modify: `prisma/schema.prisma` (add enums, models, User relation)

- [ ] **Step 1: Add enums to schema**

Add after the existing `MarketplaceItemStatus` enum (end of enums section):

```prisma
enum EmailTemplateStatus {
  DRAFT
  ACTIVE
  ARCHIVED
}

enum EmailSendStatus {
  PENDING
  SENDING
  COMPLETED
  FAILED
}
```

- [ ] **Step 2: Add EmailTemplate model**

Add after the last model in the schema:

```prisma
model EmailTemplate {
  id          String              @id @default(cuid())
  name        String
  subject     String
  content     Json
  htmlContent String?             @map("html_content") @db.Text
  variables   String[]            @default([])
  status      EmailTemplateStatus @default(DRAFT)
  createdAt   DateTime            @default(now()) @map("created_at")
  updatedAt   DateTime            @updatedAt @map("updated_at")
  sendLogs    EmailSendLog[]

  @@map("email_templates")
}

model EmailSendLog {
  id              String          @id @default(cuid())
  templateId      String          @map("template_id")
  template        EmailTemplate   @relation(fields: [templateId], references: [id], onDelete: Restrict)
  recipientFilter String          @map("recipient_filter")
  totalCount      Int             @map("total_count")
  successCount    Int             @default(0) @map("success_count")
  failCount       Int             @default(0) @map("fail_count")
  status          EmailSendStatus @default(PENDING)
  sentAt          DateTime?       @map("sent_at")
  sentById        String          @map("sent_by_id")
  sentBy          User            @relation("emailSendLogs", fields: [sentById], references: [id])
  createdAt       DateTime        @default(now()) @map("created_at")
  updatedAt       DateTime        @updatedAt @map("updated_at")

  @@index([templateId])
  @@index([status])
  @@map("email_send_logs")
}
```

- [ ] **Step 3: Add relation to User model**

In the User model, add this line alongside the other relation fields (after `marketplacePurchases`):

```prisma
  emailSendLogs    EmailSendLog[]  @relation("emailSendLogs")
```

- [ ] **Step 4: Generate Prisma client and push schema**

Run: `pnpm db:generate && pnpm db:migrate -- --name add_email_template_models`

Expected: Prisma client regenerated, migration created successfully.

- [ ] **Step 5: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/
git commit -m "feat(admin): add EmailTemplate and EmailSendLog models"
```

---

### Task 2: Admin Auth Guard

**Files:**
- Create: `src/lib/admin-auth.ts`

- [ ] **Step 1: Create requireAdminPage helper**

```typescript
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { isAdminEmail } from "@/lib/billing/admin";

export async function requireAdminPage() {
  const session = await auth();
  if (!session?.user?.id || !session.user.email || !isAdminEmail(session.user.email)) {
    redirect("/");
  }
  return session.user;
}

/**
 * For use in server actions — throws Error instead of redirecting.
 */
export async function requireAdmin() {
  const session = await auth();
  if (!session?.user?.id || !session.user.email || !isAdminEmail(session.user.email)) {
    throw new Error("Unauthorized");
  }
  return session.user;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/admin-auth.ts
git commit -m "feat(admin): add requireAdminPage helper for Server Components"
```

---

### Task 3: Admin Layout and Dashboard Page

**Files:**
- Create: `src/app/[locale]/admin/layout.tsx`
- Create: `src/app/[locale]/admin/page.tsx`
- Create: `src/components/admin/admin-sidebar.tsx`

- [ ] **Step 1: Create admin sidebar component**

```typescript
// src/components/admin/admin-sidebar.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLocale } from "next-intl";
import { Mail, LayoutDashboard, History } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/admin/emails", label: "Email Templates", icon: Mail },
  { href: "/admin/emails/logs", label: "Send History", icon: History },
];

export function AdminSidebar() {
  const pathname = usePathname();
  const locale = useLocale();

  return (
    <aside className="w-64 shrink-0 border-r bg-muted/30 p-4">
      <div className="mb-6">
        <h2 className="text-lg font-semibold">Admin</h2>
        <p className="text-sm text-muted-foreground">Management Console</p>
      </div>
      <nav className="space-y-1">
        {navItems.map((item) => {
          const fullHref = `/${locale}${item.href}`;
          const isActive = item.exact
            ? pathname === fullHref
            : pathname.startsWith(fullHref);
          return (
            <Link
              key={item.href}
              href={fullHref}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
```

- [ ] **Step 2: Create admin layout**

```typescript
// src/app/[locale]/admin/layout.tsx
import { requireAdminPage } from "@/lib/admin-auth";
import { AdminSidebar } from "@/components/admin/admin-sidebar";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireAdminPage();

  return (
    <div className="flex min-h-[calc(100svh-4rem)]">
      <AdminSidebar />
      <main className="flex-1 p-6">{children}</main>
    </div>
  );
}
```

- [ ] **Step 3: Create admin dashboard page**

```typescript
// src/app/[locale]/admin/page.tsx
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function AdminDashboardPage() {
  const [userCount, templateCount, sendLogCount] = await Promise.all([
    prisma.user.count(),
    prisma.emailTemplate.count(),
    prisma.emailSendLog.count(),
  ]);

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">Dashboard</h1>
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Users
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{userCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Email Templates
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{templateCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Emails Sent
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{sendLogCount}</div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Verify the admin pages render**

Run: `pnpm dev`

Navigate to `http://localhost:3000/en/admin` (must be logged in with an admin email). Verify:
- Non-admin users are redirected to homepage
- Admin sees dashboard with sidebar and stats cards

- [ ] **Step 5: Commit**

```bash
git add src/components/admin/admin-sidebar.tsx src/app/\[locale\]/admin/
git commit -m "feat(admin): add admin layout with sidebar and dashboard page"
```

---

### Task 4: Email Template Query Functions

**Files:**
- Create: `src/lib/admin-emails.ts`

- [ ] **Step 1: Create read functions**

```typescript
// src/lib/admin-emails.ts
import { prisma } from "@/lib/prisma";
import type { EmailTemplateStatus } from "@prisma/client";

export async function getEmailTemplates(status?: EmailTemplateStatus) {
  const where = status ? { status } : { status: { not: "ARCHIVED" as EmailTemplateStatus } };
  return prisma.emailTemplate.findMany({
    where,
    orderBy: { updatedAt: "desc" },
    include: {
      _count: { select: { sendLogs: true } },
    },
  });
}

export async function getEmailTemplate(id: string) {
  return prisma.emailTemplate.findUnique({
    where: { id },
    include: {
      _count: { select: { sendLogs: true } },
    },
  });
}

export type RecipientFilter = "all" | "active_30d" | "completed_challenge" | "has_project";

export async function getRecipientCount(filter: RecipientFilter): Promise<number> {
  switch (filter) {
    case "all":
      return prisma.user.count({ where: { email: { not: null } } });
    case "active_30d": {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      return prisma.user.count({
        where: {
          email: { not: null },
          stats: { lastActiveDate: { gte: thirtyDaysAgo } },
        },
      });
    }
    case "completed_challenge":
      return prisma.user.count({
        where: {
          email: { not: null },
          completions: { some: {} },
        },
      });
    case "has_project":
      return prisma.user.count({
        where: {
          email: { not: null },
          projects: { some: {} },
        },
      });
    default:
      return 0;
  }
}

export async function getRecipientsByFilter(filter: RecipientFilter) {
  const baseWhere = { email: { not: null } } as const;

  switch (filter) {
    case "all":
      return prisma.user.findMany({
        where: baseWhere,
        select: { id: true, name: true, email: true },
      });
    case "active_30d": {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      return prisma.user.findMany({
        where: { ...baseWhere, stats: { lastActiveDate: { gte: thirtyDaysAgo } } },
        select: { id: true, name: true, email: true },
      });
    }
    case "completed_challenge":
      return prisma.user.findMany({
        where: { ...baseWhere, completions: { some: {} } },
        select: { id: true, name: true, email: true },
      });
    case "has_project":
      return prisma.user.findMany({
        where: { ...baseWhere, projects: { some: {} } },
        select: { id: true, name: true, email: true },
      });
    default:
      return [];
  }
}

export async function getEmailSendLogs(page = 1, pageSize = 20) {
  const [logs, total] = await Promise.all([
    prisma.emailSendLog.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        template: { select: { name: true, subject: true } },
        sentBy: { select: { name: true, email: true, image: true } },
      },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.emailSendLog.count(),
  ]);
  return { logs, total, page, pageSize };
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/admin-emails.ts
git commit -m "feat(admin): add email template and recipient query functions"
```

---

### Task 5: Email Template Server Actions

**Files:**
- Create: `src/actions/admin/email-templates.ts`

- [ ] **Step 1: Create template CRUD actions**

```typescript
// src/actions/admin/email-templates.ts
"use server";

import { requireAdmin } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function createEmailTemplate(formData: FormData) {
  await requireAdmin();

  const name = formData.get("name") as string;
  const subject = formData.get("subject") as string;

  if (!name || !subject) {
    throw new Error("Name and subject are required");
  }

  const template = await prisma.emailTemplate.create({
    data: {
      name,
      subject,
      content: { type: "doc", content: [{ type: "paragraph" }] },
      variables: ["userName", "userEmail", "siteUrl"],
    },
  });

  redirect(`/admin/emails/${template.id}`);
}

export async function updateEmailTemplate(
  id: string,
  data: {
    name?: string;
    subject?: string;
    content?: Record<string, unknown>;
    htmlContent?: string;
    variables?: string[];
    status?: "DRAFT" | "ACTIVE";
  }
) {
  await requireAdmin();

  await prisma.emailTemplate.update({
    where: { id },
    data: {
      ...(data.name !== undefined && { name: data.name }),
      ...(data.subject !== undefined && { subject: data.subject }),
      ...(data.content !== undefined && { content: data.content }),
      ...(data.htmlContent !== undefined && { htmlContent: data.htmlContent }),
      ...(data.variables !== undefined && { variables: data.variables }),
      ...(data.status !== undefined && { status: data.status }),
    },
  });

  revalidatePath(`/admin/emails/${id}`);
}

export async function deleteEmailTemplate(id: string) {
  await requireAdmin();

  const template = await prisma.emailTemplate.findUnique({
    where: { id },
    include: { _count: { select: { sendLogs: true } } },
  });

  if (!template) throw new Error("Template not found");

  if (template._count.sendLogs > 0) {
    // Archive instead of delete
    await prisma.emailTemplate.update({
      where: { id },
      data: { status: "ARCHIVED" },
    });
  } else {
    await prisma.emailTemplate.delete({ where: { id } });
  }

  revalidatePath("/admin/emails");
  redirect("/admin/emails");
}
```

- [ ] **Step 2: Commit**

```bash
git add src/actions/admin/email-templates.ts
git commit -m "feat(admin): add email template CRUD server actions"
```

---

### Task 6: Email Send Server Actions

**Files:**
- Create: `src/actions/admin/email-send.ts`

- [ ] **Step 1: Create send actions**

```typescript
// src/actions/admin/email-send.ts
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

  // Create send log
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

  // Process in batches of 100 (Resend batch API limit)
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

    // Update counts periodically
    await prisma.emailSendLog.update({
      where: { id: sendLog.id },
      data: { successCount, failCount },
    });
  }

  // Final update
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
```

- [ ] **Step 2: Commit**

```bash
git add src/actions/admin/email-send.ts
git commit -m "feat(admin): add email send and test server actions with Resend batch API"
```

---

### Task 7: Email Template List Page

**Files:**
- Create: `src/app/[locale]/admin/emails/page.tsx`
- Create: `src/components/admin/email-template-list.tsx`

- [ ] **Step 1: Create template list client component**

```typescript
// src/components/admin/email-template-list.tsx
"use client";

import Link from "next/link";
import { useLocale } from "next-intl";
import { Plus, Edit, Eye, Send, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { deleteEmailTemplate } from "@/actions/admin/email-templates";
import type { EmailTemplateStatus } from "@prisma/client";

type Template = {
  id: string;
  name: string;
  subject: string;
  status: EmailTemplateStatus;
  updatedAt: string;
  _count: { sendLogs: number };
};

const statusConfig: Record<EmailTemplateStatus, { label: string; variant: "default" | "secondary" | "outline" }> = {
  DRAFT: { label: "Draft", variant: "secondary" },
  ACTIVE: { label: "Active", variant: "default" },
  ARCHIVED: { label: "Archived", variant: "outline" },
};

export function EmailTemplateList({ templates }: { templates: Template[] }) {
  const locale = useLocale();

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Email Templates</h1>
        <Button asChild>
          <Link href={`/${locale}/admin/emails/new`}>
            <Plus className="mr-2 h-4 w-4" />
            New Template
          </Link>
        </Button>
      </div>

      {templates.length === 0 ? (
        <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
          No email templates yet. Create your first one.
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Subject</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Sends</TableHead>
              <TableHead>Updated</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {templates.map((t) => {
              const config = statusConfig[t.status];
              return (
                <TableRow key={t.id}>
                  <TableCell className="font-medium">{t.name}</TableCell>
                  <TableCell className="max-w-[200px] truncate text-muted-foreground">
                    {t.subject}
                  </TableCell>
                  <TableCell>
                    <Badge variant={config.variant}>{config.label}</Badge>
                  </TableCell>
                  <TableCell>{t._count.sendLogs}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {new Date(t.updatedAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="icon" asChild>
                        <Link href={`/${locale}/admin/emails/${t.id}`}>
                          <Edit className="h-4 w-4" />
                        </Link>
                      </Button>
                      <Button variant="ghost" size="icon" asChild>
                        <Link href={`/${locale}/admin/emails/${t.id}/preview`}>
                          <Eye className="h-4 w-4" />
                        </Link>
                      </Button>
                      <Button variant="ghost" size="icon" asChild>
                        <Link href={`/${locale}/admin/emails/${t.id}/send`}>
                          <Send className="h-4 w-4" />
                        </Link>
                      </Button>
                      <form action={deleteEmailTemplate.bind(null, t.id)}>
                        <Button variant="ghost" size="icon" type="submit">
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </form>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Create template list page**

```typescript
// src/app/[locale]/admin/emails/page.tsx
import { getEmailTemplates } from "@/lib/admin-emails";
import { EmailTemplateList } from "@/components/admin/email-template-list";

export default async function EmailTemplatesPage() {
  const templates = await getEmailTemplates();

  return (
    <EmailTemplateList
      templates={JSON.parse(JSON.stringify(templates))}
    />
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/app/\[locale\]/admin/emails/page.tsx src/components/admin/email-template-list.tsx
git commit -m "feat(admin): add email template list page"
```

---

### Task 8: Create New Template Page

**Files:**
- Create: `src/app/[locale]/admin/emails/new/page.tsx`

- [ ] **Step 1: Create new template page**

```typescript
// src/app/[locale]/admin/emails/new/page.tsx
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createEmailTemplate } from "@/actions/admin/email-templates";

export default function NewEmailTemplatePage() {
  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-6 text-2xl font-bold">Create Email Template</h1>
      <Card>
        <CardHeader>
          <CardTitle>Template Details</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={createEmailTemplate} className="space-y-4">
            <div>
              <label htmlFor="name" className="mb-1.5 block text-sm font-medium">
                Template Name
              </label>
              <Input
                id="name"
                name="name"
                required
                placeholder="e.g. Weekly Newsletter"
              />
            </div>
            <div>
              <label htmlFor="subject" className="mb-1.5 block text-sm font-medium">
                Email Subject
              </label>
              <Input
                id="subject"
                name="subject"
                required
                placeholder="e.g. Hey {{userName}}, check out this week's challenges!"
              />
              <p className="mt-1 text-xs text-muted-foreground">
                Supports variables: {"{{userName}}"}, {"{{userEmail}}"}, {"{{siteUrl}}"}
              </p>
            </div>
            <Button type="submit">Create & Edit Content</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/\[locale\]/admin/emails/new/
git commit -m "feat(admin): add create email template page"
```

---

### Task 9: Email Template Editor Page

**Files:**
- Create: `src/components/admin/email-template-editor.tsx`
- Create: `src/app/[locale]/admin/emails/[id]/page.tsx`

- [ ] **Step 1: Create email template editor component**

This extends the existing `RichEditor` pattern but adds variable insertion, subject editing, auto-save, and JSON/HTML output.

```typescript
// src/components/admin/email-template-editor.tsx
"use client";

import { useCallback, useRef, useState, useTransition } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import LinkExtension from "@tiptap/extension-link";
import ImageExtension from "@tiptap/extension-image";
import Placeholder from "@tiptap/extension-placeholder";
import {
  Bold, Italic, Strikethrough, List, ListOrdered, Quote,
  Undo, Redo, Link as LinkIcon, Heading2, Heading3,
  Code, Minus, Image as ImageIcon, Save,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { updateEmailTemplate } from "@/actions/admin/email-templates";

type Props = {
  template: {
    id: string;
    name: string;
    subject: string;
    content: Record<string, unknown>;
    htmlContent: string | null;
    variables: string[];
    status: string;
  };
};

function ToolbarButton({
  onClick, active, disabled, children, title,
}: {
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  children: React.ReactNode;
  title: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`rounded p-1.5 transition-colors ${
        active
          ? "bg-primary/15 text-primary"
          : "text-muted-foreground hover:bg-muted hover:text-foreground"
      } disabled:opacity-30`}
    >
      {children}
    </button>
  );
}

const AVAILABLE_VARIABLES = [
  { key: "userName", label: "User Name" },
  { key: "userEmail", label: "User Email" },
  { key: "siteUrl", label: "Site URL" },
];

export function EmailTemplateEditor({ template }: Props) {
  const [name, setName] = useState(template.name);
  const [subject, setSubject] = useState(template.subject);
  const [isSaving, startSaving] = useTransition();
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const nameRef = useRef(name);
  const subjectRef = useRef(subject);
  nameRef.current = name;
  subjectRef.current = subject;

  const triggerSave = useCallback(
    (editorHtml?: string, editorJson?: Record<string, unknown>) => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(() => {
        startSaving(async () => {
          const data: Parameters<typeof updateEmailTemplate>[1] = {};
          data.name = nameRef.current;
          data.subject = subjectRef.current;
          if (editorJson) data.content = editorJson;
          if (editorHtml) data.htmlContent = editorHtml;
          await updateEmailTemplate(template.id, data);
          setLastSaved(new Date());
        });
      }, 2000);
    },
    [template.id]
  );

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({ heading: { levels: [2, 3] } }),
      LinkExtension.configure({
        openOnClick: false,
        HTMLAttributes: { class: "text-primary underline" },
      }),
      ImageExtension,
      Placeholder.configure({ placeholder: "Write your email content here..." }),
    ],
    content: template.content as Record<string, unknown>,
    onUpdate: ({ editor: e }) => {
      triggerSave(e.getHTML(), e.getJSON() as Record<string, unknown>);
    },
    editorProps: {
      attributes: {
        class: "prose prose-sm dark:prose-invert max-w-none min-h-[300px] px-4 py-3 focus:outline-none",
      },
    },
  });

  const setLink = useCallback(() => {
    if (!editor) return;
    const previousUrl = editor.getAttributes("link").href;
    const url = window.prompt("URL", previousUrl);
    if (url === null) return;
    if (url === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
  }, [editor]);

  const addImage = useCallback(() => {
    if (!editor) return;
    const url = window.prompt("Image URL");
    if (url) {
      editor.chain().focus().setImage({ src: url }).run();
    }
  }, [editor]);

  const insertVariable = useCallback(
    (varKey: string) => {
      if (!editor) return;
      editor.chain().focus().insertContent(`{{${varKey}}}`).run();
    },
    [editor]
  );

  const handleManualSave = () => {
    if (!editor) return;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    startSaving(async () => {
      await updateEmailTemplate(template.id, {
        name,
        subject,
        content: editor.getJSON() as Record<string, unknown>,
        htmlContent: editor.getHTML(),
      });
      setLastSaved(new Date());
    });
  };

  if (!editor) return null;

  const iconSize = "h-4 w-4";

  return (
    <div className="space-y-4">
      {/* Header with save */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Edit Template</h1>
        <div className="flex items-center gap-3">
          {lastSaved && (
            <span className="text-xs text-muted-foreground">
              Saved {lastSaved.toLocaleTimeString()}
            </span>
          )}
          {isSaving && (
            <span className="text-xs text-muted-foreground">Saving...</span>
          )}
          <Button onClick={handleManualSave} disabled={isSaving} size="sm">
            <Save className="mr-2 h-4 w-4" />
            Save
          </Button>
        </div>
      </div>

      {/* Name & Subject */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1.5 block text-sm font-medium">Template Name</label>
          <Input
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              triggerSave();
            }}
          />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium">Email Subject</label>
          <Input
            value={subject}
            onChange={(e) => {
              setSubject(e.target.value);
              triggerSave();
            }}
          />
        </div>
      </div>

      {/* Editor + Variables Panel */}
      <div className="flex gap-4">
        {/* Editor */}
        <div className="flex-1 rounded-md border border-input bg-background ring-offset-background focus-within:ring-2 focus-within:ring-ring">
          {/* Toolbar */}
          <div className="flex flex-wrap items-center gap-0.5 border-b border-input px-2 py-1.5">
            <ToolbarButton onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} active={editor.isActive("heading", { level: 2 })} title="Heading 2">
              <Heading2 className={iconSize} />
            </ToolbarButton>
            <ToolbarButton onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} active={editor.isActive("heading", { level: 3 })} title="Heading 3">
              <Heading3 className={iconSize} />
            </ToolbarButton>
            <ToolbarButton onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive("bold")} title="Bold">
              <Bold className={iconSize} />
            </ToolbarButton>
            <ToolbarButton onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive("italic")} title="Italic">
              <Italic className={iconSize} />
            </ToolbarButton>
            <ToolbarButton onClick={() => editor.chain().focus().toggleStrike().run()} active={editor.isActive("strike")} title="Strikethrough">
              <Strikethrough className={iconSize} />
            </ToolbarButton>
            <ToolbarButton onClick={() => editor.chain().focus().toggleCode().run()} active={editor.isActive("code")} title="Inline Code">
              <Code className={iconSize} />
            </ToolbarButton>

            <div className="mx-1 h-5 w-px bg-border" />

            <ToolbarButton onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive("bulletList")} title="Bullet List">
              <List className={iconSize} />
            </ToolbarButton>
            <ToolbarButton onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive("orderedList")} title="Ordered List">
              <ListOrdered className={iconSize} />
            </ToolbarButton>
            <ToolbarButton onClick={() => editor.chain().focus().toggleBlockquote().run()} active={editor.isActive("blockquote")} title="Blockquote">
              <Quote className={iconSize} />
            </ToolbarButton>
            <ToolbarButton onClick={() => editor.chain().focus().setHorizontalRule().run()} title="Horizontal Rule">
              <Minus className={iconSize} />
            </ToolbarButton>

            <div className="mx-1 h-5 w-px bg-border" />

            <ToolbarButton onClick={setLink} active={editor.isActive("link")} title="Link">
              <LinkIcon className={iconSize} />
            </ToolbarButton>
            <ToolbarButton onClick={addImage} title="Image">
              <ImageIcon className={iconSize} />
            </ToolbarButton>

            <div className="mx-1 h-5 w-px bg-border" />

            <ToolbarButton onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo()} title="Undo">
              <Undo className={iconSize} />
            </ToolbarButton>
            <ToolbarButton onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo()} title="Redo">
              <Redo className={iconSize} />
            </ToolbarButton>
          </div>

          <EditorContent editor={editor} />
        </div>

        {/* Variables Panel */}
        <Card className="w-48 shrink-0">
          <CardContent className="p-3">
            <p className="mb-2 text-sm font-medium">Variables</p>
            <p className="mb-3 text-xs text-muted-foreground">
              Click to insert at cursor position
            </p>
            <div className="space-y-1.5">
              {AVAILABLE_VARIABLES.map((v) => (
                <button
                  key={v.key}
                  type="button"
                  onClick={() => insertVariable(v.key)}
                  className="block w-full rounded px-2 py-1 text-left text-xs transition-colors hover:bg-muted"
                >
                  <Badge variant="outline" className="font-mono text-xs">
                    {`{{${v.key}}}`}
                  </Badge>
                  <span className="ml-1 text-muted-foreground">{v.label}</span>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create edit template page**

```typescript
// src/app/[locale]/admin/emails/[id]/page.tsx
import { notFound } from "next/navigation";
import { getEmailTemplate } from "@/lib/admin-emails";
import { EmailTemplateEditor } from "@/components/admin/email-template-editor";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function EditEmailTemplatePage({ params }: Props) {
  const { id } = await params;
  const template = await getEmailTemplate(id);

  if (!template) notFound();

  return (
    <EmailTemplateEditor
      template={JSON.parse(JSON.stringify(template))}
    />
  );
}
```

- [ ] **Step 3: Verify the editor renders and auto-saves**

Run: `pnpm dev`

Navigate to create a template, then edit it. Verify:
- TipTap editor renders with toolbar
- Variable panel shows clickable variables
- Auto-save triggers after 2 seconds of inactivity
- Manual save button works

- [ ] **Step 4: Commit**

```bash
git add src/components/admin/email-template-editor.tsx src/app/\[locale\]/admin/emails/\[id\]/page.tsx
git commit -m "feat(admin): add email template editor with TipTap and variable insertion"
```

---

### Task 10: Email Preview Page

**Files:**
- Create: `src/components/admin/email-preview.tsx`
- Create: `src/app/[locale]/admin/emails/[id]/preview/page.tsx`

- [ ] **Step 1: Create email preview component**

```typescript
// src/components/admin/email-preview.tsx
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
```

- [ ] **Step 2: Create preview page**

```typescript
// src/app/[locale]/admin/emails/[id]/preview/page.tsx
import { notFound } from "next/navigation";
import { getEmailTemplate } from "@/lib/admin-emails";
import { EmailPreview } from "@/components/admin/email-preview";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function PreviewEmailTemplatePage({ params }: Props) {
  const { id } = await params;
  const template = await getEmailTemplate(id);

  if (!template) notFound();

  return (
    <EmailPreview
      template={JSON.parse(JSON.stringify(template))}
    />
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/admin/email-preview.tsx src/app/\[locale\]/admin/emails/\[id\]/preview/
git commit -m "feat(admin): add email preview page with test send"
```

---

### Task 11: Email Send Page

**Files:**
- Create: `src/components/admin/recipient-filter-select.tsx`
- Create: `src/components/admin/send-confirm-dialog.tsx`
- Create: `src/app/[locale]/admin/emails/[id]/send/page.tsx`

- [ ] **Step 1: Create recipient filter select component**

```typescript
// src/components/admin/recipient-filter-select.tsx
"use client";

import { useEffect, useState, useTransition } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { RecipientFilter } from "@/lib/admin-emails";

const filterOptions: { value: RecipientFilter; label: string; description: string }[] = [
  { value: "all", label: "All Users", description: "All registered users with email" },
  { value: "active_30d", label: "Active (30 days)", description: "Users active in the last 30 days" },
  { value: "completed_challenge", label: "Completed Challenge", description: "Users who completed at least one challenge" },
  { value: "has_project", label: "Has Project", description: "Users who submitted a project" },
];

type Props = {
  value: RecipientFilter | "";
  onChange: (value: RecipientFilter) => void;
  recipientCount: number | null;
  loading: boolean;
};

export function RecipientFilterSelect({ value, onChange, recipientCount, loading }: Props) {
  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium">Select Recipients</label>
      <Select value={value} onValueChange={(v) => onChange(v as RecipientFilter)}>
        <SelectTrigger>
          <SelectValue placeholder="Choose a recipient filter..." />
        </SelectTrigger>
        <SelectContent>
          {filterOptions.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              <span className="font-medium">{opt.label}</span>
              <span className="ml-2 text-xs text-muted-foreground">{opt.description}</span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {value && (
        <p className="text-sm text-muted-foreground">
          {loading ? "Counting recipients..." : `${recipientCount} recipients match this filter`}
        </p>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Create send confirm dialog**

```typescript
// src/components/admin/send-confirm-dialog.tsx
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
```

- [ ] **Step 3: Create send page**

```typescript
// src/app/[locale]/admin/emails/[id]/send/page.tsx
import { notFound } from "next/navigation";
import { getEmailTemplate } from "@/lib/admin-emails";
import { SendEmailClient } from "./send-client";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function SendEmailPage({ params }: Props) {
  const { id } = await params;
  const template = await getEmailTemplate(id);

  if (!template) notFound();

  return (
    <SendEmailClient
      template={JSON.parse(JSON.stringify(template))}
    />
  );
}
```

- [ ] **Step 4: Create send page client component**

```typescript
// src/app/[locale]/admin/emails/[id]/send/send-client.tsx
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
```

- [ ] **Step 5: Commit**

```bash
git add src/components/admin/recipient-filter-select.tsx src/components/admin/send-confirm-dialog.tsx src/app/\[locale\]/admin/emails/\[id\]/send/
git commit -m "feat(admin): add email send page with recipient filter and confirmation"
```

---

### Task 12: Recipient Count API Route

**Files:**
- Create: `src/app/api/admin/recipient-count/route.ts`

The send page client component needs an API endpoint to fetch recipient counts (since it's a client component and can't call server-side lib functions directly).

- [ ] **Step 1: Create recipient count API route**

```typescript
// src/app/api/admin/recipient-count/route.ts
import { requireAdminUser } from "@/lib/billing/admin";
import { jsonSuccess, jsonError } from "@/lib/api-auth";
import { getRecipientCount, type RecipientFilter } from "@/lib/admin-emails";

const VALID_FILTERS: RecipientFilter[] = ["all", "active_30d", "completed_challenge", "has_project"];

export async function GET(request: Request) {
  const { error } = await requireAdminUser();
  if (error) return error;

  const { searchParams } = new URL(request.url);
  const filter = searchParams.get("filter") as RecipientFilter;

  if (!filter || !VALID_FILTERS.includes(filter)) {
    return jsonError("VALIDATION_ERROR", "Invalid filter", 400);
  }

  const count = await getRecipientCount(filter);
  return jsonSuccess({ count });
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/api/admin/recipient-count/
git commit -m "feat(admin): add recipient count API endpoint"
```

---

### Task 13: Send History Logs Page

**Files:**
- Create: `src/app/[locale]/admin/emails/logs/page.tsx`

- [ ] **Step 1: Create send logs page**

```typescript
// src/app/[locale]/admin/emails/logs/page.tsx
import { getEmailSendLogs } from "@/lib/admin-emails";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { EmailSendStatus } from "@prisma/client";

const statusConfig: Record<EmailSendStatus, { label: string; variant: "default" | "secondary" | "outline" | "destructive" }> = {
  PENDING: { label: "Pending", variant: "outline" },
  SENDING: { label: "Sending", variant: "secondary" },
  COMPLETED: { label: "Completed", variant: "default" },
  FAILED: { label: "Failed", variant: "destructive" },
};

const filterLabels: Record<string, string> = {
  all: "All Users",
  active_30d: "Active (30 days)",
  completed_challenge: "Completed Challenge",
  has_project: "Has Project",
};

export default async function EmailSendLogsPage() {
  const { logs } = await getEmailSendLogs();

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">Send History</h1>

      {logs.length === 0 ? (
        <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
          No emails have been sent yet.
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Template</TableHead>
              <TableHead>Filter</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Success</TableHead>
              <TableHead>Failed</TableHead>
              <TableHead>Total</TableHead>
              <TableHead>Sent By</TableHead>
              <TableHead>Date</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {logs.map((log) => {
              const config = statusConfig[log.status];
              return (
                <TableRow key={log.id}>
                  <TableCell className="font-medium">
                    {log.template.name}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {filterLabels[log.recipientFilter] || log.recipientFilter}
                  </TableCell>
                  <TableCell>
                    <Badge variant={config.variant}>{config.label}</Badge>
                  </TableCell>
                  <TableCell className="text-emerald-600">{log.successCount}</TableCell>
                  <TableCell className="text-destructive">{log.failCount}</TableCell>
                  <TableCell>{log.totalCount}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {log.sentBy.name || log.sentBy.email}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {log.sentAt
                      ? new Date(log.sentAt).toLocaleString()
                      : new Date(log.createdAt).toLocaleString()}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/\[locale\]/admin/emails/logs/
git commit -m "feat(admin): add email send history logs page"
```

---

### Task 14: Build Verification and Final Test

- [ ] **Step 1: Run lint**

Run: `pnpm lint`

Expected: No errors. Fix any lint issues.

- [ ] **Step 2: Run build**

Run: `pnpm build`

Expected: Build succeeds. Fix any type errors.

- [ ] **Step 3: Manual smoke test**

Run: `pnpm dev`

Test the full flow:
1. Navigate to `/en/admin` — should see dashboard with sidebar
2. Navigate to `/en/admin/emails` — should see empty template list
3. Click "New Template" — create a template with name and subject
4. Edit template — TipTap editor should work, variables insertable, auto-save working
5. Preview — should show rendered HTML with sample variables
6. Send Test Email — should receive test email at admin's inbox
7. Send page — select filter, see recipient count, confirm send
8. Logs page — should show send history

- [ ] **Step 4: Fix any issues found and commit**

```bash
git add -A
git commit -m "fix(admin): address issues found during smoke test"
```

- [ ] **Step 5: Final commit for feature**

```bash
git add -A
git commit -m "feat(admin): complete admin email module with templates, preview, send, and logs"
```
