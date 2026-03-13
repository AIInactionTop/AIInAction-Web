"use client";

import { Coins, TrendingDown, TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useCredits } from "@/components/billing/credits-provider";

function StatCard({
  title,
  value,
  icon: Icon,
}: {
  title: string;
  value: string;
  icon: typeof Coins;
}) {
  return (
    <Card className="border-border/60 bg-card/50">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <Icon className="h-4 w-4" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-semibold tracking-tight">{value}</div>
      </CardContent>
    </Card>
  );
}

export function BalanceOverview() {
  const { balance, isLoading } = useCredits();

  if (isLoading && !balance) {
    return (
      <div className="grid gap-4 md:grid-cols-3">
        {[0, 1, 2].map((item) => (
          <Card key={item} className="border-border/60 bg-card/50">
            <CardContent className="h-24 animate-pulse" />
          </Card>
        ))}
      </div>
    );
  }

  if (!balance) {
    return (
      <Card className="border-border/60 bg-card/50">
        <CardContent className="py-6 text-sm text-muted-foreground">
          Sign in to view your current credits balance and transaction history.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-3">
      <StatCard
        title="Current balance"
        value={`${balance.balance.credits} credits`}
        icon={Coins}
      />
      <StatCard
        title="Lifetime credited"
        value={`${balance.lifetimeCredited.credits} credits`}
        icon={TrendingUp}
      />
      <StatCard
        title="Lifetime debited"
        value={`${balance.lifetimeDebited.credits} credits`}
        icon={TrendingDown}
      />
    </div>
  );
}
