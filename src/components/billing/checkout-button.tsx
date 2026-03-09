"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { signIn, useSession } from "next-auth/react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

type Props = {
  productId: string;
  label: string;
  variant?: "default" | "outline" | "secondary";
};

export function CheckoutButton({
  productId,
  label,
  variant = "default",
}: Props) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCheckout = async () => {
    if (!session?.user) {
      await signIn("github", { callbackUrl: pathname });
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/billing/stripe/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          productId,
          successUrl: `${pathname}?checkout=success`,
          cancelUrl: `${pathname}?checkout=cancelled`,
        }),
      });

      const payload = (await response.json().catch(() => null)) as
        | {
            data?: { url?: string | null };
            error?: { message?: string };
          }
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

  return (
    <div className="space-y-2">
      <Button
        onClick={handleCheckout}
        disabled={loading}
        variant={variant}
        className="w-full"
      >
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        {session?.user ? label : "Sign in to purchase"}
      </Button>
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}
