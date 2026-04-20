import React, { useState } from "react";
import { useGame } from "@/contexts/GameContext";
import { leaveRoom, selectPartner, startGame } from "@/lib/api";
import { showToast } from "@/components/game/ToastManager";
import ConnectionStatus from "@/components/game/ConnectionStatus";

export default function WaitingRoomScreen() {
  const { session, updateSession } = useGame();
  const [loading, setLoading] = useState(false);
  const room = session?.room;
  if (!room) return null;

  const handleLeave = async () => {
    setLoading(true);
    try {
      const res = await leaveRoom();
      updateSession(res.session);
    } catch (err: any) {
      showToast("error", err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleStart = async () => {
    setLoading(true);
    try {
      const res = await startGame(room.id);
      updateSession(res.session);
    } catch (err: any) {
      showToast("error", err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectPartner = async (partnerId: string) => {
    setLoading(true);
    try {
      const res = await selectPartner(room.id, { partner_user_id: partnerId });
      updateSession(res.session);
    } catch (err: any) {
      showToast("error", err.message);
    } finally {
      setLoading(false);
    }
  };

  const copyId = () => {
    navigator.clipboard.writeText(room.id);
    showToast("success", "ID copiado!");
  };

  const shareWhatsApp = () => {
    const text = `Vem jogar Bisca RS comigo! Entre na sala: ${room.id}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
  };

  const nonCreatorPlayers = room.players.filter((p) => !p.is_creator && !p.is_you);

  return (
    <div className="screen min-h-screen felt-bg p-4 flex items-center justify-center">
      <div className="w-full max-w-md">
        <div className="bg-card rounded-lg border border-border p-6">
          <div className="flex justify-end mb-2">
            <ConnectionStatus />
          </div>
          <div className="text-center mb-6">
            <h2 className="text-xl font-display font-bold text-foreground">Sala de Espera</h2>
            <div className="flex items-center justify-center gap-2 mt-2">
              <span className="font-mono text-2xl text-primary tracking-[0.3em]">{room.id}</span>
            </div>
            <div className="flex justify-center gap-2 mt-3">
              <button onClick={copyId} className="px-3 py-1 text-xs bg-secondary text-secondary-foreground rounded hover:bg-muted transition-colors">
                📋 Copiar ID
              </button>
              <button onClick={shareWhatsApp} className="px-3 py-1 text-xs bg-secondary text-secondary-foreground rounded hover:bg-muted transition-colors">
                📱 WhatsApp
              </button>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {room.mode} • {room.hand_size} cartas • {room.is_private ? "Privada" : "Pública"}
            </p>
          </div>

          {/* Players */}
          <div className="space-y-2 mb-6">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
              Jogadores ({room.players.length}/{room.capacity})
            </h3>
            {room.players.map((p) => (
              <div
                key={p.id}
                className={`flex items-center justify-between p-3 rounded-md border ${
                  p.connected ? "border-border bg-secondary" : "border-border/50 bg-secondary/50 opacity-60"
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${p.connected ? "bg-green-500" : "bg-muted-foreground"}`} />
                  <span className="text-foreground font-medium">{p.nickname}</span>
                  {p.is_creator && (
                    <span className="text-xs text-primary">👑</span>
                  )}
                  {p.is_you && (
                    <span className="text-xs text-muted-foreground">(você)</span>
                  )}
                  {room.partner_user_id === p.id && (
                    <span className="text-xs text-primary">🤝 dupla</span>
                  )}
                </div>
                {/* Partner selection for 2v2 */}
                {room.can_choose_partner && !p.is_creator && !p.is_you && room.viewer_is_creator && (
                  <button
                    onClick={() => handleSelectPartner(p.id)}
                    disabled={loading}
                    className="text-xs px-2 py-1 rounded bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50"
                  >
                    Escolher Dupla
                  </button>
                )}
              </div>
            ))}
            {Array.from({ length: room.capacity - room.players.length }).map((_, i) => (
              <div key={`empty-${i}`} className="p-3 rounded-md border border-dashed border-border/30 text-center text-muted-foreground text-sm">
                Aguardando jogador...
              </div>
            ))}
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <button
              onClick={handleLeave}
              disabled={loading}
              className="flex-1 py-2 rounded-md bg-secondary text-secondary-foreground hover:bg-muted transition-colors disabled:opacity-50"
            >
              Sair
            </button>
            {room.you_can_start && (
              <button
                onClick={handleStart}
                disabled={loading || !room.can_start}
                className="flex-1 py-2 rounded-md bg-primary text-primary-foreground font-display font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
                title={room.start_reason || ""}
              >
                {loading ? "Iniciando..." : "Iniciar Partida"}
              </button>
            )}
          </div>
          {room.viewer_is_creator && room.start_reason && !room.can_start && (
            <p className="text-xs text-muted-foreground text-center mt-2">{room.start_reason}</p>
          )}
        </div>
      </div>
    </div>
  );
}
