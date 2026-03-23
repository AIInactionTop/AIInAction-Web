# Marketplace Purchase Display & History

## Overview

Show purchase status on marketplace item detail pages and add a purchase history dashboard to user profiles.

All user-visible strings use next-intl translation keys. Keys are added to both `messages/en.json` and `messages/zh.json` (and content variants if needed).

## Part 1: Marketplace Detail Page — Rich Purchase Card

**Location**: `src/app/[locale]/marketplace/[slug]/marketplace-item-detail.tsx`

Replace the current disabled "Purchased" button in the right sidebar with a rich purchase card:

- Green badge with checkmark icon (translation key: `marketplace.purchased`)
- Purchase date (formatted with locale)
- Price paid (formatted with currency)
- Payment method: translation key `marketplace.paidViaStripe` / `marketplace.freeAcquired`
- Prominent action buttons: `marketplace.viewDemo` / `marketplace.viewSource` (if item has demoUrl/sourceUrl)
- Review form remains accessible below (already exists)

**Data changes**: Modify `getMarketplaceItemBySlug()` in `src/lib/marketplace.ts` to return a `purchaseInfo` object alongside the existing `hasPurchased` boolean. Only expose safe fields — **exclude `stripePaymentIntentId`**.

**TypeScript type** for purchase info passed to client:

```typescript
type PurchaseInfo = {
  price: number;
  currency: string;
  createdAt: string; // ISO date string after JSON serialization
} | null;
```

Add `purchaseInfo: PurchaseInfo` to the `ItemDetail` type in `marketplace-item-detail.tsx`.

## Part 2: User Dropdown Menu

**Location**: `src/components/layout/header.tsx`

Add a menu item with `Receipt` icon (lucide-react) using translation key `common.purchaseHistory`, placed between "Membership" and the separator:

```
Credits           → /credits
Membership        → /membership
Purchase History  → /profile/[userId]/purchases   ← NEW
---
Profile           → /profile/[userId]
Enterprise        → /enterprise
---
Sign Out
```

**Mobile nav**: Add the same link inside the `session?.user` block, after the "Membership" link, using the same translation key and `Receipt` icon.

## Part 3: Purchase History Page

**Route**: `/profile/[id]/purchases` (`src/app/[locale]/profile/[id]/purchases/page.tsx`)

### Summary Cards (top row)

Three horizontal cards (translation keys: `purchases.totalSpent`, `purchases.totalCount`, `purchases.lastPurchase`):
- **Total Spent** — total amount spent, grouped by currency (e.g. "$12.00 USD, ¥50.00 CNY")
- **Total Count** — total number of purchases
- **Last Purchase** — date of most recent purchase

### Purchase List

Each row shows:
- Item thumbnail (small)
- Item title (linked to detail page)
- Type badge (SKILL / TEMPLATE / PRODUCT / SERVICE)
- Price paid (formatted with currency)
- Purchase date
- Link to item detail

Sorted by date descending. Offset-based pagination: `page` + `pageSize` (default 20), matching existing `getMarketplaceItems` pattern.

### Empty State

When user has zero purchases, show an illustration/icon with text (`purchases.empty`) and a CTA button linking to `/marketplace` (`purchases.browseMarketplace`).

### Access Control

Only the authenticated user can view their own purchase history. Other users see `notFound()`.

### Data Layer

**New query** `getUserPurchaseStats(userId)` in `src/lib/marketplace.ts`:

Use Prisma aggregate for efficient server-side computation:

```typescript
// Group by currency for accurate totals
const stats = await prisma.marketplacePurchase.groupBy({
  by: ['currency'],
  where: { userId },
  _sum: { price: true },
  _count: true,
});
const lastPurchase = await prisma.marketplacePurchase.findFirst({
  where: { userId },
  orderBy: { createdAt: 'desc' },
  select: { createdAt: true },
});
```

Returns: `{ totals: { currency: string; amount: number; count: number }[], lastPurchaseDate: Date | null }`

**Enhance** `getUserPurchases(userId, page = 1, pageSize = 20)` in `src/lib/marketplace.ts`:
- Include related item fields: `title`, `slug`, `imageUrl`, `type`
- Return `price`, `currency`, `createdAt` per purchase
- Offset-based pagination with `skip` / `take`
- Return `{ purchases, total }` for pagination UI

## i18n Keys

Add to `messages/en.json` and `messages/zh.json`:

| Key | EN | ZH |
|-----|----|----|
| `marketplace.purchased` | Purchased | 已购买 |
| `marketplace.paidViaStripe` | Paid via Stripe | 通过 Stripe 支付 |
| `marketplace.freeAcquired` | Free | 免费获取 |
| `marketplace.viewDemo` | View Demo | 查看 Demo |
| `marketplace.viewSource` | View Source | 查看源码 |
| `common.purchaseHistory` | Purchase History | 消费记录 |
| `purchases.title` | Purchase History | 消费记录 |
| `purchases.totalSpent` | Total Spent | 总消费 |
| `purchases.totalCount` | Purchases | 购买数量 |
| `purchases.lastPurchase` | Last Purchase | 最近购买 |
| `purchases.empty` | No purchases yet | 暂无消费记录 |
| `purchases.browseMarketplace` | Browse Marketplace | 浏览市场 |

## Files to Create/Modify

| File | Action |
|------|--------|
| `src/lib/marketplace.ts` | Modify `getMarketplaceItemBySlug` to return `purchaseInfo` (without stripePaymentIntentId); add `getUserPurchaseStats`; enhance `getUserPurchases` with pagination and item includes |
| `src/app/[locale]/marketplace/[slug]/marketplace-item-detail.tsx` | Add `PurchaseInfo` type; replace disabled button with rich purchase card |
| `src/components/layout/header.tsx` | Add purchase history link to dropdown and mobile nav |
| `src/app/[locale]/profile/[id]/purchases/page.tsx` | New page: server component with auth check |
| `src/app/[locale]/profile/[id]/purchases/purchase-history.tsx` | New client component: summary cards + purchase list + empty state |
| `messages/en.json` | Add marketplace/purchases translation keys |
| `messages/zh.json` | Add marketplace/purchases translation keys |

## No Schema Changes

The existing `MarketplacePurchase` model already has all needed fields (price, currency, createdAt, stripePaymentIntentId). No migration required.
