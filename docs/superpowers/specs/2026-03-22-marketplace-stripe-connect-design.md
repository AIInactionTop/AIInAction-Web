# Marketplace Stripe Connect Payment Design

**Date:** 2026-03-22
**Status:** Approved

## Overview

Add real payment processing to the marketplace using Stripe Connect Express. Sellers register Connect accounts to receive payments. Buyers pay via Stripe Checkout. The platform takes a 10% commission on each sale. Free items (price = 0) bypass Stripe and use the existing direct-purchase flow.

## Decisions

| Decision | Choice | Reason |
|----------|--------|--------|
| Connect account type | Express | Simplified onboarding, platform manages experience |
| Platform commission | 10% | Fixed rate via `application_fee_amount` |
| Free items | Direct purchase (no Stripe) | No payment needed, keep existing behavior |

## Schema Changes

### User table

Add one field:

```prisma
stripeConnectAccountId String? @unique @map("stripe_connect_account_id")
```

### MarketplacePurchase table

Add one field to track the Stripe payment:

```prisma
stripePaymentIntentId String? @unique @map("stripe_payment_intent_id")
```

## Seller Onboarding Flow

1. Seller clicks "Connect with Stripe" (shown on marketplace publish page or profile)
2. `POST /api/marketplace/connect` creates an Express account via `stripe.accounts.create({ type: 'express' })`, stores the account ID on the User, and returns an Account Link URL
3. Seller is redirected to Stripe's hosted onboarding form
4. On completion, Stripe redirects to `GET /api/marketplace/connect/return`
5. Return page checks `account.charges_enabled` and shows status
6. If seller abandons onboarding midway, `GET /api/marketplace/connect/refresh` generates a new Account Link

### Connect status rules

- Seller can publish items at any time (including without Connect)
- Paid items from sellers without a completed Connect account show "Seller has not enabled payments" instead of "Buy Now"
- Free items are unaffected by Connect status

## Purchase Flow (Paid Items)

1. Buyer clicks "Buy Now" on a paid item
2. Client calls `POST /api/marketplace/checkout` with `{ itemId, successUrl, cancelUrl }`
3. Server validates:
   - Item exists and is PUBLISHED
   - Buyer is not the seller
   - Buyer has not already purchased
   - Seller has a `stripeConnectAccountId` with `charges_enabled`
4. Server creates a Stripe Checkout Session:
   ```ts
   stripe.checkout.sessions.create({
     mode: 'payment',
     line_items: [{
       price_data: {
         currency: item.currency,
         product_data: { name: item.title },
         unit_amount: item.price, // already in cents
       },
       quantity: 1,
     }],
     payment_intent_data: {
       application_fee_amount: Math.ceil(item.price * 0.1), // 10% platform fee
       transfer_data: {
         destination: seller.stripeConnectAccountId,
       },
     },
     metadata: {
       marketplacePurchase: 'true',
       itemId: item.id,
       buyerId: buyer.id,
       sellerId: seller.id,
     },
     success_url: successUrl,
     cancel_url: cancelUrl,
   })
   ```
5. Client redirects buyer to Stripe Checkout
6. After payment, Stripe sends `checkout.session.completed` webhook

## Purchase Flow (Free Items)

No change. The existing `purchaseMarketplaceItem` server action continues to handle free items directly (create `MarketplacePurchase` record, increment `salesCount`).

## Webhook Handling

Extend the existing `processStripeWebhook` in `src/lib/billing/service.ts`:

- When `checkout.session.completed` fires and `metadata.marketplacePurchase === 'true'`:
  1. Check idempotency (no duplicate purchase for same user+item)
  2. Create `MarketplacePurchase` record with `stripePaymentIntentId`
  3. Increment item's `salesCount`
  4. Record the webhook event as PROCESSED

This reuses the existing webhook route and event deduplication infrastructure.

## New API Routes

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/marketplace/connect` | POST | Create Express account + return onboarding URL |
| `/api/marketplace/connect/refresh` | GET | Regenerate onboarding link |
| `/api/marketplace/connect/return` | GET | Post-onboarding redirect page |
| `/api/marketplace/checkout` | POST | Create Checkout Session for marketplace item |

## UI Changes

### Item detail page (`marketplace-item-detail.tsx`)

- **Paid item, seller has Connect:** "Buy Now" redirects to Stripe Checkout
- **Paid item, seller lacks Connect:** Show disabled button with "Seller has not enabled payments"
- **Free item:** "Get Free" works as before (direct purchase)
- **Already purchased:** Show disabled "Purchased" button (no change)
- **After successful checkout redirect:** Show success message, refresh purchase status

### Seller Connect status

- On `/marketplace/new` (publish page): if seller has no Connect account, show a banner prompting Stripe Connect setup
- On item detail page (own item): show Connect status indicator
- Connect status UI is minimal — a banner or badge, not a full page

## Files to Create/Modify

### New files
- `src/app/api/marketplace/connect/route.ts` — POST: create Connect account
- `src/app/api/marketplace/connect/refresh/route.ts` — GET: refresh onboarding link
- `src/app/api/marketplace/connect/return/route.ts` — GET: return page after onboarding
- `src/app/api/marketplace/checkout/route.ts` — POST: create Checkout Session

### Modified files
- `prisma/schema.prisma` — add fields to User and MarketplacePurchase
- `src/lib/billing/service.ts` — extend webhook handler for marketplace purchases
- `src/app/[locale]/marketplace/[slug]/marketplace-item-detail.tsx` — update Buy Now to use Stripe Checkout, handle Connect status
- `src/app/[locale]/marketplace/new/page.tsx` — add Connect setup banner
- `src/actions/marketplace.ts` — keep `purchaseMarketplaceItem` for free items only

## Error Handling

- Seller Connect account not ready: surface clear message on item detail page
- Stripe Checkout creation fails: show error toast, do not create purchase record
- Webhook fails: error logged, webhook event marked FAILED, no purchase record created (buyer can contact support)
- Duplicate purchase attempt: idempotent — return existing purchase

## Out of Scope

- Seller dashboard / earnings page
- Refunds
- Subscription-based marketplace items
- Admin marketplace management
