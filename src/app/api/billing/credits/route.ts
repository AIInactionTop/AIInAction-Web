import { jsonSuccess } from "@/lib/api-auth";
import { getCreditBalanceSummary, listRecentLedgerEntries } from "@/lib/billing/service";
import { requireSessionUser } from "@/lib/session-auth";

export async function GET() {
  const { user, error } = await requireSessionUser();
  if (error) return error;

  const [balance, ledger] = await Promise.all([
    getCreditBalanceSummary(user!.id),
    listRecentLedgerEntries(user!.id, 20),
  ]);

  return jsonSuccess({ balance, ledger });
}
