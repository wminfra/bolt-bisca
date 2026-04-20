import React from "react";
import type { MatchResult } from "@/lib/types";
import { useGame } from "@/contexts/GameContext";
import { leaveRoom } from "@/lib/api";
import { showToast } from "@/components/game/ToastManager";

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
