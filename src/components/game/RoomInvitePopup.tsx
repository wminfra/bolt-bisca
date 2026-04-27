import React, { useEffect, useState } from "react";
import { useSocial } from "@/contexts/SocialContext";
import { useGame } from "@/contexts/GameContext";
import { joinRoom } from "@/lib/api";
import { showToast } from "@/components/game/ToastManager";

export default function RoomInvitePopup() {
  const { invite, dismissInvite } = useSocial();
  const { updateSession, screen } = useGame();
  const [now, setNow] = useState(Date.now());
  const [accepting, setAccepting] = useState(false);

  // Auto-dismiss when expired
  useEffect(() => {
    if (!invite) return;
    const id = setInterval(() => setNow(Date.now()), 100);
    return () => clearInterval(id);
  }, [invite]);

  useEffect(() => {
    if (!invite) return;
    const elapsed = (now - invite.received_at) / 1000;
    if (elapsed >= invite.expires_in) dismissInvite();
  }, [now, invite, dismissInvite]);

  // Hide during active game (not over waiting/lobby)
  if (!invite || screen === "game") return null;

  const elapsed = (now - invite.received_at) / 1000;
  const remaining = Math.max(0, invite.expires_in - elapsed);
  const progress = Math.max(0, Math.min(100, (remaining / invite.expires_in) * 100));

  const handleAccept = async () => {
    setAccepting(true);
    try {
      const res = await joinRoom({ room_id: invite.room_id });
      updateSession(res.session);
      dismissInvite();
    } catch (err: any) {
      if (err?.status === 403) {
        showToast("error", "Energia insuficiente ou sem permissão.");
      } else {
        showToast("error", err.message || "Não foi possível entrar na sala.");
      }
    } finally {
      setAccepting(false);
    }
  };

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] w-[calc(100%-2rem)] max-w-sm animate-in slide-in-from-top-4 duration-300">
      <div className="bg-card border border-primary/40 rounded-lg shadow-xl overflow-hidden">
        <div className="p-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-lg flex-shrink-0">
              ✉️
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-foreground">
                <span className="font-semibold text-primary">{invite.from_nickname}</span>{" "}
                te convidou para uma partida
                {invite.mode ? (
                  <>
                    {" "}de <span className="font-semibold">{invite.mode}</span>
                  </>
                ) : null}
                !
              </p>
              <p className="text-xs text-muted-foreground mt-0.5 font-mono">
                Sala: {invite.room_id}
              </p>
            </div>
          </div>
          <div className="flex gap-2 mt-3">
            <button
              onClick={dismissInvite}
              disabled={accepting}
              className="flex-1 py-2 text-sm rounded-md bg-secondary text-secondary-foreground hover:bg-muted disabled:opacity-50 transition-colors"
            >
              Recusar
            </button>
            <button
              onClick={handleAccept}
              disabled={accepting}
              className="flex-1 py-2 text-sm font-semibold rounded-md bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50 transition-opacity"
            >
              {accepting ? "Entrando..." : "Aceitar"}
            </button>
          </div>
        </div>
        {/* Timer bar */}
        <div className="h-1 bg-secondary">
          <div
            className="h-full bg-primary transition-[width] duration-100 ease-linear"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </div>
  );
}
