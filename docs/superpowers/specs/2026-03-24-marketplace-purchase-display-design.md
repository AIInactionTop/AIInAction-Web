# Marketplace Purchase Display & History

## Overview

Show purchase status on marketplace item detail pages and add a purchase history dashboard to user profiles.

## Part 1: Marketplace Detail Page — Rich Purchase Card

**Location**: `src/app/[locale]/marketplace/[slug]/marketplace-item-detail.tsx`

Replace the current disabled "Purchased" button in the right sidebar with a rich purchase card:

- Green "已购买" badge with checkmark icon
- Purchase date (formatted)
- Price paid (formatted with currency)
- Payment method: "Stripe" for paid items, "免费获取" for free items
- Prominent action buttons: "查看Demo" / "查看源码" (if item has demoUrl/sourceUrl)
- Review form remains accessible below (already exists)

**Data changes**: Modify `getMarketplaceItemBySlug()` in `src/lib/marketplace.ts` to return the full `MarketplacePurchase` record (price, currency, createdAt, stripePaymentIntentId) alongside the existing `hasPurchased` boolean. Pass this to the client component.

## Part 2: User Dropdown Menu

**Location**: `src/components/layout/header.tsx`

Add "消费记录" menu item with `Receipt` icon (lucide-react) between "Membership" and the separator:

```
Credits        → /credits
Membership     → /membership
消费记录        → /profile/[userId]/purchases
---
Profile        → /profile/[userId]
Enterprise     → /enterprise
---
Sign Out
```

Also add the same link in the mobile navigation menu.

## Part 3: Purchase History Page

**Route**: `/profile/[id]/purchases` (`src/app/[locale]/profile/[id]/purchases/page.tsx`)

### Summary Cards (top row)

Three horizontal cards:
- **总消费** — total amount spent across all purchases
- **购买数量** — total number of purchases
- **最近购买** — date of most recent purchase

### Purchase List

Each row shows:
- Item thumbnail (small)
- Item title (linked to detail page)
- Type badge (SKILL / TEMPLATE / PRODUCT / SERVICE)
- Price paid (formatted with currency)
- Purchase date
- Link to item detail

Sorted by date descending. Paginated if needed.

### Access Control

Only the authenticated user can view their own purchase history. Other users see 404/redirect.

### Data Layer

**New query** `getUserPurchaseStats(userId)` in `src/lib/marketplace.ts`:
- Returns: `{ totalSpent, purchaseCount, lastPurchaseDate }`

**Enhance** `getUserPurchases(userId)` in `src/lib/marketplace.ts`:
- Include related item fields: title, slug, imageUrl, type
- Return price, currency, createdAt per purchase
- Paginated

## Files to Create/Modify

| File | Action |
|------|--------|
| `src/lib/marketplace.ts` | Modify `getMarketplaceItemBySlug` to return purchase record; add `getUserPurchaseStats`; enhance `getUserPurchases` |
| `src/app/[locale]/marketplace/[slug]/marketplace-item-detail.tsx` | Replace disabled button with rich purchase card |
| `src/components/layout/header.tsx` | Add "消费记录" to dropdown and mobile nav |
| `src/app/[locale]/profile/[id]/purchases/page.tsx` | New page: server component with auth check |
| `src/app/[locale]/profile/[id]/purchases/purchase-history.tsx` | New client component: summary cards + purchase list |

## No Schema Changes

The existing `MarketplacePurchase` model already has all needed fields (price, currency, createdAt, stripePaymentIntentId). No migration required.
