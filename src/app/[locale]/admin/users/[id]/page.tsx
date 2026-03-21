import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { microcreditsToCreditsString } from "@/lib/billing/units";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { GrantCreditsDialog } from "@/components/admin/grant-credits-dialog";
import { ArrowLeft } from "lucide-react";
import type { CreditLedgerEntryType, CreditLedgerEntrySource } from "@prisma/client";

const PAGE_SIZE = 20;

const typeVariant: Record<CreditLedgerEntryType, "default" | "secondary" | "outline" | "destructive"> = {
  CREDIT: "default",
  DEBIT: "destructive",
  REFUND: "secondary",
  ADJUSTMENT: "outline",
  EXPIRE: "destructive",
};

const sourceLabels: Record<CreditLedgerEntrySource, string> = {
  TOP_UP: "Top Up",
  MEMBERSHIP: "Membership",
  AI_USAGE: "AI Usage",
  MANUAL_ADJUSTMENT: "Manual",
  REFUND: "Refund",
  PROMOTION: "Promotion",
};

type Params = Promise<{ id: string }>;
type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function AdminUserDetailPage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: SearchParams;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const ledgerPageParam = Array.isArray(sp.ledgerPage) ? sp.ledgerPage[0] : sp.ledgerPage;
  const ledgerPage = Math.max(1, parseInt(ledgerPageParam ?? "1", 10));

  const user = await prisma.user.findUnique({
    where: { id },
    include: { billingAccount: true },
  });

  if (!user) {
    notFound();
  }

  const balance = user.billingAccount?.balanceMicrocredits ?? BigInt(0);
  const lifetimeCredited = user.billingAccount?.lifetimeCreditedMicrocredits ?? BigInt(0);
  const lifetimeDebited = user.billingAccount?.lifetimeDebitedMicrocredits ?? BigInt(0);

  const [ledgerEntries, ledgerTotal] = await Promise.all([
    prisma.creditLedgerEntry.findMany({
      where: { userId: id },
      orderBy: { createdAt: "desc" },
      skip: (ledgerPage - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.creditLedgerEntry.count({ where: { userId: id } }),
  ]);

  const ledgerTotalPages = Math.max(1, Math.ceil(ledgerTotal / PAGE_SIZE));

  function ledgerPageUrl(p: number) {
    return p > 1 ? `?ledgerPage=${p}` : "?";
  }

  return (
    <div className="space-y-6">
      {/* Back link */}
      <Button variant="ghost" size="sm" asChild>
        <Link href="/admin/users">
          <ArrowLeft className="mr-1 h-4 w-4" />
          Back to Users
        </Link>
      </Button>

      {/* User Info Card */}
      <Card>
        <CardContent className="flex items-center gap-4 pt-6">
          <Avatar className="h-16 w-16">
            <AvatarImage src={user.image ?? undefined} />
            <AvatarFallback className="text-lg">
              {(user.name ?? user.email ?? "?")[0]?.toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="space-y-1">
            <h2 className="text-xl font-bold">{user.name ?? "Unnamed"}</h2>
            <p className="text-sm text-muted-foreground">{user.email ?? "No email"}</p>
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              {user.githubUrl && (
                <a
                  href={user.githubUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:underline"
                >
                  GitHub
                </a>
              )}
              <span>Joined {user.createdAt.toLocaleDateString()}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Credits Overview */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Credits</CardTitle>
          <GrantCreditsDialog userId={user.id} />
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <p className="text-sm text-muted-foreground">Current Balance</p>
              <p className="text-2xl font-bold font-mono">
                {microcreditsToCreditsString(balance)}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Lifetime Credited</p>
              <p className="text-2xl font-bold font-mono text-emerald-600">
                {microcreditsToCreditsString(lifetimeCredited)}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Lifetime Debited</p>
              <p className="text-2xl font-bold font-mono text-destructive">
                {microcreditsToCreditsString(lifetimeDebited)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Credit Ledger */}
      <div>
        <h3 className="mb-3 text-lg font-semibold">Credit History</h3>
        <p className="mb-3 text-sm text-muted-foreground">
          {ledgerTotal} entr{ledgerTotal !== 1 ? "ies" : "y"}
        </p>

        {ledgerEntries.length === 0 ? (
          <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
            No credit history.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Time</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Source</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="text-right">Balance After</TableHead>
                <TableHead>Description</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ledgerEntries.map((entry) => (
                <TableRow key={entry.id}>
                  <TableCell className="whitespace-nowrap text-muted-foreground">
                    {entry.createdAt.toLocaleString()}
                  </TableCell>
                  <TableCell>
                    <Badge variant={typeVariant[entry.type]}>
                      {entry.type}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {sourceLabels[entry.source] ?? entry.source}
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {microcreditsToCreditsString(entry.amountMicrocredits)}
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {microcreditsToCreditsString(entry.balanceAfterMicrocredits)}
                  </TableCell>
                  <TableCell className="max-w-[200px] truncate text-muted-foreground">
                    {entry.description ?? "-"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}

        {/* Pagination */}
        {ledgerTotalPages > 1 && (
          <div className="mt-4 flex items-center justify-center gap-2">
            {ledgerPage > 1 && (
              <Button variant="outline" size="sm" asChild>
                <Link href={ledgerPageUrl(ledgerPage - 1)}>Previous</Link>
              </Button>
            )}
            <span className="text-sm text-muted-foreground">
              Page {ledgerPage} of {ledgerTotalPages}
            </span>
            {ledgerPage < ledgerTotalPages && (
              <Button variant="outline" size="sm" asChild>
                <Link href={ledgerPageUrl(ledgerPage + 1)}>Next</Link>
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
