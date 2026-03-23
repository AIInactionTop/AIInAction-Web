# Login Page Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the login page with a split-screen layout, email OTP verification code login, and Google OAuth — alongside the existing GitHub login.

**Architecture:** NextAuth v5 Resend provider with custom OTP flow (6-digit code instead of magic link). Google OAuth via NextAuth Google provider. Split-screen login page with left brand panel (stats) and right form panel. Server component wrapper for stats + client component for form interactions.

**Tech Stack:** NextAuth v5, Resend (email), Prisma, Tailwind CSS v4, Framer Motion, next-intl, shadcn/ui

**Spec:** `docs/superpowers/specs/2026-03-23-login-page-redesign.md`

---

## File Structure

| File | Action | Responsibility |
|------|--------|----------------|
| `src/lib/auth.ts` | Modify | Add Resend + Google providers with custom OTP token generation |
| `src/lib/email.ts` | Modify | Add `sendOtpEmail` function for branded OTP email |
| `src/actions/auth.ts` | Create | Server actions: `sendOtpCode` (triggers email send) and `getOtpCallbackUrl` (constructs NextAuth callback URL for verification) |
| `src/app/[locale]/login/page.tsx` | Rewrite | Server component wrapper that fetches stats, renders client login form |
| `src/app/[locale]/login/login-form.tsx` | Create | Client component: split-screen layout, email/OTP form, social buttons |
| `messages/en.json` | Modify | Add login i18n keys |
| `messages/zh.json` | Modify | Add login i18n keys |
| `.env.example` | Modify | Add GOOGLE_ID, GOOGLE_SECRET placeholders |

---

### Task 1: Add i18n Keys

**Files:**
- Modify: `messages/en.json` (login section)
- Modify: `messages/zh.json` (login section)

- [ ] **Step 1: Update English translations**

In `messages/en.json`, replace the `"login"` section with:

```json
"login": {
  "title": "Welcome back",
  "subtitle": "Sign in to track your progress and share projects",
  "emailPlaceholder": "Enter your email",
  "sendCode": "Send verification code",
  "enterCode": "Enter verification code",
  "codeSent": "We sent a 6-digit code to {email}",
  "verify": "Verify & Sign in",
  "resendCode": "Resend code",
  "resendIn": "Resend in {seconds}s",
  "continueGithub": "Continue with GitHub",
  "continueGoogle": "Continue with Google",
  "orDivider": "OR",
  "terms": "By signing in, you agree to our Terms of Service and Privacy Policy.",
  "brand": {
    "tagline": "Learn AI by building real-world projects",
    "description": "Join a community of builders learning AI through hands-on challenge projects."
  },
  "stats": {
    "challenges": "Challenges",
    "builders": "Builders",
    "projects": "Projects"
  }
}
```

- [ ] **Step 2: Update Chinese translations**

In `messages/zh.json`, replace the `"login"` section with:

```json
"login": {
  "title": "欢迎回来",
  "subtitle": "登录以跟踪进度和分享项目",
  "emailPlaceholder": "输入邮箱地址",
  "sendCode": "发送验证码",
  "enterCode": "输入验证码",
  "codeSent": "验证码已发送至 {email}",
  "verify": "验证并登录",
  "resendCode": "重新发送",
  "resendIn": "{seconds}秒后重发",
  "continueGithub": "使用 GitHub 继续",
  "continueGoogle": "使用 Google 继续",
  "orDivider": "或",
  "terms": "登录即表示你同意我们的服务条款和隐私政策。",
  "brand": {
    "tagline": "通过构建真实项目学习 AI",
    "description": "加入创作者社区，通过实战挑战项目学习 AI。"
  },
  "stats": {
    "challenges": "挑战项目",
    "builders": "创作者",
    "projects": "项目作品"
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add messages/en.json messages/zh.json
git commit -m "feat(login): add i18n keys for email OTP and Google login"
```

---

### Task 2: Add OTP Email Template

**Files:**
- Modify: `src/lib/email.ts`

- [ ] **Step 1: Add sendOtpEmail function**

Add this function to `src/lib/email.ts` after the existing `sendWelcomeEmail`:

```typescript
export async function sendOtpEmail(email: string, code: string) {
  const resend = getResendClient();

  await resend.emails.send({
    from: "AI In Action <noreply@aiinaction.top>",
    to: email,
    subject: `${code} is your AI In Action verification code`,
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
        <h1 style="color: #1a1a1a; font-size: 24px; margin-bottom: 8px;">Your verification code</h1>
        <p style="color: #4a4a4a; font-size: 16px; line-height: 1.6; margin-bottom: 24px;">
          Enter this code to sign in to AI In Action:
        </p>
        <div style="background: #f4f4f5; border-radius: 12px; padding: 24px; text-align: center; margin-bottom: 24px;">
          <span style="font-size: 36px; font-weight: 700; letter-spacing: 8px; color: #1a1a1a;">${code}</span>
        </div>
        <p style="color: #9a9a9a; font-size: 14px; line-height: 1.6;">
          This code expires in 10 minutes. If you didn't request this, you can safely ignore this email.
        </p>
        <p style="color: #9a9a9a; font-size: 14px; margin-top: 32px;">
          — The AI In Action Team
        </p>
      </div>
    `,
  });
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/email.ts
git commit -m "feat(login): add OTP email template"
```

---

### Task 3: Configure NextAuth Providers (Resend + Google)

**Files:**
- Modify: `src/lib/auth.ts`

- [ ] **Step 1: Add Resend and Google providers to auth config**

Replace the full contents of `src/lib/auth.ts` with:

```typescript
import NextAuth from "next-auth";
import GitHub from "next-auth/providers/github";
import Google from "next-auth/providers/google";
import Resend from "next-auth/providers/resend";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "./prisma";
import { sendWelcomeEmail, sendOtpEmail } from "./email";

function generateOtpCode(): string {
  // Generate a 6-digit numeric code
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: PrismaAdapter(prisma),
  providers: [
    GitHub({
      clientId: process.env.GITHUB_ID,
      clientSecret: process.env.GITHUB_SECRET,
      profile(profile) {
        return {
          id: profile.id.toString(),
          name: profile.name || profile.login,
          email: profile.email,
          image: profile.avatar_url,
          githubId: profile.id.toString(),
          githubUrl: profile.html_url,
          bio: profile.bio,
        };
      },
    }),
    Google({
      clientId: process.env.GOOGLE_ID,
      clientSecret: process.env.GOOGLE_SECRET,
    }),
    Resend({
      apiKey: process.env.RESEND_API_KEY,
      from: "AI In Action <noreply@aiinaction.top>",
      maxAge: 600, // 10 minutes
      generateVerificationToken() {
        return generateOtpCode();
      },
      async sendVerificationRequest({ identifier: email, url }) {
        // Extract the token (OTP code) from the magic link URL
        const urlObj = new URL(url);
        const token = urlObj.searchParams.get("token");
        if (!token) throw new Error("Missing verification token");
        await sendOtpEmail(email, token);
      },
    }),
  ],
  callbacks: {
    session({ session, user }) {
      if (session.user) {
        session.user.id = user.id;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
    verifyRequest: "/login?verify=1",
  },
  events: {
    async createUser({ user }) {
      if (user.email) {
        try {
          await sendWelcomeEmail(user.name || "", user.email);
        } catch {
          // Graceful degradation — don't block sign-in if email fails
        }
      }
    },
  },
});
```

Key changes:
- Added `Google` provider
- Added `Resend` provider with `generateVerificationToken` returning a 6-digit code
- Custom `sendVerificationRequest` extracts the token from the magic link URL and sends it as a code via `sendOtpEmail`
- Added `verifyRequest` page config to redirect back to login page after sending code

- [ ] **Step 2: Verify the build compiles**

Run: `pnpm build`
Expected: No TypeScript errors related to auth.ts

- [ ] **Step 3: Commit**

```bash
git add src/lib/auth.ts
git commit -m "feat(login): add Resend OTP and Google OAuth providers"
```

---

### Task 4: Create Server Actions for OTP Flow

**Files:**
- Create: `src/actions/auth.ts`

- [ ] **Step 1: Create the auth server actions (send + verify)**

The key insight: `signIn("resend", ...)` from the server always **sends** a new email. To **verify** the code, we must redirect the user to the NextAuth callback URL (`/api/auth/callback/resend?token=CODE&email=EMAIL`), which is what magic links normally do. We construct this URL server-side and return it to the client.

```typescript
"use server";

import { signIn } from "@/lib/auth";

export async function sendOtpCode(email: string) {
  try {
    await signIn("resend", {
      email,
      redirect: false,
    });
    return { success: true };
  } catch (error) {
    // NextAuth signIn with redirect:false throws on redirect (expected behavior)
    if (error instanceof Error && error.message === "NEXT_REDIRECT") {
      return { success: true };
    }
    return { success: false, error: "Failed to send code" };
  }
}

export async function getOtpCallbackUrl(email: string, code: string) {
  // Construct the NextAuth callback URL that verifies the token.
  // This is the same URL that magic links point to — we just build it manually.
  const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
  const callbackUrl = new URL("/api/auth/callback/resend", baseUrl);
  callbackUrl.searchParams.set("token", code);
  callbackUrl.searchParams.set("email", email);
  callbackUrl.searchParams.set("callbackUrl", "/");
  return callbackUrl.toString();
}
```

- [ ] **Step 2: Commit**

```bash
git add src/actions/auth.ts
git commit -m "feat(login): add OTP send and verify server actions"
```

---

### Task 5: Create Login Form Client Component

**Files:**
- Create: `src/app/[locale]/login/login-form.tsx`

- [ ] **Step 1: Create the login form component**

This is the main client component with the split-screen layout. It handles:
- Email input → send OTP → enter code → verify (same-page transitions)
- GitHub and Google social login buttons
- 60-second countdown timer for resend
- Framer Motion animations for state transitions

```tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import { signIn } from "next-auth/react";
import { Github, Zap, Mail, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useTranslations } from "next-intl";
import { motion, AnimatePresence } from "framer-motion";
import { sendOtpCode, getOtpCallbackUrl } from "@/actions/auth";

interface LoginFormProps {
  stats: {
    challenges: number;
    builders: number;
    projects: number;
  };
  initialVerify?: boolean;
}

type FormState = "email" | "otp";

export function LoginForm({ stats, initialVerify }: LoginFormProps) {
  const t = useTranslations("login");
  const [formState, setFormState] = useState<FormState>(
    initialVerify ? "otp" : "email"
  );
  const [email, setEmail] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [error, setError] = useState("");

  // Countdown timer
  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setInterval(() => setCountdown((c) => c - 1), 1000);
    return () => clearInterval(timer);
  }, [countdown]);

  const handleSendCode = useCallback(async () => {
    if (!email || isLoading) return;
    setIsLoading(true);
    setError("");
    try {
      const result = await sendOtpCode(email);
      if (result.success) {
        setFormState("otp");
        setCountdown(60);
      } else {
        setError(result.error || "Failed to send code");
      }
    } catch {
      setError("Failed to send code");
    } finally {
      setIsLoading(false);
    }
  }, [email, isLoading]);

  const handleVerifyCode = useCallback(async () => {
    if (!otpCode || otpCode.length !== 6 || isLoading) return;
    setIsLoading(true);
    setError("");
    try {
      // Get the NextAuth callback URL with the OTP code embedded.
      // Navigating to this URL triggers NextAuth's token verification
      // (same mechanism as clicking a magic link).
      const callbackUrl = await getOtpCallbackUrl(email, otpCode);
      window.location.href = callbackUrl;
    } catch {
      setError("Verification failed");
      setIsLoading(false);
    }
  }, [email, otpCode, isLoading]);

  const handleResend = useCallback(async () => {
    if (countdown > 0 || isLoading) return;
    setOtpCode("");
    await handleSendCode();
  }, [countdown, isLoading, handleSendCode]);

  const formatStat = (num: number) => {
    if (num >= 1000) return `${(num / 1000).toFixed(1)}k`;
    return num.toString();
  };

  return (
    <div className="flex min-h-[calc(100vh-8rem)] w-full">
      {/* Left Panel - Brand */}
      <div className="hidden w-1/2 flex-col justify-between bg-gradient-to-br from-blue-600 via-blue-700 to-purple-700 p-12 md:flex">
        <div>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20">
              <Zap className="h-5 w-5 text-white" />
            </div>
            <span className="text-xl font-bold text-white">AI In Action</span>
          </div>
        </div>
        <div>
          <h2 className="text-3xl font-bold leading-tight text-white">
            {t("brand.tagline")}
          </h2>
          <p className="mt-4 text-lg text-blue-100/80">
            {t("brand.description")}
          </p>
          <div className="mt-10 flex gap-8">
            {[
              { value: stats.challenges, label: t("stats.challenges") },
              { value: stats.builders, label: t("stats.builders") },
              { value: stats.projects, label: t("stats.projects") },
            ].map((stat) => (
              <div key={stat.label}>
                <div className="text-2xl font-bold text-white">
                  {formatStat(stat.value)}
                </div>
                <div className="text-sm text-blue-200/70">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="text-sm text-blue-200/50">
          © {new Date().getFullYear()} AI In Action
        </div>
      </div>

      {/* Right Panel - Login Form */}
      <div className="flex flex-1 items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">
          {/* Mobile logo - only visible on mobile */}
          <div className="mb-8 flex items-center justify-center gap-2 md:hidden">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <Zap className="h-5 w-5" />
            </div>
            <span className="text-xl font-bold">AI In Action</span>
          </div>

          <div className="text-center md:text-left">
            <h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {t("subtitle")}
            </p>
          </div>

          {/* Email / OTP Form */}
          <div className="mt-8">
            <AnimatePresence mode="wait">
              {formState === "email" ? (
                <motion.div
                  key="email"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.2 }}
                >
                  <div className="space-y-3">
                    <Input
                      type="email"
                      placeholder={t("emailPlaceholder")}
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleSendCode()}
                      disabled={isLoading}
                      className="h-11"
                    />
                    <Button
                      size="lg"
                      className="w-full gap-2"
                      onClick={handleSendCode}
                      disabled={!email || isLoading}
                    >
                      <Mail className="h-4 w-4" />
                      {t("sendCode")}
                    </Button>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="otp"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ duration: 0.2 }}
                >
                  <div className="space-y-3">
                    <button
                      onClick={() => {
                        setFormState("email");
                        setOtpCode("");
                        setError("");
                      }}
                      className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
                    >
                      <ArrowLeft className="h-3 w-3" />
                      {email}
                    </button>
                    <p className="text-sm text-muted-foreground">
                      {t("codeSent", { email })}
                    </p>
                    <Input
                      type="text"
                      inputMode="numeric"
                      maxLength={6}
                      placeholder={t("enterCode")}
                      value={otpCode}
                      onChange={(e) =>
                        setOtpCode(e.target.value.replace(/\D/g, ""))
                      }
                      onKeyDown={(e) =>
                        e.key === "Enter" && handleVerifyCode()
                      }
                      disabled={isLoading}
                      className="h-11 text-center text-lg tracking-widest"
                      autoFocus
                    />
                    <Button
                      size="lg"
                      className="w-full"
                      onClick={handleVerifyCode}
                      disabled={otpCode.length !== 6 || isLoading}
                    >
                      {t("verify")}
                    </Button>
                    <div className="text-center">
                      {countdown > 0 ? (
                        <span className="text-sm text-muted-foreground">
                          {t("resendIn", { seconds: countdown })}
                        </span>
                      ) : (
                        <button
                          onClick={handleResend}
                          className="text-sm text-primary hover:underline"
                          disabled={isLoading}
                        >
                          {t("resendCode")}
                        </button>
                      )}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Error message */}
            {error && (
              <p className="mt-3 text-center text-sm text-destructive">
                {error}
              </p>
            )}
          </div>

          {/* Divider */}
          <div className="my-6 flex items-center gap-3">
            <div className="h-px flex-1 bg-border" />
            <span className="text-xs text-muted-foreground">
              {t("orDivider")}
            </span>
            <div className="h-px flex-1 bg-border" />
          </div>

          {/* Social Login Buttons */}
          <div className="space-y-3">
            <Button
              variant="outline"
              size="lg"
              className="w-full gap-2"
              onClick={() => signIn("github", { callbackUrl: "/" })}
            >
              <Github className="h-5 w-5" />
              {t("continueGithub")}
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="w-full gap-2"
              onClick={() => signIn("google", { callbackUrl: "/" })}
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24">
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                  fill="#4285F4"
                />
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  fill="#34A853"
                />
                <path
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  fill="#FBBC05"
                />
                <path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  fill="#EA4335"
                />
              </svg>
              {t("continueGoogle")}
            </Button>
          </div>

          {/* Terms */}
          <p className="mt-6 text-center text-xs text-muted-foreground">
            {t("terms")}
          </p>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/[locale]/login/login-form.tsx
git commit -m "feat(login): create split-screen login form component"
```

---

### Task 6: Rewrite Login Page (Server Component Wrapper)

**Files:**
- Modify: `src/app/[locale]/login/page.tsx`

- [ ] **Step 1: Rewrite as server component with stats**

Replace the entire file with:

```tsx
import { prisma } from "@/lib/prisma";
import { LoginForm } from "./login-form";

async function getLoginStats() {
  const [challenges, builders, projects] = await Promise.all([
    prisma.challenge.count(),
    prisma.user.count(),
    prisma.sharedProject.count(),
  ]);
  return { challenges, builders, projects };
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ verify?: string }>;
}) {
  const [stats, params] = await Promise.all([getLoginStats(), searchParams]);
  return <LoginForm stats={stats} initialVerify={params.verify === "1"} />;
}
```

- [ ] **Step 2: Verify the dev server renders the page**

Run: `pnpm dev`
Navigate to: `http://localhost:3000/login`
Expected: Split-screen login page with brand panel on left, form on right

- [ ] **Step 3: Commit**

```bash
git add src/app/[locale]/login/page.tsx
git commit -m "feat(login): rewrite login page with server stats and split layout"
```

---

### Task 7: Update Environment Variables

**Files:**
- Modify: `.env` (local only, not committed)

- [ ] **Step 1: Add Google OAuth credentials to .env**

Add to `.env`:

```
GOOGLE_ID=your-google-client-id
GOOGLE_SECRET=your-google-client-secret
```

Note: The user needs to create a Google OAuth app at https://console.cloud.google.com/apis/credentials and configure:
- Authorized JavaScript origins: `http://localhost:3000`
- Authorized redirect URIs: `http://localhost:3000/api/auth/callback/google`

- [ ] **Step 2: Update CLAUDE.md env vars section**

Add `GOOGLE_ID` and `GOOGLE_SECRET` to the Key Environment Variables section in `CLAUDE.md`.

- [ ] **Step 3: Commit CLAUDE.md update**

```bash
git add CLAUDE.md
git commit -m "docs: add Google OAuth env vars to CLAUDE.md"
```

---

### Task 8: End-to-End Verification

- [ ] **Step 1: Verify build passes**

Run: `pnpm build`
Expected: Build completes without errors

- [ ] **Step 2: Verify lint passes**

Run: `pnpm lint`
Expected: No lint errors

- [ ] **Step 3: Manual test checklist**

Test in browser at `http://localhost:3000/login`:

1. **Layout:** Split-screen visible on desktop, right panel only on mobile
2. **Stats:** Left panel shows challenge/builder/project counts from DB
3. **Email OTP flow:**
   - Enter email → click "Send verification code"
   - Page transitions to OTP input (animated)
   - Enter 6-digit code → click "Verify & Sign in"
   - Countdown timer works (60s)
   - "Resend code" appears after countdown
   - Back button returns to email input
4. **GitHub login:** Button redirects to GitHub OAuth
5. **Google login:** Button redirects to Google OAuth (if credentials configured)
6. **i18n:** Switch to Chinese locale → all text appears in Chinese
7. **Dark mode:** Login page looks correct in both light/dark themes
8. **Responsive:** Resize to mobile → left panel hidden, form centered
