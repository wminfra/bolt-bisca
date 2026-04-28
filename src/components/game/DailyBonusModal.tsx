import React, { useEffect, useState } from "react";
import { useEconomy } from "@/contexts/EconomyContext";
import { showToast } from "@/components/game/ToastManager";

interface DailyBonusModalProps {
  onClose: () => void;
}

export default function DailyBonusModal({ onClose }: DailyBonusModalProps) {
  const { economy, canClaimDaily, claimDaily } = useEconomy();
  const [claiming, setClaiming] = useState(false);
  const [justEarned, setJustEarned] = useState<number | null>(null);

  // Streak after claim is the "current" day. Before claim, current day = streak+1 (next reward).
  const streakDone = economy?.consecutive_logins ?? 0;
  const currentDay = canClaimDaily
    ? Math.min(streakDone === 7 ? 1 : streakDone + 1, 7)
    : streakDone || 1;

  const handleClaim = async () => {
    if (!canClaimDaily || claiming) return;
    setClaiming(true);
    const result = await claimDaily();
    setClaiming(false);
    if (result) {
      setJustEarned(result.earned);
      showToast("success", `+${result.earned} moedas!`);
      setTimeout(() => setJustEarned(null), 1800);
    } else {
      showToast("error", "Não foi possível resgatar o bônus.");
    }
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="bg-card rounded-lg p-6 w-full max-w-sm border border-border shadow-xl animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between mb-1">
          <h2 className="text-xl font-display font-bold text-foreground">Bônus Diário</h2>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground"
            aria-label="Fechar"
          >
            ✕
          </button>
        </div>
        <p className="text-xs text-muted-foreground mb-4">
          Entre todos os dias para aumentar a recompensa. Após o dia 7, o ciclo recomeça.
        </p>

        <div className="grid grid-cols-7 gap-1.5 mb-5">
          {Array.from({ length: 7 }, (_, i) => i + 1).map((day) => {
            const isCurrent = day === currentDay && canClaimDaily;
            const isClaimed = day <= streakDone && !isCurrent;
            return (
              <div
                key={day}
                className={`relative rounded-md border text-center py-2 px-1 transition-all ${
                  isCurrent
                    ? "border-primary bg-primary/15 ring-2 ring-primary/60 scale-105"
                    : isClaimed
                    ? "border-border bg-secondary/60 opacity-70"
                    : "border-border bg-secondary"
                }`}
              >
                <div className="text-[10px] text-muted-foreground">Dia</div>
                <div className="text-sm font-bold text-foreground">{day}</div>
                <div className="text-[10px] mt-0.5 font-mono text-amber-400">
                  +{50 * day}
                </div>
                {isClaimed && (
                  <div className="absolute top-0.5 right-0.5 text-emerald-400 text-[10px]">✓</div>
                )}
              </div>
            );
          })}
        </div>

        <div className="flex items-center justify-between mb-4 px-1">
          <div className="text-xs text-muted-foreground">Saldo atual</div>
          <div className="flex items-center gap-1.5 font-mono text-amber-300 font-bold">
            <CoinIcon />
            <span>{economy?.coins ?? 0}</span>
            {justEarned !== null && (
              <span className="ml-2 text-emerald-400 animate-in slide-in-from-bottom-2 fade-in duration-500">
                +{justEarned}
              </span>
            )}
          </div>
        </div>

        <button
          onClick={handleClaim}
          disabled={!canClaimDaily || claiming}
          className="w-full py-2.5 rounded-md bg-primary text-primary-foreground font-display font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {canClaimDaily
            ? claiming
              ? "Resgatando..."
              : `Resgatar +${50 * currentDay} moedas`
            : "Já resgatado hoje"}
        </button>
      </div>
    </div>
  );
}

function CoinIcon() {
  return (
    <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-gradient-to-br from-amber-300 to-amber-600 text-[9px] font-black text-amber-900 shadow-sm">
      $
    </span>
  );
}
