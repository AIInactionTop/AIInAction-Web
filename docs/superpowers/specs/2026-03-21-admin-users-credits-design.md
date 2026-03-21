# Admin Users & Manual Credits Design

## Overview

Add user query and manual credit top-up functionality to the admin module.

## Routes

- `/admin/users` — User list with search, filters, pagination
- `/admin/users/[id]` — User detail with credit balance, grant credits, ledger history

## New Files

- `src/app/[locale]/admin/users/page.tsx` — User list page
- `src/app/[locale]/admin/users/[id]/page.tsx` — User detail page
- `src/actions/admin/users.ts` — Server Action for granting credits
- `src/components/admin/grant-credits-dialog.tsx` — Credit grant dialog (Client Component)

## Modified Files

- `src/components/admin/admin-sidebar.tsx` — Add "Users" nav item

## User List Page

### URL Parameters

| Param | Description |
|-------|-------------|
| `q` | Search keyword (fuzzy match on name/email) |
| `from` / `to` | Registration date range |
| `balanceMin` / `balanceMax` | Credits balance range (in credits, not microcredits) |
| `page` | Page number, default 1 |

Page size: 20.

### Table Columns

Avatar | Name | Email | GitHub | Credits Balance | Registration Date | Actions (View link)

### Search/Filter UI

A `<form>` with GET method submitting to the same page:
- Text input for search keyword
- Two date inputs for registration range
- Two number inputs for balance range
- Search / Reset buttons

### Data Query

Direct Prisma query in the server component. Dynamic `where` conditions based on URL params. Join `billingAccount` for balance. Order by `createdAt` descending.

For balance filtering, convert the credits input to microcredits before querying `billingAccount.balanceMicrocredits`.

**Users without BillingAccount:** When `balanceMin` is 0 or unset, include users without a billing account (they have implicit 0 balance). When `balanceMax` is set and >= 0, also include them. When a non-zero `balanceMin` is set, excluding them is correct.

## User Detail Page

### Top Section — User Info Card

Avatar, name, email, GitHub link, registration date.

### Middle Section — Credits Overview Card

- Current balance (display in credits via `microcreditsToCreditsString()`)
- Lifetime credited (same conversion)
- Lifetime debited (same conversion)
- "Grant Credits" button → opens dialog

Data from `billingAccount` relation. If no billing account exists, show all as 0.

### Bottom Section — Credit Ledger Table

Paginated via `ledgerPage` URL param, 20 per page.

Columns: Time | Type (CREDIT/DEBIT/REFUND/ADJUSTMENT/EXPIRE) | Source (TOP_UP/MEMBERSHIP/AI_USAGE/MANUAL_ADJUSTMENT/REFUND/PROMOTION) | Amount | Balance After | Description

All monetary columns (Amount, Balance After) displayed in credits via `microcreditsToCreditsString()`.

Query `creditLedgerEntry` where `userId`, order by `createdAt` descending.

## Grant Credits Dialog

Client Component with form fields:
- **Amount** — number input, unit: credits, supports decimals
- **Source** — select dropdown: MANUAL_ADJUSTMENT, PROMOTION, REFUND
- **Description** — textarea, required
- **Confirm** button (disabled while submitting, shows loading indicator)

Calls server action on submit.

## Server Action

`grantCreditsToUser(formData)` in `src/actions/admin/users.ts`:

1. `requireAdmin()` authentication check — also captures admin user ID
2. Parse and validate: userId, amount (> 0), source, description (non-empty)
3. Convert credits to microcredits via `creditsToMicrocredits()`
4. Call existing `grantCredits()` from `src/lib/billing/service.ts` with:
   - `source`: user-selected (MANUAL_ADJUSTMENT / PROMOTION / REFUND)
   - `entryType`: CREDIT for MANUAL_ADJUSTMENT/PROMOTION, REFUND for REFUND source
   - `description`: admin-provided reason
   - `metadata`: `{ grantedBy: adminUser.id }` for audit trail
   - `sourceRef`: not passed (null) — each manual grant is unique, no idempotency needed. PostgreSQL treats NULL as distinct in unique constraints, so multiple `(source, null)` rows are safe.
5. `revalidatePath()` to refresh the detail page
6. Return `{ success: true }` or `{ error: string }` for the dialog to display

## Sidebar Update

Add "Users" item to `admin-sidebar.tsx` nav items array at index 1 (after Dashboard, before Activities). Icon: `Users` from lucide-react.

## Technical Decisions

- **Server-side rendering** with URL search params for search/filter/pagination
- **Reuse existing `grantCredits()`** — no new billing logic needed
- **No new API routes** — server actions + server components only
- **Microcredits conversion** — action layer converts credits→microcredits for writes; display layer converts microcredits→credits via `microcreditsToCreditsString()` for reads
- **Audit trail** — admin user ID stored in ledger entry metadata
