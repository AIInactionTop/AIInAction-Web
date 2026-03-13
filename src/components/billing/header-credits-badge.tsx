"use client";

import { Coins, Plus } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { useCredits } from "@/components/billing/credits-provider";

export function HeaderCreditsBadge() {
  const { balance } = useCredits();

  if (!balance) return null;

  return (
    <div className="hidden items-center gap-2 md:flex">
      <Link
        href="/credits"
        className="flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1.5 text-xs font-medium text-amber-700 transition-colors hover:bg-amber-500/15 dark:text-amber-300"
      >
        <Coins className="h-3.5 w-3.5" />
        <span>{balance.balance.credits} credits</span>
      </Link>
    </div>
  );
}
