import React, { useState } from "react";
import { Shield, Trophy, Zap, Star } from "lucide-react";
import { useGame } from "@/contexts/GameContext";
import { useEnergyTimer, formatMMSS } from "@/hooks/useEnergyTimer";

export default function PlayerProfileCard() {
  const { session } = useGame();
  const user = session?.user;
  const [showXpDetail, setShowXpDetail] = useState(false);

  if (!user) return null;

  const elo = user.elo ?? 1000;
  const patent = user.patent ?? "Cobreiro";
  const shields = user.rank_shield_charges ?? 0;

  const level = user.level;
  const xp = user.xp;
  const xpNext = user.xp_to_next_level;
  const xpPct = user.xp_progress_percentage;

  const energy = user.energy;
  const maxEnergy = user.max_energy;
  const remaining = useEnergyTimer(user.next_energy_in_seconds);
  const showTimer =
    energy !== undefined &&
    maxEnergy !== undefined &&
    energy < maxEnergy &&
    remaining > 0;

  return (
    <div className="p-3 mb-4 rounded-lg bg-card border border-border space-y-3">
      {/* Top row: identity + ELO */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary/15 flex items-center justify-center text-primary">
            <Shield size={20} />
          </div>
          <div className="leading-tight">
            <div className="font-display font-semibold text-foreground text-sm">
              {user.nickname}
            </div>
            <div className="text-xs text-muted-foreground">{patent}</div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {shields > 0 && (
            <span
              title="Rank Shields"
              className="text-xs px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground"
            >
              🛡 {shields}
            </span>
          )}
          <div className="flex items-center gap-1 text-primary">
            <Trophy size={14} />
            <span className="font-display font-bold text-sm">{elo}</span>
            <span className="text-[10px] text-muted-foreground ml-0.5">ELO</span>
          </div>
        </div>
      </div>

      {/* Bottom row: Level + XP + Energy */}
      <div className="flex items-center gap-3">
        {/* Level + XP bar */}
        <div className="flex-1 min-w-0">
          {level === undefined || xpPct === undefined ? (
            <div className="h-5 rounded bg-secondary/60 animate-pulse" />
          ) : (
            <button
              type="button"
              onClick={() => setShowXpDetail((v) => !v)}
              className="w-full text-left group"
              aria-label="Detalhes de XP"
            >
              <div className="flex items-center gap-2 mb-1">
                <span className="inline-flex items-center gap-1 text-[10px] font-display font-bold px-1.5 py-0.5 rounded bg-accent/20 text-accent">
                  <Star size={10} fill="currentColor" /> Nv {level}
                </span>
                <span className="text-[10px] text-muted-foreground tabular-nums">
                  {showXpDetail && xp !== undefined && xpNext !== undefined
                    ? `${xp} / ${xp + xpNext} XP`
                    : `${Math.round(xpPct)}%`}
                </span>
              </div>
              <div className="h-1.5 w-full rounded-full bg-secondary overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-accent to-primary transition-all duration-500"
                  style={{ width: `${Math.max(0, Math.min(100, xpPct))}%` }}
                />
              </div>
            </button>
          )}
        </div>

        {/* Energy */}
        <div className="flex flex-col items-end leading-tight min-w-[60px]">
          {energy === undefined || maxEnergy === undefined ? (
            <div className="h-5 w-12 rounded bg-secondary/60 animate-pulse" />
          ) : (
            <>
              <div className="flex items-center gap-1 text-primary">
                <Zap size={14} fill="currentColor" />
                <span className="font-display font-bold text-sm tabular-nums">
                  {energy}
                  <span className="text-muted-foreground">/{maxEnergy}</span>
                </span>
              </div>
              {showTimer && (
                <span className="text-[10px] text-muted-foreground tabular-nums">
                  +1 em {formatMMSS(remaining)}
                </span>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
