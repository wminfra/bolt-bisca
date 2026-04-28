import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { UserEconomyState } from "@/lib/types";
import { useGame } from "./GameContext";
import { claimDailyBonus, getStoreItems } from "@/lib/api";

interface EconomyContextType {
  economy: UserEconomyState | null;
  /** Apply a partial economy update (after a successful transaction). */
  applyEconomyState: (state: UserEconomyState) => void;
  /** Force a refresh by hitting the store items endpoint (it returns coins too). */
  refreshEconomy: () => Promise<void>;
  /** True if user can claim daily bonus today. */
  canClaimDaily: boolean;
  /** Last claim feedback (animation trigger). */
  lastEarnedCoins: number | null;
  clearLastEarned: () => void;
  /** Wrapper for the daily claim that updates state + animation. */
  claimDaily: () => Promise<{ earned: number } | null>;
}

const EconomyContext = createContext<EconomyContextType | null>(null);

export function useEconomy() {
  const ctx = useContext(EconomyContext);
  if (!ctx) throw new Error("useEconomy outside provider");
  return ctx;
}

function isSameLocalDay(iso: string | null): boolean {
  if (!iso) return false;
  const d = new Date(iso);
  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
}

export function EconomyProvider({ children }: { children: React.ReactNode }) {
  const { token, session } = useGame();
  const [economy, setEconomy] = useState<UserEconomyState | null>(null);
  const [lastEarnedCoins, setLastEarnedCoins] = useState<number | null>(null);
  const loadedRef = useRef(false);

  const applyEconomyState = useCallback((state: UserEconomyState) => {
    setEconomy(state);
  }, []);

  const refreshEconomy = useCallback(async () => {
    if (!token) return;
    try {
      const res = await getStoreItems();
      setEconomy((prev) => ({
        coins: res.coins,
        consecutive_logins: prev?.consecutive_logins ?? 0,
        last_login_date: prev?.last_login_date ?? null,
        double_xp_until: prev?.double_xp_until ?? null,
        rank_shield_charges: res.rank_shield_charges,
        energy: prev?.energy ?? session?.user?.energy ?? 0,
        energy_frozen_until: prev?.energy_frozen_until ?? null,
      }));
    } catch {
      /* silent */
    }
  }, [token, session?.user?.energy]);

  const claimDaily = useCallback(async () => {
    try {
      const res = await claimDailyBonus();
      applyEconomyState(res.user_state);
      setLastEarnedCoins(res.earned_coins);
      return { earned: res.earned_coins };
    } catch {
      return null;
    }
  }, [applyEconomyState]);

  const clearLastEarned = useCallback(() => setLastEarnedCoins(null), []);

  // Initial load when authenticated
  useEffect(() => {
    if (!token) {
      setEconomy(null);
      loadedRef.current = false;
      return;
    }
    if (loadedRef.current) return;
    loadedRef.current = true;
    refreshEconomy();
  }, [token, refreshEconomy]);

  // Keep energy in sync with session (since WS pushes energy on the user object)
  useEffect(() => {
    if (!session?.user) return;
    setEconomy((prev) =>
      prev
        ? {
            ...prev,
            energy: session.user.energy ?? prev.energy,
            rank_shield_charges:
              session.user.rank_shield_charges ?? prev.rank_shield_charges,
          }
        : prev
    );
  }, [session?.user?.energy, session?.user?.rank_shield_charges]);

  const canClaimDaily = useMemo(() => {
    if (!economy) return true;
    return !isSameLocalDay(economy.last_login_date);
  }, [economy]);

  const value: EconomyContextType = {
    economy,
    applyEconomyState,
    refreshEconomy,
    canClaimDaily,
    lastEarnedCoins,
    clearLastEarned,
    claimDaily,
  };

  return <EconomyContext.Provider value={value}>{children}</EconomyContext.Provider>;
}
