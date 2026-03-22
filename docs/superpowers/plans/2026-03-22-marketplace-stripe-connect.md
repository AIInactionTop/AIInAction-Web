# Marketplace Stripe Connect Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enable real Stripe Connect Express payments in the marketplace with 10% platform commission.

**Architecture:** Sellers register Stripe Connect Express accounts via API routes. Paid item purchases create Stripe Checkout Sessions with `transfer_data.destination` pointing to the seller's Connect account. The existing webhook handler is extended to process marketplace purchases. Free items keep their existing direct-purchase flow.

**Tech Stack:** Stripe Connect Express, Stripe Checkout, Prisma, Next.js App Router, existing billing webhook infrastructure.

**Spec:** `docs/superpowers/specs/2026-03-22-marketplace-stripe-connect-design.md`

---

### Task 1: Schema Changes

**Files:**
- Modify: `prisma/schema.prisma` (User model ~line 49, MarketplacePurchase model ~line 769)

- [ ] **Step 1: Add `stripeConnectAccountId` to User model**

In `prisma/schema.prisma`, add after `stripeCustomerId` (line 49):

```prisma
stripeConnectAccountId String? @unique @map("stripe_connect_account_id")
```

Also add to User relations list (~line 71):
```prisma
marketplaceItems     MarketplaceItem[]  @relation("MarketplaceSeller")
marketplacePurchases MarketplacePurchase[]
marketplaceReviews   MarketplaceReview[]
```

- [ ] **Step 2: Add `stripePaymentIntentId` to MarketplacePurchase model**

In the `MarketplacePurchase` model (~line 769), add after `currency`:

```prisma
stripePaymentIntentId String? @unique @map("stripe_payment_intent_id")
```

- [ ] **Step 3: Run migration**

```bash
pnpm prisma migrate dev --name add-stripe-connect-fields
```

- [ ] **Step 4: Regenerate client**

```bash
pnpm db:generate
```

- [ ] **Step 5: Commit**

```bash
git add prisma/
git commit -m "feat: add Stripe Connect fields to User and MarketplacePurchase"
```

---

### Task 2: Connect Onboarding API Routes

**Files:**
- Create: `src/app/api/marketplace/connect/route.ts`
- Create: `src/app/api/marketplace/connect/refresh/route.ts`
- Create: `src/app/api/marketplace/connect/return/route.ts`

- [ ] **Step 1: Create POST /api/marketplace/connect**

Creates Express account, stores ID on User, returns onboarding URL.

```ts
// src/app/api/marketplace/connect/route.ts
import { jsonError, jsonSuccess } from "@/lib/api-auth";
import { requireSessionUser } from "@/lib/session-auth";
import { prisma } from "@/lib/prisma";
import { getStripe } from "@/lib/stripe";

export async function POST(request: Request) {
  const { user, error } = await requireSessionUser();
  if (error) return error;

  const body = await request.json().catch(() => null);
  const { returnUrl, refreshUrl } = (body || {}) as {
    returnUrl?: string;
    refreshUrl?: string;
  };

  const stripe = getStripe();
  const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";

  // Check if user already has a Connect account
  const dbUser = await prisma.user.findUniqueOrThrow({ where: { id: user!.id } });

  let accountId = dbUser.stripeConnectAccountId;

  if (!accountId) {
    const account = await stripe.accounts.create({
      type: "express",
      metadata: { userId: user!.id },
      ...(dbUser.email ? { email: dbUser.email } : {}),
    });
    accountId = account.id;

    await prisma.user.update({
      where: { id: user!.id },
      data: { stripeConnectAccountId: accountId },
    });
  }

  const accountLink = await stripe.accountLinks.create({
    account: accountId,
    refresh_url: refreshUrl || `${baseUrl}/api/marketplace/connect/refresh?userId=${user!.id}`,
    return_url: returnUrl || `${baseUrl}/api/marketplace/connect/return`,
    type: "account_onboarding",
  });

  return jsonSuccess({ url: accountLink.url }, 201);
}
```

- [ ] **Step 2: Create GET /api/marketplace/connect/refresh**

Regenerates onboarding link when seller abandons midway.

```ts
// src/app/api/marketplace/connect/refresh/route.ts
import { redirect } from "next/navigation";
import { requireSessionUser } from "@/lib/session-auth";
import { prisma } from "@/lib/prisma";
import { getStripe } from "@/lib/stripe";

export async function GET() {
  const { user, error } = await requireSessionUser();
  if (error) return error;

  const dbUser = await prisma.user.findUniqueOrThrow({ where: { id: user!.id } });
  if (!dbUser.stripeConnectAccountId) {
    redirect("/marketplace");
  }

  const stripe = getStripe();
  const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";

  const accountLink = await stripe.accountLinks.create({
    account: dbUser.stripeConnectAccountId,
    refresh_url: `${baseUrl}/api/marketplace/connect/refresh`,
    return_url: `${baseUrl}/api/marketplace/connect/return`,
    type: "account_onboarding",
  });

  redirect(accountLink.url);
}
```

- [ ] **Step 3: Create GET /api/marketplace/connect/return**

Post-onboarding redirect. Checks account status and redirects to marketplace.

```ts
// src/app/api/marketplace/connect/return/route.ts
import { redirect } from "next/navigation";
import { requireSessionUser } from "@/lib/session-auth";
import { prisma } from "@/lib/prisma";
import { getStripe } from "@/lib/stripe";

export async function GET() {
  const { user, error } = await requireSessionUser();
  if (error) return error;

  const dbUser = await prisma.user.findUniqueOrThrow({ where: { id: user!.id } });
  if (!dbUser.stripeConnectAccountId) {
    redirect("/marketplace");
  }

  // Verify account is ready
  const stripe = getStripe();
  const account = await stripe.accounts.retrieve(dbUser.stripeConnectAccountId);

  if (account.charges_enabled) {
    redirect("/marketplace?connect=success");
  } else {
    redirect("/marketplace?connect=pending");
  }
}
```

- [ ] **Step 4: Commit**

```bash
git add src/app/api/marketplace/connect/
git commit -m "feat: add Stripe Connect onboarding API routes"
```

---

### Task 3: Marketplace Checkout API Route

**Files:**
- Create: `src/app/api/marketplace/checkout/route.ts`

- [ ] **Step 1: Create POST /api/marketplace/checkout**

Creates a Stripe Checkout Session for a marketplace item with 10% platform fee and transfer to seller's Connect account.

```ts
// src/app/api/marketplace/checkout/route.ts
import { jsonError, jsonSuccess } from "@/lib/api-auth";
import { requireSessionUser } from "@/lib/session-auth";
import { prisma } from "@/lib/prisma";
import { getStripe } from "@/lib/stripe";

const PLATFORM_FEE_RATE = 0.1; // 10%

function resolveAbsoluteUrl(value: string | undefined) {
  if (!value) return null;
  try {
    const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
    return new URL(value, baseUrl).toString();
  } catch {
    return null;
  }
}

export async function POST(request: Request) {
  const { user, error } = await requireSessionUser();
  if (error) return error;

  const body = await request.json().catch(() => null);
  if (!body) return jsonError("BAD_REQUEST", "Invalid JSON body", 400);

  const { itemId, successUrl, cancelUrl } = body as {
    itemId?: string;
    successUrl?: string;
    cancelUrl?: string;
  };

  if (!itemId) return jsonError("VALIDATION_ERROR", "itemId is required", 400);

  const resolvedSuccessUrl = resolveAbsoluteUrl(successUrl);
  const resolvedCancelUrl = resolveAbsoluteUrl(cancelUrl);
  if (!resolvedSuccessUrl || !resolvedCancelUrl) {
    return jsonError("VALIDATION_ERROR", "successUrl and cancelUrl are required", 400);
  }

  // Load item with seller
  const item = await prisma.marketplaceItem.findUnique({
    where: { id: itemId },
    include: { seller: { select: { id: true, stripeConnectAccountId: true } } },
  });

  if (!item || item.status !== "PUBLISHED") {
    return jsonError("NOT_FOUND", "Item not found", 404);
  }
  if (item.price === 0) {
    return jsonError("VALIDATION_ERROR", "Free items do not require checkout", 400);
  }
  if (item.sellerId === user!.id) {
    return jsonError("VALIDATION_ERROR", "Cannot purchase your own item", 400);
  }

  // Check already purchased
  const existing = await prisma.marketplacePurchase.findUnique({
    where: { userId_itemId: { userId: user!.id, itemId } },
  });
  if (existing) {
    return jsonError("VALIDATION_ERROR", "Already purchased", 400);
  }

  // Check seller Connect account
  if (!item.seller.stripeConnectAccountId) {
    return jsonError("SELLER_NOT_CONNECTED", "Seller has not enabled payments", 400);
  }

  const stripe = getStripe();
  const account = await stripe.accounts.retrieve(item.seller.stripeConnectAccountId);
  if (!account.charges_enabled) {
    return jsonError("SELLER_NOT_CONNECTED", "Seller payment account is not ready", 400);
  }

  const applicationFee = Math.ceil(item.price * PLATFORM_FEE_RATE);

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    line_items: [
      {
        price_data: {
          currency: item.currency,
          product_data: {
            name: item.title,
            description: item.description.substring(0, 500),
          },
          unit_amount: item.price,
        },
        quantity: 1,
      },
    ],
    payment_intent_data: {
      application_fee_amount: applicationFee,
      transfer_data: {
        destination: item.seller.stripeConnectAccountId,
      },
    },
    metadata: {
      marketplacePurchase: "true",
      itemId: item.id,
      buyerId: user!.id,
      sellerId: item.sellerId,
      itemPrice: String(item.price),
      itemCurrency: item.currency,
    },
    success_url: resolvedSuccessUrl,
    cancel_url: resolvedCancelUrl,
  });

  return jsonSuccess({ checkoutSessionId: session.id, url: session.url }, 201);
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/api/marketplace/checkout/
git commit -m "feat: add marketplace checkout API route with Stripe Connect"
```

---

### Task 4: Extend Webhook Handler for Marketplace Purchases

**Files:**
- Modify: `src/lib/billing/service.ts` (~line 1276, inside `handleStripeCheckoutCompleted`)

- [ ] **Step 1: Add marketplace purchase handler**

In `handleStripeCheckoutCompleted` (in `src/lib/billing/service.ts`), add a new condition BEFORE the existing `customAmount` check (~line after the `completedAt` update). The marketplace check should be the first metadata check:

Add this block after the `completedAt` update and before `if (session.metadata?.customAmount === "true")`:

```ts
  // Marketplace purchase (Stripe Connect)
  if (session.metadata?.marketplacePurchase === "true") {
    const { itemId, buyerId, itemPrice, itemCurrency } = session.metadata;
    if (!itemId || !buyerId) {
      console.error("Marketplace webhook missing metadata", session.metadata);
      return;
    }

    // Idempotency: check if purchase already exists
    const existingPurchase = await prisma.marketplacePurchase.findUnique({
      where: { userId_itemId: { userId: buyerId, itemId } },
    });
    if (existingPurchase) return;

    const paymentIntentId =
      typeof session.payment_intent === "string"
        ? session.payment_intent
        : session.payment_intent?.id || null;

    await prisma.$transaction([
      prisma.marketplacePurchase.create({
        data: {
          userId: buyerId,
          itemId,
          price: parseInt(itemPrice || "0", 10),
          currency: itemCurrency || "usd",
          stripePaymentIntentId: paymentIntentId,
        },
      }),
      prisma.marketplaceItem.update({
        where: { id: itemId },
        data: { salesCount: { increment: 1 } },
      }),
    ]);

    return;
  }
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/billing/service.ts
git commit -m "feat: handle marketplace purchase in Stripe webhook"
```

---

### Task 5: Update Marketplace Item Detail Page

**Files:**
- Modify: `src/lib/marketplace.ts` (~line 107, seller select)
- Modify: `src/app/[locale]/marketplace/[slug]/marketplace-item-detail.tsx`

- [ ] **Step 1: Include `stripeConnectAccountId` in seller query**

In `src/lib/marketplace.ts`, update the seller select in `getMarketplaceItemBySlug` (~line 107):

```ts
// Change:
seller: { select: { id: true, name: true, image: true, bio: true } },
// To:
seller: { select: { id: true, name: true, image: true, bio: true, stripeConnectAccountId: true } },
```

- [ ] **Step 2: Update ItemDetail type and add `sellerConnected` prop**

In `src/app/[locale]/marketplace/[slug]/marketplace-item-detail.tsx`, update the `ItemDetail` type's seller field:

```ts
seller: { id: string; name: string | null; image: string | null; bio: string | null; stripeConnectAccountId: string | null };
```

- [ ] **Step 3: Replace purchase button logic for paid items**

In `marketplace-item-detail.tsx`, add state and imports at the top of the component:

Add `Loader2` to the lucide-react imports.

Replace the `handlePurchase` function:

```ts
const handlePurchase = () => {
  if (item.price === 0) {
    // Free items: direct purchase (existing behavior)
    startPurchase(async () => {
      await purchaseMarketplaceItem(item.id);
      router.refresh();
    });
    return;
  }

  // Paid items: Stripe Checkout
  startPurchase(async () => {
    try {
      const response = await fetch("/api/marketplace/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          itemId: item.id,
          successUrl: `${window.location.pathname}?checkout=success`,
          cancelUrl: `${window.location.pathname}?checkout=cancelled`,
        }),
      });

      const payload = await response.json().catch(() => null);
      if (!response.ok || !payload?.data?.url) {
        throw new Error(payload?.error?.message || "Failed to create checkout");
      }

      window.location.href = payload.data.url;
    } catch (err) {
      alert(err instanceof Error ? err.message : "Checkout failed");
    }
  });
};
```

- [ ] **Step 4: Update the Buy Now button rendering**

Replace the purchase button section in the sidebar (the `else` branch for non-owner, non-purchased, ~lines 313-321):

```tsx
) : !item.seller.stripeConnectAccountId && item.price > 0 ? (
  <Button className="w-full gap-2" disabled>
    <ShoppingCart className="h-4 w-4" />
    {t("sellerNotConnected")}
  </Button>
) : (
  <Button
    className="w-full gap-2"
    onClick={handlePurchase}
    disabled={isPurchasing || !session?.user}
  >
    {isPurchasing ? (
      <Loader2 className="h-4 w-4 animate-spin" />
    ) : (
      <ShoppingCart className="h-4 w-4" />
    )}
    {isPurchasing ? t("purchasing") : item.price === 0 ? t("getFree") : t("buyNow")}
  </Button>
)
```

- [ ] **Step 5: Handle checkout success/cancelled query params**

Add to the component, after existing state declarations:

```ts
const searchParams = new URLSearchParams(typeof window !== "undefined" ? window.location.search : "");
const checkoutStatus = searchParams.get("checkout");
```

Add a success/cancelled banner at the top of the return JSX (inside the outer div, before the back link):

```tsx
{checkoutStatus === "success" && (
  <div className="mb-4 flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-300">
    <Check className="h-4 w-4 shrink-0" />
    Payment completed. Thank you for your purchase!
  </div>
)}
{checkoutStatus === "cancelled" && (
  <div className="mb-4 rounded-lg border border-border/60 bg-card/50 px-4 py-3 text-sm text-muted-foreground">
    Checkout was cancelled.
  </div>
)}
```

- [ ] **Step 6: Commit**

```bash
git add src/lib/marketplace.ts src/app/[locale]/marketplace/
git commit -m "feat: update marketplace detail page for Stripe Connect checkout"
```

---

### Task 6: Add Connect Setup Banner to Publish Page

**Files:**
- Modify: `src/app/[locale]/marketplace/new/page.tsx`

- [ ] **Step 1: Check Connect status and show banner**

In `src/app/[locale]/marketplace/new/page.tsx`, after getting the session, check if the user has a Connect account:

```ts
const dbUser = await prisma.user.findUnique({
  where: { id: session.user.id },
  select: { stripeConnectAccountId: true },
});
const hasConnect = !!dbUser?.stripeConnectAccountId;
```

Add `import { prisma } from "@/lib/prisma";` at top.

Then add a `ConnectBanner` client component inline or as a separate component. Add it before the `<MarketplaceForm />`:

```tsx
{!hasConnect && <ConnectBanner />}
```

- [ ] **Step 2: Create ConnectBanner client component**

Create a simple client component (can be inline in the page or a separate file):

```tsx
// src/components/marketplace/connect-banner.tsx
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, ExternalLink } from "lucide-react";

export function ConnectBanner() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConnect = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/marketplace/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok || !payload?.data?.url) {
        throw new Error(payload?.error?.message || "Failed to start Connect setup");
      }
      window.location.href = payload.data.url;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
      setLoading(false);
    }
  };

  return (
    <div className="mb-6 rounded-lg border border-amber-500/30 bg-amber-500/5 p-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-medium">Set up Stripe to receive payments</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Connect your Stripe account to sell paid items. Free items can be published without this.
          </p>
          {error && <p className="mt-1 text-sm text-destructive">{error}</p>}
        </div>
        <Button variant="outline" size="sm" onClick={handleConnect} disabled={loading}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ExternalLink className="h-4 w-4" />}
          Connect Stripe
        </Button>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/app/[locale]/marketplace/new/ src/components/marketplace/
git commit -m "feat: add Stripe Connect setup banner on marketplace publish page"
```

---

### Task 7: Add i18n Translation Keys

**Files:**
- Modify: `messages/en.json`
- Modify: `messages/zh.json`

- [ ] **Step 1: Add translation keys**

Add to the `marketplace` namespace in both translation files:

English (`messages/en.json`):
```json
"sellerNotConnected": "Seller has not enabled payments"
```

Chinese (`messages/zh.json`):
```json
"sellerNotConnected": "卖家尚未开通收款"
```

- [ ] **Step 2: Commit**

```bash
git add messages/
git commit -m "feat: add marketplace Stripe Connect translation keys"
```

---

### Task 8: Build and Verify

- [ ] **Step 1: Run build**

```bash
pnpm build
```

Expected: No type errors, no build failures.

- [ ] **Step 2: Manual testing checklist**

1. Create a marketplace item with price > 0
2. Visit `/marketplace/new` — see Connect banner if not connected
3. Click "Connect Stripe" — redirected to Stripe Express onboarding
4. Complete onboarding — redirected back to `/marketplace?connect=success`
5. As a different user, visit the paid item detail page
6. Click "Buy Now" — redirected to Stripe Checkout
7. Complete payment — redirected back with `?checkout=success`
8. Item shows "Purchased" state
9. Free item "Get Free" still works without Stripe

- [ ] **Step 3: Final commit**

```bash
git add -A
git commit -m "feat: marketplace Stripe Connect payment integration"
```
