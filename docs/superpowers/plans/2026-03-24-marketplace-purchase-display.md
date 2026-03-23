# Marketplace Purchase Display & History Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show rich purchase info on marketplace detail pages and add a purchase history dashboard to user profiles.

**Architecture:** Extend existing `getMarketplaceItemBySlug` to return purchase details (excluding sensitive Stripe IDs). Add `getUserPurchaseStats` using Prisma aggregate. Create a new `/profile/[id]/purchases` page following the existing profile page pattern (server component + client component). Add dropdown menu entry.

**Tech Stack:** Next.js 16 (App Router), Prisma, next-intl, shadcn/ui, lucide-react, Tailwind CSS v4

---

## File Structure

| File | Action | Responsibility |
|------|--------|----------------|
| `messages/en.json` | Modify | Add marketplace + purchases i18n keys |
| `messages/zh.json` | Modify | Add marketplace + purchases i18n keys |
| `src/lib/marketplace.ts` | Modify | Return purchaseInfo from slug query; add `getUserPurchaseStats`; enhance `getUserPurchases` with pagination |
| `src/app/[locale]/marketplace/[slug]/marketplace-item-detail.tsx` | Modify | Add `PurchaseInfo` type; replace disabled button with rich purchase card |
| `src/app/[locale]/marketplace/[slug]/page.tsx` | Modify | Pass `purchaseInfo` to client component |
| `src/components/layout/header.tsx` | Modify | Add "Purchase History" link to dropdown + mobile nav |
| `src/app/[locale]/profile/[id]/purchases/page.tsx` | Create | Server component: auth check, data fetch |
| `src/app/[locale]/profile/[id]/purchases/purchase-history.tsx` | Create | Client component: summary cards + purchase list + empty state |

---

### Task 1: Add i18n translation keys

**Files:**
- Modify: `messages/en.json:650-656` (marketplace section)
- Modify: `messages/zh.json` (corresponding marketplace section)

- [ ] **Step 1: Add English marketplace purchase keys**

In `messages/en.json`, within the `"marketplace"` object, after `"viewSource"`, add:

```json
"purchasedOn": "Purchased on {date}",
"pricePaid": "Price Paid",
"paymentMethod": "Payment Method",
"paidViaStripe": "Paid via Stripe",
"freeAcquired": "Free"
```

- [ ] **Step 2: Add English purchases page keys**

In `messages/en.json`, add a new top-level `"purchases"` object after `"marketplace"`:

```json
"purchases": {
  "title": "Purchase History",
  "totalSpent": "Total Spent",
  "totalCount": "Purchases",
  "lastPurchase": "Last Purchase",
  "noPurchases": "Never",
  "empty": "No purchases yet",
  "browseMarketplace": "Browse Marketplace",
  "page": "Page {current} of {total}"
}
```

- [ ] **Step 3: Add English common key**

In `messages/en.json`, within the `"common"` object, add:

```json
"purchaseHistory": "Purchase History"
```

- [ ] **Step 4: Add corresponding Chinese translations**

In `messages/zh.json`, add the same keys:

marketplace section:
```json
"purchasedOn": "购买于 {date}",
"pricePaid": "支付金额",
"paymentMethod": "支付方式",
"paidViaStripe": "通过 Stripe 支付",
"freeAcquired": "免费获取"
```

purchases section:
```json
"purchases": {
  "title": "消费记录",
  "totalSpent": "总消费",
  "totalCount": "购买数量",
  "lastPurchase": "最近购买",
  "noPurchases": "暂无",
  "empty": "暂无消费记录",
  "browseMarketplace": "浏览市场",
  "page": "第 {current} 页，共 {total} 页"
}
```

common section:
```json
"purchaseHistory": "消费记录"
```

- [ ] **Step 5: Commit**

```bash
git add messages/en.json messages/zh.json
git commit -m "feat(marketplace): add i18n keys for purchase display and history"
```

---

### Task 2: Extend data layer in `src/lib/marketplace.ts`

**Files:**
- Modify: `src/lib/marketplace.ts:103-134` (`getMarketplaceItemBySlug`)
- Modify: `src/lib/marketplace.ts:158-170` (`getUserPurchases`)

- [ ] **Step 1: Modify `getMarketplaceItemBySlug` to return purchase info**

In `src/lib/marketplace.ts`, change the purchase query (lines 121-124) to select specific fields instead of returning the whole record. Replace:

```typescript
      prisma.marketplacePurchase.findUnique({
        where: { userId_itemId: { userId, itemId: item.id } },
      }),
```

With:

```typescript
      prisma.marketplacePurchase.findUnique({
        where: { userId_itemId: { userId, itemId: item.id } },
        select: { price: true, currency: true, createdAt: true },
      }),
```

Then change the return (lines 129-133) from:

```typescript
    hasPurchased = !!purchase;
    userReview = review;
  }

  return { ...item, hasPurchased, userReview };
```

To:

```typescript
    hasPurchased = !!purchase;
    purchaseInfo = purchase;
    userReview = review;
  }

  return { ...item, hasPurchased, purchaseInfo, userReview };
```

Also declare `let purchaseInfo: { price: number; currency: string; createdAt: Date } | null = null;` alongside the existing `hasPurchased` and `userReview` variables.

- [ ] **Step 2: Add `getUserPurchaseStats` function**

Add after `getUserPurchases`:

```typescript
export async function getUserPurchaseStats(userId: string) {
  const [currencyTotals, lastPurchase] = await Promise.all([
    prisma.marketplacePurchase.groupBy({
      by: ["currency"],
      where: { userId },
      _sum: { price: true },
      _count: true,
    }),
    prisma.marketplacePurchase.findFirst({
      where: { userId },
      orderBy: { createdAt: "desc" },
      select: { createdAt: true },
    }),
  ]);

  const totalCount = currencyTotals.reduce((sum, g) => sum + g._count, 0);

  return {
    totals: currencyTotals.map((g) => ({
      currency: g.currency,
      amount: g._sum.price || 0,
      count: g._count,
    })),
    totalCount,
    lastPurchaseDate: lastPurchase?.createdAt || null,
  };
}
```

- [ ] **Step 3: Enhance `getUserPurchases` with pagination and item details**

Replace the existing `getUserPurchases` function (lines 158-170):

```typescript
export async function getUserPurchases(userId: string, page = 1, pageSize = 20) {
  const where = { userId };
  const [purchases, total] = await Promise.all([
    prisma.marketplacePurchase.findMany({
      where,
      include: {
        item: {
          select: {
            title: true,
            slug: true,
            imageUrl: true,
            type: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.marketplacePurchase.count({ where }),
  ]);

  return { purchases, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
}
```

- [ ] **Step 4: Verify build**

Run: `pnpm build`
Expected: Compiles without errors (no consumers use the new return shape yet).

- [ ] **Step 5: Commit**

```bash
git add src/lib/marketplace.ts
git commit -m "feat(marketplace): extend data layer with purchase info and stats"
```

---

### Task 3: Rich purchase card on marketplace detail page

**Files:**
- Modify: `src/app/[locale]/marketplace/[slug]/page.tsx:28-35`
- Modify: `src/app/[locale]/marketplace/[slug]/marketplace-item-detail.tsx:27-51,350-354`

- [ ] **Step 1: Update server page to pass purchaseInfo**

In `src/app/[locale]/marketplace/[slug]/page.tsx`, the `MarketplaceItemDetail` component already receives `item` which now includes `purchaseInfo` from the data layer change. No code change needed here — it's already serialized via `JSON.parse(JSON.stringify(item))`.

- [ ] **Step 2: Update `ItemDetail` type**

In `marketplace-item-detail.tsx`, add `purchaseInfo` to the `ItemDetail` type (after line 47):

```typescript
  purchaseInfo: { price: number; currency: string; createdAt: string } | null;
```

- [ ] **Step 3: Import `CalendarDays` and `CreditCard` icons**

In the lucide-react import (line 8), add `CalendarDays` and `CreditCard`:

```typescript
import {
  Star, ExternalLink, ShoppingCart, Check, Trash2, Pencil,
  Sparkles, FileCode, Package, Wrench, ArrowLeft, Loader2,
  CalendarDays, CreditCard,
} from "lucide-react";
```

- [ ] **Step 4: Replace disabled "Purchased" button with rich purchase card**

Replace lines 350-354 (the `item.hasPurchased` branch):

```typescript
              ) : item.hasPurchased ? (
                <Button className="w-full gap-2" disabled>
                  <Check className="h-4 w-4" />
                  {t("purchased")}
                </Button>
```

With a rich purchase card (with fallback for missing purchaseInfo):

```typescript
              ) : item.hasPurchased ? (
                item.purchaseInfo ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm font-medium text-emerald-700 dark:text-emerald-300">
                      <Check className="h-4 w-4 shrink-0" />
                      {t("purchased")}
                    </div>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-1.5 text-muted-foreground">
                          <CalendarDays className="h-3.5 w-3.5" />
                          {t("purchasedOn", { date: new Date(item.purchaseInfo.createdAt).toLocaleDateString() })}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">{t("pricePaid")}</span>
                        <span className="font-medium">{formatPrice(item.purchaseInfo.price, item.purchaseInfo.currency)}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">{t("paymentMethod")}</span>
                        <span className="flex items-center gap-1.5 font-medium">
                          <CreditCard className="h-3.5 w-3.5" />
                          {item.purchaseInfo.price > 0 ? t("paidViaStripe") : t("freeAcquired")}
                        </span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <Button className="w-full gap-2" disabled>
                    <Check className="h-4 w-4" />
                    {t("purchased")}
                  </Button>
                )
```

**Note:** The demo/source buttons are NOT included in the rich card because they already render in the existing sidebar section below (lines 375-403). No duplication.

- [ ] **Step 5: Verify build**

Run: `pnpm build`
Expected: Compiles without errors.

- [ ] **Step 6: Commit**

```bash
git add src/app/[locale]/marketplace/[slug]/marketplace-item-detail.tsx
git commit -m "feat(marketplace): show rich purchase card on detail page"
```

---

### Task 4: Add "Purchase History" to user dropdown menu

**Files:**
- Modify: `src/components/layout/header.tsx:6,196-197,331-332`

- [ ] **Step 1: Import `Receipt` icon**

In `header.tsx` line 6, add `Receipt` to the lucide-react import:

```typescript
import { Menu, X, Github, Moon, Sun, Zap, Plus, ChevronDown, Building2, Coins, Crown, UserCircle, LogOut, Receipt } from "lucide-react";
```

- [ ] **Step 2: Add dropdown menu item**

After the Membership `DropdownMenuItem` (line 196) and before the `DropdownMenuSeparator` (line 197), add:

```typescript
                <DropdownMenuItem asChild>
                  <Link href={`/profile/${session.user.id}/purchases` as never}>
                    <Receipt className="mr-2 h-4 w-4" />
                    {tc("purchaseHistory")}
                  </Link>
                </DropdownMenuItem>
```

- [ ] **Step 3: Add mobile nav link**

After the Membership link in mobile nav (around line 332), add:

```typescript
                  <Link
                    href={`/profile/${session.user.id}/purchases` as never}
                    onClick={() => setMobileOpen(false)}
                    className="flex items-center rounded-md px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
                  >
                    <Receipt className="mr-2 h-4 w-4" />
                    {tc("purchaseHistory")}
                  </Link>
```

- [ ] **Step 4: Verify build**

Run: `pnpm build`
Expected: Compiles without errors.

- [ ] **Step 5: Commit**

```bash
git add src/components/layout/header.tsx
git commit -m "feat(marketplace): add purchase history link to user dropdown"
```

---

### Task 5: Create purchase history page

**Files:**
- Create: `src/app/[locale]/profile/[id]/purchases/page.tsx`
- Create: `src/app/[locale]/profile/[id]/purchases/purchase-history.tsx`

- [ ] **Step 1: Create server page component**

Create `src/app/[locale]/profile/[id]/purchases/page.tsx`:

```typescript
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { auth } from "@/lib/auth";
import { getUserPurchases, getUserPurchaseStats } from "@/lib/marketplace";
import { PurchaseHistory } from "./purchase-history";
import { getTranslations, setRequestLocale } from "next-intl/server";

type Props = {
  params: Promise<{ id: string; locale: string }>;
  searchParams: Promise<{ page?: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "purchases" });
  return { title: t("title") };
}

export default async function PurchasesPage({ params, searchParams }: Props) {
  const { id, locale } = await params;
  const { page } = await searchParams;
  setRequestLocale(locale);

  const session = await auth();
  if (!session?.user?.id || session.user.id !== id) {
    notFound();
  }

  const currentPage = Math.max(1, parseInt(page || "1", 10) || 1);
  const [purchaseData, stats] = await Promise.all([
    getUserPurchases(id, currentPage),
    getUserPurchaseStats(id),
  ]);

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 sm:py-16 lg:px-8">
      <PurchaseHistory
        purchases={JSON.parse(JSON.stringify(purchaseData.purchases))}
        total={purchaseData.total}
        page={purchaseData.page}
        totalPages={purchaseData.totalPages}
        stats={JSON.parse(JSON.stringify(stats))}
      />
    </div>
  );
}
```

- [ ] **Step 2: Create client component**

Create `src/app/[locale]/profile/[id]/purchases/purchase-history.tsx`:

```typescript
"use client";

import Image from "next/image";
import { Link } from "@/i18n/navigation";
import { ShoppingBag, Package, ArrowLeft, ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useTranslations, useLocale } from "next-intl";
import { useRouter, useSearchParams } from "next/navigation";

type Purchase = {
  id: string;
  price: number;
  currency: string;
  createdAt: string;
  item: {
    title: string;
    slug: string;
    imageUrl: string | null;
    type: string;
  };
};

type Stats = {
  totals: { currency: string; amount: number; count: number }[];
  totalCount: number;
  lastPurchaseDate: string | null;
};

const typeColors: Record<string, string> = {
  SKILL: "bg-violet-500/10 text-violet-600 dark:text-violet-400",
  TEMPLATE: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  PRODUCT: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  SERVICE: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
};

function formatPrice(price: number, currency: string, locale: string) {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: currency.toUpperCase(),
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(price / 100);
}

export function PurchaseHistory({
  purchases,
  total,
  page,
  totalPages,
  stats,
}: {
  purchases: Purchase[];
  total: number;
  page: number;
  totalPages: number;
  stats: Stats;
}) {
  const t = useTranslations("purchases");
  const tc = useTranslations("common");
  const tm = useTranslations("marketplace");
  const locale = useLocale();
  const router = useRouter();
  const searchParams = useSearchParams();

  const goToPage = (p: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", String(p));
    router.push(`?${params.toString()}`);
  };

  if (stats.totalCount === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <ShoppingBag className="h-16 w-16 text-muted-foreground/30 mb-4" />
        <h1 className="text-2xl font-bold mb-2">{t("title")}</h1>
        <p className="text-muted-foreground mb-6">{t("empty")}</p>
        <Button asChild>
          <Link href="/marketplace">{t("browseMarketplace")}</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1>

      {/* Summary cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border p-5">
          <p className="text-sm text-muted-foreground">{t("totalSpent")}</p>
          <div className="mt-1 space-y-0.5">
            {stats.totals.map((g) => (
              <p key={g.currency} className="text-2xl font-bold">
                {formatPrice(g.amount, g.currency, locale)}
              </p>
            ))}
            {stats.totals.length === 0 && (
              <p className="text-2xl font-bold">$0</p>
            )}
          </div>
        </div>
        <div className="rounded-xl border p-5">
          <p className="text-sm text-muted-foreground">{t("totalCount")}</p>
          <p className="mt-1 text-2xl font-bold">{stats.totalCount}</p>
        </div>
        <div className="rounded-xl border p-5">
          <p className="text-sm text-muted-foreground">{t("lastPurchase")}</p>
          <p className="mt-1 text-2xl font-bold">
            {stats.lastPurchaseDate
              ? new Date(stats.lastPurchaseDate).toLocaleDateString(locale)
              : t("noPurchases")}
          </p>
        </div>
      </div>

      {/* Purchase list */}
      <div className="space-y-3">
        {purchases.map((purchase) => (
          <Link
            key={purchase.id}
            href={`/marketplace/${purchase.item.slug}` as never}
            className="flex items-center gap-4 rounded-xl border p-4 transition-colors hover:bg-accent/50"
          >
            <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-muted">
              {purchase.item.imageUrl ? (
                <Image
                  src={purchase.item.imageUrl}
                  alt={purchase.item.title}
                  fill
                  className="object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center">
                  <Package className="h-6 w-6 text-muted-foreground/50" />
                </div>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-medium truncate">{purchase.item.title}</p>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="secondary" className={`text-xs ${typeColors[purchase.item.type] || ""}`}>
                  {tm(`type${purchase.item.type.charAt(0)}${purchase.item.type.slice(1).toLowerCase()}`)}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {new Date(purchase.createdAt).toLocaleDateString(locale)}
                </span>
              </div>
            </div>
            <div className="text-right shrink-0">
              <p className="font-semibold">{formatPrice(purchase.price, purchase.currency, locale)}</p>
            </div>
          </Link>
        ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => goToPage(page - 1)}
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            {tc("prev")}
          </Button>
          <span className="text-sm text-muted-foreground">
            {t("page", { current: page, total: totalPages })}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => goToPage(page + 1)}
          >
            {tc("next")}
            <ArrowRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Verify build**

Run: `pnpm build`
Expected: Compiles without errors.

- [ ] **Step 4: Commit**

```bash
git add src/app/[locale]/profile/[id]/purchases/
git commit -m "feat(marketplace): add purchase history page with dashboard"
```

---

### Task 6: Final verification

- [ ] **Step 1: Full build check**

Run: `pnpm build`
Expected: Clean build with no errors.

- [ ] **Step 2: Lint check**

Run: `pnpm lint`
Expected: No new lint errors.

- [ ] **Step 3: Manual smoke test checklist**

Verify:
1. Marketplace detail page shows rich purchase card for purchased items
2. Marketplace detail page shows buy button for non-purchased items (unchanged)
3. User dropdown shows "Purchase History" / "消费记录" link
4. Mobile nav shows the same link
5. `/profile/[id]/purchases` shows summary cards and purchase list
6. `/profile/[id]/purchases` shows empty state when no purchases
7. Accessing another user's purchase history returns 404
