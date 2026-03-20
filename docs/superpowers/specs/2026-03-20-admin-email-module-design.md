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

### EmailTemplate

```prisma
model EmailTemplate {
  id          String   @id @default(cuid())
  name        String                    // Template name, e.g. "Weekly Newsletter"
  subject     String                    // Email subject, supports variables like {{userName}}
  content     Json                      // TipTap JSON document structure
  htmlContent String?  @db.Text         // Cached HTML generated from TipTap JSON
  variables   String[] @default([])     // Declared available variables ["userName", "email"]
  status      String   @default("draft") // draft | active
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  sendLogs    EmailSendLog[]
}
```

### EmailSendLog

```prisma
model EmailSendLog {
  id              String   @id @default(cuid())
  templateId      String
  template        EmailTemplate @relation(fields: [templateId], references: [id])
  recipientFilter String               // Filter key: "all" / "active_30d" / "completed_challenge" / "has_project"
  totalCount      Int                  // Target recipient count
  successCount    Int      @default(0)
  failCount       Int      @default(0)
  status          String   @default("pending") // pending | sending | completed | failed
  sentAt          DateTime?
  sentBy          String               // Admin user id who triggered the send
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
}
```

## Route Structure

All admin pages live under `src/app/[locale]/admin/` following the existing i18n pattern.

```
src/app/[locale]/admin/
├── layout.tsx                    # Admin layout with sidebar, requireAdminUser() auth guard
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

- Calls `requireAdminUser()` — redirects non-admins to homepage
- Sidebar navigation with "Email Management" section (expandable for future admin modules)
- Independent layout from the public-facing site (no Header/Footer)

## Server Actions

Located in `src/actions/admin/`.

### email-templates.ts

| Action | Description |
|--------|-------------|
| `createEmailTemplate(data)` | Create template with status `draft` |
| `updateEmailTemplate(id, data)` | Update template; regenerate `htmlContent` from TipTap JSON |
| `deleteEmailTemplate(id)` | Delete template (block if has send logs; must archive instead) |
| `getEmailTemplates()` | List all templates |
| `getEmailTemplate(id)` | Get single template details |

### email-send.ts

| Action | Description |
|--------|-------------|
| `getRecipientCount(filter)` | Query matching user count for a filter condition |
| `sendTestEmail(templateId)` | Send test email to current admin's email with sample data |
| `sendBulkEmail(templateId, filter)` | Bulk send: create log, query users, send via Resend, update counts |
| `getEmailSendLogs()` | List send history |

### Recipient Filters (Presets)

| Filter Key | Description | Query Logic |
|------------|-------------|-------------|
| `all` | All users | `email IS NOT NULL` |
| `active_30d` | Active in last 30 days | Recent session in `Session` table |
| `completed_challenge` | Completed a challenge | Has record in `ChallengeCompletion` |
| `has_project` | Submitted a project | Has record in `SharedProject` |

### Variable Replacement

Built-in variables available at send time:

| Variable | Description |
|----------|-------------|
| `{{userName}}` | User's name |
| `{{userEmail}}` | User's email |
| `{{siteUrl}}` | Site URL (from `NEXTAUTH_URL`) |

Replacement uses regex `/\{\{(\w+)\}\}/g` on both `htmlContent` and `subject`.

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
- Auto-save: debounce 2 seconds, calls `updateEmailTemplate`

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

## Email Sending Flow

```
Admin clicks "Send" on send page
  → send-confirm-dialog shows recipient count + template preview
  → Admin confirms
  → sendBulkEmail(templateId, filter) called
    → Create EmailSendLog (status: "pending")
    → Update status to "sending"
    → Query users matching filter
    → For each user:
      → Replace variables in subject + htmlContent
      → Call Resend API to send email
      → Increment successCount or failCount
    → Update EmailSendLog status to "completed" (or "failed" if all failed)
    → Update sentAt timestamp
  → Redirect to send logs page
```

## Existing Infrastructure Leveraged

- **Auth**: `requireAdminUser()` from `src/lib/billing/admin.ts` (email-based admin check via `ADMIN_EMAILS` env var)
- **Email**: Resend client already configured in `src/lib/email.ts`
- **Database**: Prisma + PostgreSQL, existing patterns for model relations
- **UI**: shadcn/ui component library, Tailwind CSS v4

## Out of Scope (Future Iterations)

- Scheduled/cron-based automatic sending (e.g., weekly newsletter)
- Email open/click tracking
- Unsubscribe mechanism
- Rich template library / pre-built designs
- Per-recipient send log (currently only aggregate counts)
