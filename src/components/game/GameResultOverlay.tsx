import React, { useEffect, useState } from "react";
import type { MatchResult } from "@/lib/types";
import { useGame } from "@/contexts/GameContext";
import { leaveRoom } from "@/lib/api";
import { showToast } from "@/components/game/ToastManager";
import { TrendingUp, TrendingDown, Shield } from "lucide-react";

const REASON_LABELS: Record<string, string> = {
  surrender: "Desistência",
  walkover: "Abandono (W.O.)",
  completed: "Fim de Jogo",
  "Desistencia": "Desistência",
  "Abandono por Conexao": "Abandono (W.O.)",
  "Normal": "Fim de Jogo",
};

export default function GameResultOverlay({ result }: { result: MatchResult }) {
  const { session, updateSession } = useGame();

  const handleLeave = async () => {
    try {
      const res = await leaveRoom();
      updateSession(res.session);
    } catch (err: any) {
      showToast("error", err.message);
    }
  };

//  const viewerWon = result.viewer_won === true;
const viewerTeamId = session?.room?.players.find((p) => p.is_you)?.team_id;
const viewerWon = viewerTeamId !== undefined && viewerTeamId === result.winner_team_id;
const reasonText = REASON_LABELS[result.finish_reason ?? "completed"] ?? "Fim de Jogo";

  return (
    <div className="modal-overlay" style={{ zIndex: 200 }}>
      <div className="bg-card rounded-lg p-8 w-full max-w-sm border border-primary/50 text-center">
        {/* Victory / Defeat / Tie header */}
        <h2 className={`text-3xl font-display font-bold mb-1 ${
          result.is_tie ? "text-muted-foreground" : viewerWon ? "text-primary" : "text-destructive"
        }`}>
          {result.is_tie ? "Empate!" : viewerWon ? "🏆 Vitória!" : "😞 Derrota"}
        </h2>

        {/* Winner label */}
        <p className="text-lg text-foreground font-display mb-1">
          {result.winner_team_label || result.winner_label}
        </p>

        {/* Finish reason badge */}
        <span className="inline-block text-[10px] px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground mb-4">
          {reasonText}
        </span>

        {/* Scoreboard */}
        <div className="space-y-3 mb-6">
          {result.scoreboard.map((team) => (
            <div
              key={team.team_id}
              className={`p-3 rounded-md border ${
                team.team_id === result.winner_team_id
                  ? "border-primary bg-primary/10"
                  : "border-border bg-secondary"
              }`}
            >
              <div className="font-medium text-foreground">{team.label}</div>
              <div className="text-sm text-muted-foreground">{team.members.join(", ")}</div>
              <div className="text-2xl font-display font-bold text-primary mt-1">
                {team.points} pts
              </div>
            </div>
          ))}
        </div>

        {/* Ranked ELO change */}
        {session?.room?.ranked && result.elo_changes && session.user?.id && (
          <EloChangeBlock
            change={result.elo_changes[session.user.id] ?? 0}
            newElo={result.updated_elos?.[session.user.id]}
            shieldUsed={result.rank_shield?.[session.user.id]?.used}
          />
        )}

        <p className="text-xs text-muted-foreground mb-4">
          Pontuação: Ás=11, 7=10, Rei=4, Cavalo=3, Sota=2
        </p>

        <button
          onClick={handleLeave}
          className="w-full py-2.5 rounded-md bg-primary text-primary-foreground font-display font-semibold hover:opacity-90 transition-opacity"
        >
          Voltar ao Lobby
        </button>
      </div>
    </div>
  );
}

function EloChangeBlock({
  change,
  newElo,
  shieldUsed,
}: {
  change: number;
  newElo?: number;
  shieldUsed?: boolean;
}) {
  const [displayElo, setDisplayElo] = useState<number | undefined>(
    newElo !== undefined ? newElo - change : undefined
  );

  useEffect(() => {
    if (newElo === undefined) return;
    const start = newElo - change;
    const duration = 1200;
    const t0 = performance.now();
    let raf = 0;
    const step = (now: number) => {
      const p = Math.min(1, (now - t0) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setDisplayElo(Math.round(start + change * eased));
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [change, newElo]);

  const positive = change >= 0;
  const Icon = positive ? TrendingUp : TrendingDown;

  return (
    <div
      className={`mb-4 p-3 rounded-md border transition-all ${
        positive
          ? "border-primary/40 bg-primary/10"
          : "border-destructive/40 bg-destructive/10"
      }`}
    >
      <div className="flex items-center justify-center gap-2 mb-1">
        <Icon size={18} className={positive ? "text-primary" : "text-destructive"} />
        <span
          className={`text-2xl font-display font-bold tabular-nums ${
            positive ? "text-primary" : "text-destructive"
          }`}
        >
          {positive ? "+" : ""}
          {change} ELO
        </span>
      </div>
      {displayElo !== undefined && (
        <div className="text-xs text-muted-foreground">
          Novo ELO: <span className="text-foreground font-semibold tabular-nums">{displayElo}</span>
        </div>
      )}
      {shieldUsed && (
        <div className="mt-2 flex items-center justify-center gap-1 text-xs text-accent">
          <Shield size={12} /> Rank Shield consumido
        </div>
      )}
    </div>
  );
}
