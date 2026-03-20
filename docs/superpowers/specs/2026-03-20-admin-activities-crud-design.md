# Admin Activities CRUD Design

## Overview

Add Activity management to the admin panel, following the existing emails CRUD pattern. Enables admins to create, edit, delete activities, quick-switch status, and manage associated challenges.

## Goals

- Full CRUD for activities in admin panel
- Quick status toggle from list view
- Challenge association management (add/remove/reorder)
- Dashboard stats for activities

## Non-Goals

- Activity analytics (views, engagement)
- Bulk operations on activities

---

## 1. Route Structure

```
/admin/activities           → Activity list with stats + status toggle
/admin/activities/new       → Create activity
/admin/activities/[id]      → Edit activity + manage associated challenges
```

## 2. List Page (`/admin/activities`)

**Stats row** (top): 4 cards — Total, Active, Upcoming, Ended (same pattern as dashboard).

**Table columns:**
- Title (link to edit page)
- Type (Badge: HACKATHON/THEMED/EXTERNAL/GENERAL)
- Status (clickable Badge → Select dropdown for quick status change)
- Date Range (startDate – endDate, or "No dates")
- Challenges (count of associated challenges)
- Author (name)
- Actions (Edit, Delete buttons)

**Header:** "Activities" title + "New Activity" button.

**Empty state:** "No activities yet. Create your first one."

## 3. New Page (`/admin/activities/new`)

Server component with form. Fields:
- Title (Input, required)
- Description (Textarea, required)
- Type (Select: HACKATHON, THEMED, EXTERNAL, GENERAL)
- Content (Textarea for markdown)
- External URL (Input, shown for EXTERNAL type)
- Start Date / End Date (date inputs)
- Cover Image URL (Input)

Submit calls `createAdminActivity` → redirect to edit page.

## 4. Edit Page (`/admin/activities/[id]`)

Two sections:

**Section 1: Activity Details**
- Same form fields as new page, plus Status select (DRAFT/UPCOMING/ACTIVE/ENDED)
- Auto-save or manual save button

**Section 2: Associated Challenges**
- Table of currently associated challenges with order number
- Each row: order, challenge title, difficulty badge, remove button
- "Add Challenge" button → opens a search dialog
- Search dialog: text input that searches challenges by title, results list with "Add" button
- Reorder: up/down buttons or order number input per challenge

## 5. Files

### New Files

| File | Purpose |
|------|---------|
| `src/app/[locale]/admin/activities/page.tsx` | List page (server component) |
| `src/app/[locale]/admin/activities/new/page.tsx` | Create page |
| `src/app/[locale]/admin/activities/[id]/page.tsx` | Edit page |
| `src/components/admin/activity-list.tsx` | List client component with status toggle |
| `src/components/admin/admin-activity-form.tsx` | Admin activity form (create + edit) |
| `src/components/admin/challenge-picker.tsx` | Challenge search & add dialog |
| `src/lib/admin-activities.ts` | Query functions for admin |
| `src/actions/admin/activities.ts` | Server actions (CRUD + challenge association) |

### Modified Files

| File | Change |
|------|--------|
| `src/components/admin/admin-sidebar.tsx` | Add "Activities" nav item |
| `src/app/[locale]/admin/page.tsx` | Add activity count to dashboard stats |

## 6. Data Layer

### Queries (`src/lib/admin-activities.ts`)

- `getAdminActivities()` — all activities with author, challenge count, ordered by updatedAt desc
- `getAdminActivity(id)` — single activity with author, challenges (with challenge details), translations
- `getActivityStats()` — counts by status (total, active, upcoming, ended)
- `searchChallenges(query)` — search challenges by title for the picker

### Actions (`src/actions/admin/activities.ts`)

All actions call `requireAdmin()` first.

- `createAdminActivity(formData)` — create activity, redirect to edit page
- `updateAdminActivity(id, formData)` — update activity fields
- `deleteAdminActivity(id)` — delete activity + cascade
- `updateActivityStatus(id, status)` — quick status toggle from list
- `addActivityChallenge(activityId, challengeId)` — add challenge association with next order
- `removeActivityChallenge(activityId, challengeId)` — remove association
- `reorderActivityChallenges(activityId, orderedChallengeIds)` — update order for all associations

## 7. Sidebar Navigation

Add to `navItems` in `admin-sidebar.tsx`:
```typescript
{ href: "/admin/activities", label: "Activities", icon: CalendarDays }
```

## 8. Dashboard Update

Add activity count card to admin dashboard alongside existing user/template/send counts.
