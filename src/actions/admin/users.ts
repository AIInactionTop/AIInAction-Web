"use server";

import { requireAdmin } from "@/lib/admin-auth";
import { grantCredits } from "@/lib/billing/service";
import { creditsToMicrocredits } from "@/lib/billing/units";
import { revalidatePath } from "next/cache";
import { CreditLedgerEntrySource, CreditLedgerEntryType } from "@prisma/client";

const ALLOWED_SOURCES = [
  CreditLedgerEntrySource.MANUAL_ADJUSTMENT,
  CreditLedgerEntrySource.PROMOTION,
  CreditLedgerEntrySource.REFUND,
] as const;

export async function grantCreditsToUser(formData: FormData) {
  const admin = await requireAdmin();

  const userId = formData.get("userId") as string;
  const amountStr = formData.get("amount") as string;
  const source = formData.get("source") as CreditLedgerEntrySource;
  const description = formData.get("description") as string;

  if (!userId) {
    return { error: "User ID is required" };
  }
  if (!amountStr || isNaN(Number(amountStr)) || Number(amountStr) <= 0) {
    return { error: "Amount must be a positive number" };
  }
  if (!source || !ALLOWED_SOURCES.includes(source as typeof ALLOWED_SOURCES[number])) {
    return { error: "Invalid source" };
  }
  if (!description?.trim()) {
    return { error: "Description is required" };
  }

  let amountMicrocredits: bigint;
  try {
    amountMicrocredits = creditsToMicrocredits(amountStr);
  } catch {
    return { error: "Invalid amount format" };
  }

  const entryType =
    source === CreditLedgerEntrySource.REFUND
      ? CreditLedgerEntryType.REFUND
      : CreditLedgerEntryType.CREDIT;

  try {
    await grantCredits({
      userId,
      amountMicrocredits,
      source,
      entryType,
      description: description.trim(),
      metadata: { grantedBy: admin.id },
    });
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to grant credits" };
  }

  revalidatePath(`/admin/users/${userId}`);
  return { success: true };
}
