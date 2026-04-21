import React, { useState } from "react";
import { Swords } from "lucide-react";
import { useGame } from "@/contexts/GameContext";
import { joinRankedQueue } from "@/lib/api";
import { showToast } from "@/components/game/ToastManager";
import type { RoomMode } from "@/lib/types";

export default function RankedQueueButton() {
  const { updateSession } = useGame();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<RoomMode>("1v1");
  const [handSize, setHandSize] = useState<3 | 6>(3);
  const [loading, setLoading] = useState(false);

  const handleJoin = async () => {
    setLoading(true);
    try {
      const res = await joinRankedQueue({ mode, hand_size: handSize });
      updateSession(res.session);
      setOpen(false);
    } catch (err: any) {
      showToast("error", err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="w-full py-2.5 bg-gradient-to-r from-primary to-accent text-primary-foreground rounded-md font-display font-semibold hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
      >
        <Swords size={18} />
        Buscar Partida Ranqueada
      </button>

      {open && (
        <div className="modal-overlay" onClick={() => setOpen(false)}>
          <div
            className="bg-card rounded-lg p-6 w-full max-w-sm border border-border"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-xl font-display font-bold text-foreground mb-4">
              Fila Ranqueada
            </h2>

            <label className="block text-sm font-medium text-foreground mb-2">Modo</label>
            <div className="flex gap-2 mb-4">
              {(["1v1", "2v2"] as RoomMode[]).map((m) => (
                <button
                  key={m}
                  onClick={() => setMode(m)}
                  className={`flex-1 py-2 rounded-md text-sm font-semibold transition-colors ${
                    mode === m
                      ? "bg-primary text-primary-foreground"
                      : "bg-secondary text-secondary-foreground hover:bg-muted"
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>

            <label className="block text-sm font-medium text-foreground mb-2">Cartas</label>
            <div className="flex gap-2 mb-6">
              {([3, 6] as const).map((h) => (
                <button
                  key={h}
                  onClick={() => setHandSize(h)}
                  className={`flex-1 py-2 rounded-md text-sm font-semibold transition-colors ${
                    handSize === h
                      ? "bg-primary text-primary-foreground"
                      : "bg-secondary text-secondary-foreground hover:bg-muted"
                  }`}
                >
                  {h} cartas
                </button>
              ))}
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setOpen(false)}
                className="flex-1 py-2 rounded-md bg-secondary text-secondary-foreground hover:bg-muted transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleJoin}
                disabled={loading}
                className="flex-1 py-2 rounded-md bg-primary text-primary-foreground font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {loading ? "Entrando..." : "Entrar na Fila"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
