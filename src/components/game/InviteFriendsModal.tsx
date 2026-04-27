import React, { useEffect, useMemo, useState } from "react";
import { useSocial } from "@/contexts/SocialContext";
import { inviteFriendToRoom } from "@/lib/api";
import { showToast } from "@/components/game/ToastManager";

interface Props {
  onClose: () => void;
}

const COOLDOWN_MS = 12000;

export default function InviteFriendsModal({ onClose }: Props) {
  const { friends, loading, refresh } = useSocial();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [invitedAt, setInvitedAt] = useState<Record<string, number>>({});
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Tick to update cooldown UI
  useEffect(() => {
    if (Object.keys(invitedAt).length === 0) return;
    const id = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(id);
  }, [invitedAt]);

  const onlineFriends = useMemo(
    () =>
      friends
        .filter((f) => f.is_online)
        .sort((a, b) => a.nickname.localeCompare(b.nickname)),
    [friends]
  );

  const handleInvite = async (userId: string, nickname: string) => {
    setBusyId(userId);
    try {
      await inviteFriendToRoom(userId);
      showToast("success", `Convite enviado para ${nickname}`);
      setInvitedAt((s) => ({ ...s, [userId]: Date.now() }));
    } catch (err: any) {
      showToast("error", err?.message || "Falha ao convidar");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="bg-card rounded-lg w-full max-w-sm border border-border max-h-[85vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4 border-b border-border flex items-center justify-between">
          <h2 className="text-lg font-display font-bold text-foreground">
            Convidar Amigos
          </h2>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground transition-colors text-xl leading-none px-2"
            aria-label="Fechar"
          >
            ×
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {loading && onlineFriends.length === 0 ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-14 rounded-md bg-secondary/40 animate-pulse"
                />
              ))}
            </div>
          ) : onlineFriends.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              Nenhum amigo online no momento.
            </p>
          ) : (
            <div className="space-y-2">
              {onlineFriends.map((f) => {
                const sentAt = invitedAt[f.user_id];
                const remaining = sentAt
                  ? Math.max(0, COOLDOWN_MS - (now - sentAt))
                  : 0;
                const onCooldown = remaining > 0;
                const disabled = onCooldown || busyId === f.user_id;
                return (
                  <div
                    key={f.user_id}
                    className="flex items-center justify-between gap-2 p-3 rounded-md bg-secondary/40 border border-border"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="inline-block w-2.5 h-2.5 rounded-full bg-green-500 shadow-[0_0_6px_rgb(34_197_94_/_0.8)]" />
                      <span className="text-sm text-foreground truncate">
                        {f.nickname}
                      </span>
                    </div>
                    <button
                      onClick={() => handleInvite(f.user_id, f.nickname)}
                      disabled={disabled}
                      className="px-3 py-1 text-xs rounded bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity min-w-[88px]"
                    >
                      {onCooldown
                        ? `Enviado! ${Math.ceil(remaining / 1000)}s`
                        : busyId === f.user_id
                        ? "..."
                        : "Convidar"}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
