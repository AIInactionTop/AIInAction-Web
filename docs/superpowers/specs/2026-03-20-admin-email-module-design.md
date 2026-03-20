# Admin Email Module Design

## Overview

Add an admin module to AIInAction with email push notification functionality. Admins can create email templates using a rich text editor (TipTap), preview emails, send test emails, and bulk-send to filtered user groups. All send operations are tracked with history logs.

Future plan: weekly newsletter emails to users.

## Requirements

1. **Admin-only access** — only users whose email is in `ADMIN_EMAILS` env var can access
2. **Email templates** — stored in database, edited via TipTap rich text editor with variable support (`{{userName}}`, etc.)
3. **Recipient filtering** — send to all users, or filter by activity (active in 30d, completed challenges, submitted projects)
4. **Preview & test** — preview rendered HTML with sample data, send test email to admin's own inbox
5. **Send history** — log every bulk send with recipient count, success/fail counts, status

## Data Models

Follow existing schema conventions: `@@map` for table names, `@map` for column names, Prisma enums for status fields.

### New Enums

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

### EmailTemplate

```prisma
model EmailTemplate {
  id          String              @id @default(cuid())
  name        String                                     // Template name, e.g. "Weekly Newsletter"
  subject     String                                     // Email subject, supports variables like {{userName}}
  content     Json                                       // TipTap JSON document structure
  htmlContent String?             @map("html_content") @db.Text  // Cached HTML generated from TipTap JSON
  variables   String[]            @default([])           // Declared available variables ["userName", "email"]
  status      EmailTemplateStatus @default(DRAFT)
  createdAt   DateTime            @default(now()) @map("created_at")
  updatedAt   DateTime            @updatedAt @map("updated_at")
  sendLogs    EmailSendLog[]

  @@map("email_templates")
}
```

### EmailSendLog

```prisma
model EmailSendLog {
  id              String          @id @default(cuid())
  templateId      String          @map("template_id")
  template        EmailTemplate   @relation(fields: [templateId], references: [id], onDelete: Restrict)
  recipientFilter String          @map("recipient_filter")  // "all" / "active_30d" / "completed_challenge" / "has_project"
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

**Note**: Add `emailSendLogs EmailSendLog[] @relation("emailSendLogs")` to the `User` model.

## Auth: Admin Page Guard

The existing `requireAdminUser()` returns JSON error responses designed for API routes. For Server Components/layouts, create a new helper:

```typescript
// src/lib/admin-auth.ts
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { isAdminEmail } from "@/lib/billing/admin";

export async function requireAdminPage() {
  const session = await auth();
  if (!session?.user?.email || !isAdminEmail(session.user.email)) {
    redirect("/");
  }
  return session.user;
}
```

This is used in `admin/layout.tsx` to redirect non-admins.

## Route Structure

All admin pages live under `src/app/[locale]/admin/` following the existing i18n pattern.

```
src/app/[locale]/admin/
├── layout.tsx                    # Admin layout with sidebar, requireAdminPage() auth guard
├── page.tsx                      # Admin dashboard (simple overview)
└── emails/
    ├── page.tsx                  # Email template list
    ├── new/
    │   └── page.tsx              # Create new template
    ├── [id]/
    │   ├── page.tsx              # Edit template (TipTap editor)
    │   ├── preview/
    │   │   └── page.tsx          # Preview email with sample data
    │   └── send/
    │       └── page.tsx          # Select recipients + send confirmation
    └── logs/
        └── page.tsx              # Send history logs
```

### Layout (admin/layout.tsx)

- Calls `requireAdminPage()` — redirects non-admins to homepage
- Sidebar navigation with "Email Management" section (expandable for future admin modules)
- Independent layout from the public-facing site (no Header/Footer)

### Admin i18n

Admin UI uses English only. Translation keys are not required for admin pages. The `[locale]` prefix is inherited from the routing structure but admin content is not translated.

## Query Functions & Server Actions

Following existing codebase conventions: **read operations** go in `src/lib/`, **mutations** go in `src/actions/`.

### src/lib/admin-emails.ts (Read Operations)

| Function | Description |
|----------|-------------|
| `getEmailTemplates()` | List all templates (non-archived) |
| `getEmailTemplate(id)` | Get single template details |
| `getRecipientCount(filter)` | Query matching user count for a filter condition |
| `getEmailSendLogs()` | List send history with template info |

### src/actions/admin/email-templates.ts (Mutations)

| Action | Description |
|--------|-------------|
| `createEmailTemplate(data)` | Create template with status `DRAFT` |
| `updateEmailTemplate(id, data)` | Update template; regenerate `htmlContent` from TipTap JSON |
| `archiveEmailTemplate(id)` | Set status to `ARCHIVED` (templates with send logs cannot be deleted) |
| `deleteEmailTemplate(id)` | Hard delete (only if no send logs exist) |

### src/actions/admin/email-send.ts (Mutations)

| Action | Description |
|--------|-------------|
| `sendTestEmail(templateId)` | Send test email to current admin's email with sample data |
| `sendBulkEmail(templateId, filter)` | Bulk send using Resend batch API (see Sending Strategy below) |

### Recipient Filters (Presets)

| Filter Key | Description | Query Logic |
|------------|-------------|-------------|
| `all` | All users | `email IS NOT NULL` |
| `active_30d` | Active in last 30 days | `UserStats.lastActiveDate` within 30 days |
| `completed_challenge` | Completed a challenge | Has record in `ChallengeCompletion` |
| `has_project` | Submitted a project | Has record in `SharedProject` |

### Variable Replacement

Built-in variables available at send time:

| Variable | Description |
|----------|-------------|
| `{{userName}}` | User's name |
| `{{userEmail}}` | User's email |
| `{{siteUrl}}` | Site URL (from `NEXTAUTH_URL`) |

Replacement is performed on both `htmlContent` and `subject` using regex `/\{\{(\w+)\}\}/g`.

## Bulk Email Sending Strategy

Synchronous per-user sending will time out for large user bases. Use **Resend's batch API** (`resend.batch.send()`) which accepts up to 100 emails per call:

```
sendBulkEmail(templateId, filter):
  1. Create EmailSendLog (status: PENDING)
  2. Update status to SENDING
  3. Query all matching users
  4. Chunk users into batches of 100
  5. For each batch:
     a. Build email payloads with variable replacement per user
     b. Call resend.batch.send(payloads)
     c. Increment successCount / failCount based on batch result
     d. Update EmailSendLog counts
  6. Update status to COMPLETED (or FAILED if all failed)
  7. Set sentAt timestamp
```

For very large sends (1000+ users), the action still runs in a single request. If this becomes a problem, a background job queue can be added in a future iteration. For now, Next.js server action timeout is configurable and sufficient for the expected user base.

### Error Handling

- Failed sends are counted in `failCount` and visible in the logs UI
- No automatic retry — admin can view the log and manually re-send if needed
- `onDelete: Restrict` on `EmailSendLog.templateId` prevents accidental template deletion

## Frontend Components

### New Dependencies

- `@tiptap/react` + `@tiptap/starter-kit` — rich text editor core
- `@tiptap/extension-link`, `@tiptap/extension-image` — link and image extensions
- `@tiptap/html` — TipTap JSON to HTML conversion

### Component Structure

```
src/components/admin/
├── admin-sidebar.tsx              # Sidebar navigation
├── email-template-editor.tsx      # TipTap rich text editor (core component)
├── email-template-list.tsx        # Template list table
├── email-preview.tsx              # Email preview renderer
├── recipient-filter-select.tsx    # Recipient filter condition selector
└── send-confirm-dialog.tsx        # Send confirmation dialog
```

### email-template-editor.tsx (Core)

- TipTap editor with toolbar: bold, italic, headings (H1-H3), link, image, ordered/unordered lists, blockquote
- Right-side variable panel: lists available variables, click to insert `{{variableName}}` at cursor
- Bottom: template name input, email subject input (also supports variables)
- Auto-save: debounce 2 seconds, calls `updateEmailTemplate`. Saves are queued sequentially to prevent race conditions from rapid edits.

### email-preview.tsx

- Receives `htmlContent` and sample variable data
- Renders in `<iframe srcdoc>` to isolate styles from the admin page
- Shows email subject with variables replaced at the top
- "Send Test Email" button

### recipient-filter-select.tsx

- Dropdown to select preset filter conditions
- On selection, calls `getRecipientCount` to display matching user count in real-time
- Send button triggers `send-confirm-dialog` for secondary confirmation

### UI Style

Uses existing shadcn/ui components: `Card`, `Table`, `Button`, `Input`, `Select`, `Dialog`, `Badge`, `Tabs`.
Admin sidebar uses a custom fixed sidebar component. Design language consistent with the public site.

## Existing Infrastructure Leveraged

- **Auth**: `isAdminEmail()` from `src/lib/billing/admin.ts` + new `requireAdminPage()` for page-level auth
- **Email**: Resend client already configured in `src/lib/email.ts`
- **Database**: Prisma + PostgreSQL, existing `@@map`/`@map` conventions, Prisma enums
- **UI**: shadcn/ui component library, Tailwind CSS v4
- **Activity tracking**: `UserStats.lastActiveDate` for the `active_30d` filter

## Out of Scope (Future Iterations)

- Scheduled/cron-based automatic sending (e.g., weekly newsletter)
- Email open/click tracking
- Unsubscribe mechanism
- Rich template library / pre-built designs
- Per-recipient send log (currently only aggregate counts)
- Retry mechanism for failed sends
- Background job queue for very large sends
