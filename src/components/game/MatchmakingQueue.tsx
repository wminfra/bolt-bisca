import React, { useEffect, useState } from "react";
import { Loader2, X } from "lucide-react";
import { useGame } from "@/contexts/GameContext";
import { leaveRankedQueue } from "@/lib/api";
import { showToast } from "@/components/game/ToastManager";

export default function MatchmakingQueue() {
  const { session, updateSession } = useGame();
  const ranked = session?.ranked;
  const [elapsed, setElapsed] = useState(0);
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    if (!ranked?.queued_at) return;
    const start = new Date(ranked.queued_at).getTime();
    const tick = () => setElapsed(Math.max(0, Math.floor((Date.now() - start) / 1000)));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [ranked?.queued_at]);

  const handleCancel = async () => {
    setCancelling(true);
    try {
      const res = await leaveRankedQueue();
      updateSession(res.session);
    } catch (err: any) {
      showToast("error", err.message);
    } finally {
      setCancelling(false);
    }
  };

  const mm = String(Math.floor(elapsed / 60)).padStart(2, "0");
  const ss = String(elapsed % 60).padStart(2, "0");

  const patent = session?.user?.patent ?? "sua patente";
  const mode = ranked?.queue_mode ?? "1v1";
  const hand = ranked?.queue_hand_size ?? 3;

  return (
    <div className="modal-overlay" style={{ zIndex: 150 }}>
      <div className="bg-card rounded-lg p-6 w-full max-w-sm border border-primary/40 text-center">
        <div className="flex justify-center mb-3">
          <div className="w-14 h-14 rounded-full bg-primary/15 flex items-center justify-center text-primary">
            <Loader2 size={28} className="animate-spin" />
          </div>
        </div>
        <h2 className="text-xl font-display font-bold text-foreground mb-1">
          Buscando Partida Ranqueada
        </h2>
        <p className="text-xs text-muted-foreground mb-4">
          Buscando adversários na {patent}...
        </p>

        <div className="grid grid-cols-2 gap-2 mb-4">
          <div className="p-2 rounded-md bg-secondary">
            <div className="text-[10px] text-muted-foreground uppercase">Modo</div>
            <div className="font-display font-semibold text-foreground">
              {mode} · {hand}
            </div>
          </div>
          <div className="p-2 rounded-md bg-secondary">
            <div className="text-[10px] text-muted-foreground uppercase">Tempo</div>
            <div className="font-display font-semibold text-primary tabular-nums">
              {mm}:{ss}
            </div>
          </div>
        </div>

        {ranked?.penalty_until && (
          <div className="text-xs text-destructive mb-3">
            Penalidade ativa até {new Date(ranked.penalty_until).toLocaleTimeString()}
          </div>
        )}

        <button
          onClick={handleCancel}
          disabled={cancelling}
          className="w-full py-2.5 rounded-md bg-destructive/90 text-destructive-foreground font-display font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
        >
          <X size={16} />
          {cancelling ? "Cancelando..." : "Cancelar Busca"}
        </button>
      </div>
    </div>
  );
}
