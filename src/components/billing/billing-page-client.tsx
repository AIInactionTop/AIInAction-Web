"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { signIn, useSession } from "next-auth/react";
import { CheckCircle2, Coins, Crown, Loader2, RefreshCcw } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckoutButton } from "@/components/billing/checkout-button";
import { BalanceOverview } from "@/components/billing/balance-overview";
import { useCredits } from "@/components/billing/credits-provider";

type CreditAmount = {
  microcredits: string;
  credits: string;
};

type Product = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  type: "TOP_UP" | "MEMBERSHIP";
  billingInterval: "ONE_TIME" | "MONTH" | "YEAR";
  currency: string;
  unitAmount: number;
  active: boolean;
  sortOrder: number;
  stripeProductId: string | null;
  stripePriceId: string | null;
  baseCredits: CreditAmount;
  bonusCredits: CreditAmount;
  totalCredits: CreditAmount;
  metadata: unknown;
};

type PricingRule = {
  id: string;
  provider: string;
  model: string;
  displayName: string | null;
  active: boolean;
  rates: {
    prompt: CreditAmount;
    completion: CreditAmount;
    cacheWrite: CreditAmount;
    cacheRead: CreditAmount;
    minimumCharge: CreditAmount;
    unit: string;
  };
  metadata: unknown;
};

function formatPrice(unitAmount: number, currency: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(unitAmount / 100);
}

// ---------------------
// Flexible Amount Selector (for top-up)
// ---------------------

const PRESET_AMOUNTS = [20, 50, 100, 500] as const;
const SERVICE_FEE_RATE = 0.055;
const MIN_AMOUNT = 5;
const MAX_AMOUNT = 10000;
const DEFAULT_AMOUNT = 100;

function AmountSelector() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [amount, setAmount] = useState(DEFAULT_AMOUNT);
  const [isCustom, setIsCustom] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const serviceFee = Math.ceil(amount * SERVICE_FEE_RATE * 100) / 100;
  const total = Math.ceil((amount + serviceFee) * 100) / 100;

  const handlePreset = useCallback((value: number) => {
    setAmount(value);
    setIsCustom(false);
    setError(null);
  }, []);

  const handleCustom = useCallback(() => {
    setIsCustom(true);
    setError(null);
    setTimeout(() => inputRef.current?.focus(), 0);
  }, []);

  const handleCustomInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/[^0-9]/g, "");
    const value = parseInt(raw, 10);
    if (isNaN(value)) {
      setAmount(0);
    } else {
      setAmount(Math.min(value, MAX_AMOUNT));
    }
  }, []);

  const handleCheckout = async () => {
    if (!session?.user) {
      await signIn("github", { callbackUrl: pathname });
      return;
    }

    if (amount < MIN_AMOUNT) {
      setError(`Minimum amount is $${MIN_AMOUNT}`);
      return;
    }
    if (amount > MAX_AMOUNT) {
      setError(`Maximum amount is $${MAX_AMOUNT.toLocaleString()}`);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/billing/stripe/checkout-custom", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount,
          successUrl: `${pathname}?checkout=success`,
          cancelUrl: `${pathname}?checkout=cancelled`,
        }),
      });

      const payload = (await response.json().catch(() => null)) as
        | { data?: { url?: string | null }; error?: { message?: string } }
        | null;

      if (!response.ok || !payload?.data?.url) {
        throw new Error(payload?.error?.message || "Failed to create checkout");
      }

      window.location.href = payload.data.url;
    } catch (checkoutError) {
      setError(
        checkoutError instanceof Error
          ? checkoutError.message
          : "Failed to create checkout"
      );
      setLoading(false);
    }
  };

  const isValidAmount = amount >= MIN_AMOUNT && amount <= MAX_AMOUNT;

  return (
    <Card className="mx-auto w-full max-w-lg">
      <CardHeader>
        <CardTitle className="text-2xl">Buy AI Credits</CardTitle>
        <CardDescription>
          Purchase credits for AI Studio usage. $1 = 1 credit.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-8">
        {/* Large price display */}
        <div className="text-center">
          <p className="text-6xl font-bold tracking-tight sm:text-7xl">
            US${amount.toLocaleString()}.00
          </p>
        </div>

        {/* Preset buttons */}
        <div className="flex flex-wrap items-center justify-center gap-3">
          {PRESET_AMOUNTS.map((preset) => (
            <button
              key={preset}
              onClick={() => handlePreset(preset)}
              className={`rounded-lg border px-5 py-2.5 text-sm font-medium transition-colors ${
                !isCustom && amount === preset
                  ? "border-foreground bg-foreground text-background"
                  : "border-border bg-background hover:bg-accent"
              }`}
            >
              ${preset}
            </button>
          ))}
          {isCustom ? (
            <div className="flex items-center rounded-lg border border-foreground bg-foreground px-3 py-1.5">
              <span className="text-sm font-medium text-background">$</span>
              <input
                ref={inputRef}
                type="text"
                inputMode="numeric"
                value={amount || ""}
                onChange={handleCustomInput}
                className="w-20 bg-transparent text-center text-sm font-medium text-background outline-none placeholder:text-background/50"
                placeholder="0"
              />
            </div>
          ) : (
            <button
              onClick={handleCustom}
              className="rounded-lg border border-border bg-background px-5 py-2.5 text-sm font-medium transition-colors hover:bg-accent"
            >
              Custom
            </button>
          )}
        </div>

        {/* Fee breakdown */}
        {isValidAmount && (
          <div className="rounded-lg border border-border/60 bg-muted/30 p-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Credits</span>
              <span className="font-medium">${amount.toLocaleString()}.00</span>
            </div>
            <div className="mt-2 flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Service fee (5.5%)</span>
              <span className="font-medium">${serviceFee.toFixed(2)}</span>
            </div>
            <div className="mt-3 flex items-center justify-between border-t border-border/60 pt-3">
              <span className="font-semibold">Total</span>
              <span className="text-lg font-bold">${total.toFixed(2)}</span>
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <p className="text-center text-sm text-destructive">{error}</p>
        )}

        {/* Actions */}
        <div className="flex items-center justify-between border-t border-border/60 pt-6">
          <Button
            variant="outline"
            onClick={() => {
              setAmount(DEFAULT_AMOUNT);
              setIsCustom(false);
              setError(null);
            }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleCheckout}
            disabled={loading || !isValidAmount}
            className="bg-foreground text-background hover:bg-foreground/90"
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {session?.user ? "Continue to Payment" : "Sign in to Purchase"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ---------------------
// Product Card (for membership)
// ---------------------

function ProductCard({
  product,
  ctaLabel,
  accent,
}: {
  product: Product;
  ctaLabel: string;
  accent: "amber" | "violet";
}) {
  const accentClasses =
    accent === "amber"
      ? "border-amber-500/30 bg-amber-500/5"
      : "border-violet-500/30 bg-violet-500/5";

  return (
    <Card className={accentClasses}>
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="text-xl">{product.name}</CardTitle>
            <CardDescription className="mt-2">
              {product.description || "Flexible credits for AI usage."}
            </CardDescription>
          </div>
          <Badge variant="secondary">
            {product.billingInterval === "MONTH"
              ? "Monthly"
              : product.billingInterval === "YEAR"
                ? "Yearly"
                : "One-time"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        <div>
          <div className="text-3xl font-bold">
            {formatPrice(product.unitAmount, product.currency)}
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {product.billingInterval === "MONTH"
              ? "Charged every month"
              : product.billingInterval === "YEAR"
                ? "Charged every year"
                : "Pay once and use anytime"}
          </p>
        </div>

        <div className="rounded-lg border border-border/60 bg-background/70 p-4">
          <div className="flex items-center justify-between gap-3 text-sm">
            <span className="text-muted-foreground">Base credits</span>
            <span className="font-medium">{product.baseCredits.credits}</span>
          </div>
          <div className="mt-2 flex items-center justify-between gap-3 text-sm">
            <span className="text-muted-foreground">Bonus credits</span>
            <span className="font-medium">{product.bonusCredits.credits}</span>
          </div>
          <div className="mt-3 flex items-center justify-between gap-3 border-t border-border/60 pt-3">
            <span className="font-medium">Total granted</span>
            <span className="text-lg font-semibold">
              {product.totalCredits.credits} credits
            </span>
          </div>
        </div>

        <CheckoutButton productId={product.id} label={ctaLabel} />
      </CardContent>
    </Card>
  );
}

// ---------------------
// Shared components
// ---------------------

function LedgerList() {
  const { ledger, balance } = useCredits();

  if (!balance) return null;

  return (
    <Card className="border-border/60 bg-card/50">
      <CardHeader>
        <CardTitle>Recent ledger activity</CardTitle>
        <CardDescription>
          Every credit grant and AI usage debit is recorded immutably.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {ledger.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No credit activity yet. Purchase credits or use AI Studio to start generating records.
          </p>
        ) : (
          <div className="space-y-3">
            {ledger.map((entry) => {
              const isPositive =
                entry.type === "CREDIT" ||
                entry.type === "REFUND" ||
                entry.type === "ADJUSTMENT";

              return (
                <div
                  key={entry.id}
                  className="flex items-start justify-between gap-4 rounded-lg border border-border/50 bg-background/60 p-4"
                >
                  <div className="min-w-0">
                    <p className="font-medium">
                      {entry.description || entry.source.replaceAll("_", " ")}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {new Date(entry.createdAt).toLocaleString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <p
                      className={`font-semibold ${
                        isPositive ? "text-emerald-600" : "text-foreground"
                      }`}
                    >
                      {isPositive ? "+" : "-"}
                      {entry.amount.credits}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Balance {entry.balanceAfter.credits}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function PricingExplanation({ pricing }: { pricing: PricingRule[] }) {
  return (
    <Card className="border-border/60 bg-card/50">
      <CardHeader>
        <CardTitle>Current model pricing</CardTitle>
        <CardDescription>
          Credits are charged using the active pricing rule for each provider and model. All rates below are shown per 1M tokens.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {pricing.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No active pricing rules are currently published.
          </p>
        ) : (
          <div className="space-y-4">
            {pricing.map((rule) => (
              <div
                key={rule.id}
                className="rounded-lg border border-border/50 bg-background/60 p-4"
              >
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-medium">
                      {rule.displayName || `${rule.provider} / ${rule.model}`}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {rule.provider} / {rule.model}
                    </p>
                  </div>
                  <Badge variant="secondary">Per 1M tokens</Badge>
                </div>

                <div className="mt-4 grid gap-3 text-sm sm:grid-cols-2 xl:grid-cols-5">
                  <div className="rounded-md border border-border/40 bg-card/30 p-3">
                    <p className="text-xs text-muted-foreground">Input</p>
                    <p className="mt-1 font-medium">{rule.rates.prompt.credits}</p>
                  </div>
                  <div className="rounded-md border border-border/40 bg-card/30 p-3">
                    <p className="text-xs text-muted-foreground">Output</p>
                    <p className="mt-1 font-medium">
                      {rule.rates.completion.credits}
                    </p>
                  </div>
                  <div className="rounded-md border border-border/40 bg-card/30 p-3">
                    <p className="text-xs text-muted-foreground">Cache write</p>
                    <p className="mt-1 font-medium">
                      {rule.rates.cacheWrite.credits}
                    </p>
                  </div>
                  <div className="rounded-md border border-border/40 bg-card/30 p-3">
                    <p className="text-xs text-muted-foreground">Cache read</p>
                    <p className="mt-1 font-medium">
                      {rule.rates.cacheRead.credits}
                    </p>
                  </div>
                  <div className="rounded-md border border-border/40 bg-card/30 p-3">
                    <p className="text-xs text-muted-foreground">Minimum charge</p>
                    <p className="mt-1 font-medium">
                      {rule.rates.minimumCharge.credits}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ---------------------
// Page components
// ---------------------

export function CreditsPageClient({
  pricing,
}: {
  pricing: PricingRule[];
}) {
  const searchParams = useSearchParams();
  const { refreshCredits, error, isLoading } = useCredits();

  useEffect(() => {
    if (searchParams.get("checkout") === "success") {
      void refreshCredits();
    }
  }, [refreshCredits, searchParams]);

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-10 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <Badge variant="secondary" className="gap-1.5">
            <Coins className="h-3.5 w-3.5" />
            Credits
          </Badge>
          <h1 className="mt-4 text-4xl font-bold tracking-tight">
            Top up your AI credits
          </h1>
          <p className="mt-3 max-w-2xl text-muted-foreground">
            Buy prepaid credits for AI Studio and future API-based model usage. Credits are deducted using model-specific rates for input, output, cache write, and cache read tokens.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="outline" onClick={() => void refreshCredits()} disabled={isLoading}>
            <RefreshCcw className="h-4 w-4" />
            Refresh balance
          </Button>
          <Button variant="outline" asChild>
            <Link href="/membership">View membership plans</Link>
          </Button>
        </div>
      </div>

      {searchParams.get("checkout") === "success" ? (
        <div className="flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-300">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          Payment completed. Credits are usually added immediately after Stripe confirms the payment.
        </div>
      ) : null}

      {searchParams.get("checkout") === "cancelled" ? (
        <div className="rounded-lg border border-border/60 bg-card/50 px-4 py-3 text-sm text-muted-foreground">
          Checkout was cancelled. You can restart the purchase at any time.
        </div>
      ) : null}

      {error ? (
        <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      <BalanceOverview />

      <AmountSelector />

      <PricingExplanation pricing={pricing} />

      <LedgerList />
    </div>
  );
}

export function MembershipPageClient({
  products,
  pricing,
}: {
  products: Product[];
  pricing: PricingRule[];
}) {
  const searchParams = useSearchParams();
  const { refreshCredits, error, isLoading } = useCredits();

  useEffect(() => {
    if (searchParams.get("checkout") === "success") {
      void refreshCredits();
    }
  }, [refreshCredits, searchParams]);

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-10 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <Badge variant="secondary" className="gap-1.5">
            <Crown className="h-3.5 w-3.5" />
            Membership
          </Badge>
          <h1 className="mt-4 text-4xl font-bold tracking-tight">
            Membership plans with recurring credits
          </h1>
          <p className="mt-3 max-w-2xl text-muted-foreground">
            Subscribe for recurring credit grants each billing cycle. Membership credits land in the same ledger and are consumed by the same per-model pricing rules as top-up credits.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="outline" onClick={() => void refreshCredits()} disabled={isLoading}>
            <RefreshCcw className="h-4 w-4" />
            Refresh balance
          </Button>
          <Button variant="outline" asChild>
            <Link href="/credits">View top-up packages</Link>
          </Button>
        </div>
      </div>

      {searchParams.get("checkout") === "success" ? (
        <div className="flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-300">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          Membership checkout completed. Your subscription credits will be granted when the invoice payment is confirmed.
        </div>
      ) : null}

      {error ? (
        <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      <BalanceOverview />

      <div className="grid gap-4 lg:grid-cols-3">
        {products.map((product) => (
          <ProductCard
            key={product.id}
            product={product}
            ctaLabel="Start membership"
            accent="violet"
          />
        ))}
      </div>

      <PricingExplanation pricing={pricing} />

      <Card className="border-border/60 bg-card/50">
        <CardHeader>
          <CardTitle>How membership credits work</CardTitle>
          <CardDescription>
            Billing follows the same ledger model as OpenRouter-style prepaid credits.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-3">
          {[
            "Recurring invoices grant a fresh credit allocation every billing cycle.",
            "Per-model token pricing can vary by provider, model, input, output, cache write, and cache read.",
            "All usage debits and Stripe grants are stored in the immutable ledger for auditing.",
          ].map((item) => (
            <div
              key={item}
              className="rounded-lg border border-border/50 bg-background/60 p-4 text-sm text-muted-foreground"
            >
              {item}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
