import React from "react";
import type { MatchResult } from "@/lib/types";
import { useGame } from "@/contexts/GameContext";
import { leaveRoom } from "@/lib/api";
import { showToast } from "@/components/game/ToastManager";

export default function GameResultOverlay({ result }: { result: MatchResult }) {
  const { updateSession } = useGame();

  const handleLeave = async () => {
    try {
      const res = await leaveRoom();
      updateSession(res.session);
    } catch (err: any) {
      showToast("error", err.message);
    }
  };

  return (
    <div className="modal-overlay" style={{ zIndex: 200 }}>
      <div className="bg-card rounded-lg p-8 w-full max-w-sm border border-primary/50 text-center">
        <h2 className="text-3xl font-display font-bold text-primary mb-2">
          {result.is_tie ? "Empate!" : "🏆 Vitória!"}
        </h2>
        <p className="text-lg text-foreground font-display mb-6">
          {result.winner_label}
        </p>

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
