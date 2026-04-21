import React from "react";
import { Shield, Trophy } from "lucide-react";
import { useGame } from "@/contexts/GameContext";

export default function PlayerProfileCard() {
  const { session } = useGame();
  const user = session?.user;
  if (!user) return null;

  const elo = user.elo ?? 1000;
  const patent = user.patent ?? "Cobreiro";
  const shields = user.rank_shield_charges ?? 0;

  return (
    <div className="flex items-center justify-between p-3 mb-4 rounded-lg bg-card border border-border">
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
  );
}
