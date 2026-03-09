"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useSession } from "next-auth/react";

type CreditAmount = {
  microcredits: string;
  credits: string;
};

type CreditBalance = {
  accountId: string;
  userId: string;
  balance: CreditAmount;
  lifetimeCredited: CreditAmount;
  lifetimeDebited: CreditAmount;
};

type CreditLedgerEntry = {
  id: string;
  type: string;
  source: string;
  sourceRef: string | null;
  description: string | null;
  amount: CreditAmount;
  balanceAfter: CreditAmount;
  metadata: unknown;
  createdAt: string;
};

type CreditsContextValue = {
  balance: CreditBalance | null;
  ledger: CreditLedgerEntry[];
  isLoading: boolean;
  error: string | null;
  refreshCredits: () => Promise<void>;
};

const CreditsContext = createContext<CreditsContextValue | null>(null);

async function fetchCreditsState() {
  const response = await fetch("/api/billing/credits", {
    method: "GET",
    cache: "no-store",
    credentials: "include",
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as
      | { error?: { message?: string } }
      | null;

    throw new Error(payload?.error?.message || "Failed to load credits");
  }

  const payload = (await response.json()) as {
    data: {
      balance: CreditBalance;
      ledger: CreditLedgerEntry[];
    };
  };

  return payload.data;
}

export function CreditsProvider({ children }: { children: ReactNode }) {
  const { data: session, status } = useSession();
  const [balance, setBalance] = useState<CreditBalance | null>(null);
  const [ledger, setLedger] = useState<CreditLedgerEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refreshCredits = useCallback(async () => {
    if (!session?.user?.id) {
      setBalance(null);
      setLedger([]);
      setError(null);
      return;
    }

    setIsLoading(true);
    try {
      const data = await fetchCreditsState();
      setBalance(data.balance);
      setLedger(data.ledger);
      setError(null);
    } catch (refreshError) {
      setError(
        refreshError instanceof Error
          ? refreshError.message
          : "Failed to load credits"
      );
    } finally {
      setIsLoading(false);
    }
  }, [session?.user?.id]);

  useEffect(() => {
    if (status === "loading") return;

    if (!session?.user?.id) {
      setBalance(null);
      setLedger([]);
      setError(null);
      return;
    }

    void refreshCredits();
  }, [refreshCredits, session?.user?.id, status]);

  const value = useMemo<CreditsContextValue>(
    () => ({
      balance,
      ledger,
      isLoading,
      error,
      refreshCredits,
    }),
    [balance, error, isLoading, ledger, refreshCredits]
  );

  return (
    <CreditsContext.Provider value={value}>{children}</CreditsContext.Provider>
  );
}

export function useCredits() {
  const context = useContext(CreditsContext);
  if (!context) {
    throw new Error("useCredits must be used within a CreditsProvider");
  }

  return context;
}
