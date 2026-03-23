# Login Page Redesign — Email OTP + Google OAuth

**Date:** 2026-03-23
**Status:** Approved

## Overview

Redesign the login page with a split-screen layout, adding email verification code (OTP) login and Google OAuth alongside the existing GitHub login.

## Layout

**Split-screen (left/right):**

- **Left panel** — Brand showcase area with gradient background:
  - Logo + app name ("AI In Action")
  - Tagline ("Learn AI by building real-world projects")
  - Platform stats pulled from DB (challenge count, user count, project count)
  - Decorative elements (subtle pattern or glow)

- **Right panel** — Login form:
  1. Email input + "Send verification code" button
  2. On send: smooth in-place transition to 6-digit OTP input + countdown resend (60s)
  3. Divider line with "OR"
  4. GitHub login button (existing)
  5. Google login button (new)
  6. Terms footer

**Responsive:** On mobile (< 768px), left panel hidden or collapsed to a compact top banner. Right panel takes full width.

## Technical Design

### 1. NextAuth Resend Provider (OTP Code)

**File:** `src/lib/auth.ts`

Add NextAuth's built-in Resend provider with custom OTP flow:

```typescript
import Resend from "next-auth/providers/resend";
```

**OTP flow (not magic link):**

NextAuth's default email flow uses magic links. To implement a typed 6-digit code flow:

1. **Custom token generation:** Override `generateVerificationToken` to produce a 6-digit numeric code instead of the default long hash
2. **Custom `sendVerificationRequest`:** Send a branded email containing the 6-digit code (not a clickable link)
3. **Custom verification API route:** Create `src/app/api/auth/verify-otp/route.ts` that accepts `{ email, code }` via POST, looks up the `VerificationToken`, validates the code, and calls NextAuth's `signIn("credentials")` or directly creates a session
4. **Login page form:** After sending the code, the form switches to a 6-digit input. On submit, it POSTs to the custom verify endpoint instead of relying on a magic link click
5. Configure `maxAge: 600` for code expiry (10 minutes)

**Database:** NextAuth's `VerificationToken` model already exists in `prisma/schema.prisma`. No schema changes needed.

### 2. Google OAuth Provider

**File:** `src/lib/auth.ts`

Add Google provider:

```typescript
import Google from "next-auth/providers/google";
```

- Requires `GOOGLE_ID` and `GOOGLE_SECRET` env vars
- Profile mapping: name, email, image (similar to GitHub)
- Account linking: NextAuth handles multi-provider accounts automatically via email matching

**Env vars to add:**
- `GOOGLE_ID` — Google OAuth client ID
- `GOOGLE_SECRET` — Google OAuth client secret

### 3. Login Page Component

**File:** `src/app/[locale]/login/page.tsx`

Rewrite as a client component with:

- Split-screen layout using Tailwind CSS
- Left panel: server-fetched stats passed as props (or fetched client-side)
- Right panel: login form with state management for email → OTP flow
- States: `idle` → `sending` → `code_sent` → `verifying`
- Animation: Framer Motion for smooth transition between email input and OTP input
- Form submission calls NextAuth's `signIn("email", { email, callbackUrl: "/" })`
- Social buttons call `signIn("github")` and `signIn("google")`

### 4. Server Action for Stats

**File:** `src/actions/stats.ts` (or inline in a server component wrapper)

Query counts for display on the left panel:
- Total challenges count
- Total users count
- Total shared projects count

### 5. OTP Email Template

Branded HTML email with:
- 6-digit code prominently displayed
- "This code expires in 10 minutes"
- App branding consistent with the login page

### 6. i18n Updates

**Files:** `messages/en.json`, `messages/zh.json`

Add/update login section keys:
- `emailPlaceholder`: "Enter your email" / "输入邮箱"
- `sendCode`: "Send verification code" / "发送验证码"
- `enterCode`: "Enter verification code" / "输入验证码"
- `resendCode`: "Resend code" / "重新发送"
- `resendIn`: "Resend in {seconds}s" / "{seconds}秒后重发"
- `continueGoogle`: "Continue with Google" / "使用 Google 继续"
- `orDivider`: "OR" / "或"
- `stats.challenges`: "Challenges" / "挑战项目"
- `stats.builders`: "Builders" / "创作者"
- `stats.projects`: "Projects" / "项目作品"

## Files to Create/Modify

| File | Action |
|------|--------|
| `src/lib/auth.ts` | Add Email + Google providers |
| `src/app/[locale]/login/page.tsx` | Rewrite with split-screen layout |
| `messages/en.json` | Add login i18n keys |
| `messages/zh.json` | Add login i18n keys |
| `.env` | Add `GOOGLE_ID`, `GOOGLE_SECRET` |
| `src/app/api/auth/verify-otp/route.ts` | New: custom OTP verification endpoint |
| `prisma/schema.prisma` | Verify VerificationToken model exists |

## Out of Scope

- Password-based authentication
- Phone number login
- Two-factor authentication (2FA)
- Account settings page for linking/unlinking providers
- Rate limiting on OTP sends (can be added later)
