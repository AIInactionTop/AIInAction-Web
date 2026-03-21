import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { microcreditsToCreditsString } from "@/lib/billing/units";
import { creditsToMicrocredits } from "@/lib/billing/units";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Prisma } from "@prisma/client";

const PAGE_SIZE = 20;

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function getParam(searchParams: Record<string, string | string[] | undefined>, key: string): string | undefined {
  const val = searchParams[key];
  if (Array.isArray(val)) return val[0];
  return val || undefined;
}

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const q = getParam(params, "q") ?? "";
  const from = getParam(params, "from") ?? "";
  const to = getParam(params, "to") ?? "";
  const balanceMin = getParam(params, "balanceMin") ?? "";
  const balanceMax = getParam(params, "balanceMax") ?? "";
  const page = Math.max(1, parseInt(getParam(params, "page") ?? "1", 10));

  // Build where conditions
  const where: Prisma.UserWhereInput = {};
  const conditions: Prisma.UserWhereInput[] = [];

  if (q) {
    conditions.push({
      OR: [
        { name: { contains: q, mode: "insensitive" } },
        { email: { contains: q, mode: "insensitive" } },
      ],
    });
  }

  if (from || to) {
    const dateFilter: Prisma.DateTimeFilter = {};
    if (from) dateFilter.gte = new Date(from);
    if (to) {
      const endDate = new Date(to);
      endDate.setDate(endDate.getDate() + 1);
      dateFilter.lt = endDate;
    }
    conditions.push({ createdAt: dateFilter });
  }

  // Balance filtering
  const hasBalanceMin = balanceMin !== "" && !isNaN(Number(balanceMin));
  const hasBalanceMax = balanceMax !== "" && !isNaN(Number(balanceMax));

  if (hasBalanceMin || hasBalanceMax) {
    const balanceFilter: Prisma.BillingAccountWhereInput = {
      balanceMicrocredits: {},
    };
    const mcFilter = balanceFilter.balanceMicrocredits as Prisma.BigIntFilter;

    if (hasBalanceMin && Number(balanceMin) > 0) {
      mcFilter.gte = creditsToMicrocredits(balanceMin);
      conditions.push({ billingAccount: balanceFilter });
    } else if (hasBalanceMin && Number(balanceMin) === 0 && hasBalanceMax) {
      // balanceMin=0 with max: include users without billing account OR with balance in range
      mcFilter.lte = creditsToMicrocredits(balanceMax);
      conditions.push({
        OR: [
          { billingAccount: null },
          { billingAccount: balanceFilter },
        ],
      });
    } else if (hasBalanceMax) {
      mcFilter.lte = creditsToMicrocredits(balanceMax);
      conditions.push({
        OR: [
          { billingAccount: null },
          { billingAccount: balanceFilter },
        ],
      });
    }

    // If only balanceMin > 0
    if (hasBalanceMin && Number(balanceMin) > 0 && hasBalanceMax) {
      mcFilter.lte = creditsToMicrocredits(balanceMax);
    }
  }

  if (conditions.length > 0) {
    where.AND = conditions;
  }

  const [users, totalCount] = await Promise.all([
    prisma.user.findMany({
      where,
      include: { billingAccount: true },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.user.count({ where }),
  ]);

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  // Build pagination URL helper
  function pageUrl(p: number) {
    const sp = new URLSearchParams();
    if (q) sp.set("q", q);
    if (from) sp.set("from", from);
    if (to) sp.set("to", to);
    if (balanceMin) sp.set("balanceMin", balanceMin);
    if (balanceMax) sp.set("balanceMax", balanceMax);
    if (p > 1) sp.set("page", String(p));
    const qs = sp.toString();
    return qs ? `?${qs}` : "?";
  }

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">Users</h1>

      {/* Search / Filter Form */}
      <form className="mb-6 space-y-4 rounded-lg border p-4">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="space-y-1">
            <Label htmlFor="q">Search</Label>
            <Input
              id="q"
              name="q"
              placeholder="Name or email..."
              defaultValue={q}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="from">Registered From</Label>
            <Input id="from" name="from" type="date" defaultValue={from} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="to">Registered To</Label>
            <Input id="to" name="to" type="date" defaultValue={to} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="balanceMin">Balance Min (credits)</Label>
            <Input
              id="balanceMin"
              name="balanceMin"
              type="number"
              step="0.000001"
              placeholder="0"
              defaultValue={balanceMin}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="balanceMax">Balance Max (credits)</Label>
            <Input
              id="balanceMax"
              name="balanceMax"
              type="number"
              step="0.000001"
              placeholder="∞"
              defaultValue={balanceMax}
            />
          </div>
        </div>
        <div className="flex gap-2">
          <Button type="submit" size="sm">
            Search
          </Button>
          <Button type="reset" variant="outline" size="sm" asChild>
            <Link href="?">Reset</Link>
          </Button>
        </div>
      </form>

      {/* Results count */}
      <p className="mb-3 text-sm text-muted-foreground">
        {totalCount} user{totalCount !== 1 ? "s" : ""} found
      </p>

      {/* Table */}
      {users.length === 0 ? (
        <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
          No users found.
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>GitHub</TableHead>
              <TableHead className="text-right">Credits</TableHead>
              <TableHead>Registered</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((user) => (
              <TableRow key={user.id}>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Avatar className="h-7 w-7">
                      <AvatarImage src={user.image ?? undefined} />
                      <AvatarFallback>
                        {(user.name ?? user.email ?? "?")[0]?.toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span className="font-medium">{user.name ?? "-"}</span>
                  </div>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {user.email ?? "-"}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {user.githubId ?? "-"}
                </TableCell>
                <TableCell className="text-right font-mono">
                  {user.billingAccount
                    ? microcreditsToCreditsString(user.billingAccount.balanceMicrocredits)
                    : "0"}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {user.createdAt.toLocaleDateString()}
                </TableCell>
                <TableCell>
                  <Button variant="ghost" size="sm" asChild>
                    <Link href={`/admin/users/${user.id}`}>View</Link>
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-center gap-2">
          {page > 1 && (
            <Button variant="outline" size="sm" asChild>
              <Link href={pageUrl(page - 1)}>Previous</Link>
            </Button>
          )}
          <span className="text-sm text-muted-foreground">
            Page {page} of {totalPages}
          </span>
          {page < totalPages && (
            <Button variant="outline" size="sm" asChild>
              <Link href={pageUrl(page + 1)}>Next</Link>
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
