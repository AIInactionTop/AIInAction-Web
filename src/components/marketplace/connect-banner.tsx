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
