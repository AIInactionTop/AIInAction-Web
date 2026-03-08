import { jsonSuccess } from "@/lib/api-auth";
import { getCreditBalanceSummary, listRecentLedgerEntries } from "@/lib/billing/service";
import { requireAuth } from "@/lib/api-auth";

export async function GET(request: Request) {
  const { user, error } = await requireAuth(request);
  if (error) return error;

  const [balance, ledger] = await Promise.all([
    getCreditBalanceSummary(user!.id),
    listRecentLedgerEntries(user!.id, 20),
  ]);

  return jsonSuccess({ balance, ledger });
}
