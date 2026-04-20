import React, { useState, useEffect, useContext } from "react";
import { useGame } from "@/contexts/GameContext";
import { getPublicRooms, createRoom, joinRoom } from "@/lib/api";
import { showToast } from "@/components/game/ToastManager";
import type { PublicRoom, RoomMode } from "@/lib/types";
import { PracticeCtx } from "@/components/game/BiscaGame";
import type { Difficulty } from "@/lib/practice/biscaEngine";

export default function LobbyScreen() {
  const { session, updateSession, logout } = useGame();
  const practice = useContext(PracticeCtx);
  const [rooms, setRooms] = useState<PublicRoom[]>(session?.public_rooms || []);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showPracticeModal, setShowPracticeModal] = useState(false);
  const [joinId, setJoinId] = useState("");
  const [loading, setLoading] = useState(false);

  // Refresh rooms periodically
  useEffect(() => {
    const refresh = async () => {
      try {
        const res = await getPublicRooms();
        setRooms(res.rooms);
      } catch { /* ignore */ }
    };
    refresh();
    const interval = setInterval(refresh, 5000);
    return () => clearInterval(interval);
  }, []);

  // Sync from session updates
  useEffect(() => {
    if (session?.public_rooms) setRooms(session.public_rooms);
  }, [session?.public_rooms]);

  const handleJoinById = async () => {
    const id = joinId.trim().toUpperCase();
    if (id.length !== 5) return showToast("error", "ID deve ter 5 caracteres");
    setLoading(true);
    try {
      const res = await joinRoom({ room_id: id });
      updateSession(res.session);
    } catch (err: any) {
      showToast("error", err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleJoinRoom = async (roomId: string) => {
    setLoading(true);
    try {
      const res = await joinRoom({ room_id: roomId });
      updateSession(res.session);
    } catch (err: any) {
      showToast("error", err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="screen min-h-screen felt-bg p-4">
      {/* Header */}
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-display font-bold text-primary">Bisca RS</h1>
            <p className="text-sm text-muted-foreground">
              Olá, <span className="text-foreground font-medium">{session?.user.nickname}</span>
            </p>
          </div>
          <button
            onClick={logout}
            className="text-sm text-muted-foreground hover:text-accent transition-colors"
          >
            Sair
          </button>
        </div>

        {/* Ad placeholder */}
        <div id="ad-top-banner">{/* Google AdSense banner */}</div>

        {/* Actions */}
        <div className="flex gap-3 mb-6">
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex-1 py-2.5 bg-primary text-primary-foreground rounded-md font-display font-semibold hover:opacity-90 transition-opacity"
          >
            Criar Sala
          </button>
          <div className="flex-1 flex gap-2">
            <input
              type="text"
              value={joinId}
              onChange={(e) => setJoinId(e.target.value.toUpperCase())}
              placeholder="ID da sala"
              maxLength={5}
              className="flex-1 px-3 py-2 rounded-md bg-secondary text-secondary-foreground border border-border focus:outline-none focus:ring-2 focus:ring-primary uppercase tracking-widest text-center font-mono"
            />
            <button
              onClick={handleJoinById}
              disabled={loading}
              className="px-4 py-2 bg-secondary text-secondary-foreground rounded-md hover:bg-muted transition-colors disabled:opacity-50"
            >
              Entrar
            </button>
          </div>
        </div>

        {/* Room list */}
        <div>
          <h2 className="text-lg font-display font-semibold text-foreground mb-3">Salas Públicas</h2>
          {rooms.length === 0 ? (
            <div className="text-center text-muted-foreground py-12 bg-card rounded-lg border border-border">
              Nenhuma sala disponível. Crie uma!
            </div>
          ) : (
            <div className="space-y-2">
              {rooms.map((room) => (
                <div
                  key={room.id}
                  className="flex items-center justify-between p-4 bg-card rounded-lg border border-border hover:border-primary/40 transition-colors"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-primary text-sm tracking-wider">{room.id}</span>
                      <span className="text-xs px-2 py-0.5 rounded bg-secondary text-secondary-foreground">
                        {room.mode}
                      </span>
                      <span className="text-xs text-muted-foreground">{room.hand_size} cartas</span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      {room.player_nicknames.join(", ")} ({room.players}/{room.capacity})
                    </p>
                  </div>
                  <button
                    onClick={() => handleJoinRoom(room.id)}
                    disabled={loading || room.players >= room.capacity}
                    className="px-4 py-1.5 bg-primary text-primary-foreground rounded-md text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
                  >
                    Entrar
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Create Room Modal */}
      {showCreateModal && (
        <CreateRoomModal
          onClose={() => setShowCreateModal(false)}
          onCreated={(session) => updateSession(session)}
        />
      )}
    </div>
  );
}

function CreateRoomModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (session: any) => void;
}) {
  const [mode, setMode] = useState<RoomMode>("1v1");
  const [handSize, setHandSize] = useState<3 | 6>(3);
  const [isPrivate, setIsPrivate] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleCreate = async () => {
    setLoading(true);
    try {
      const res = await createRoom({ mode, hand_size: handSize, is_private: isPrivate });
      onCreated(res.session);
    } catch (err: any) {
      showToast("error", err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="bg-card rounded-lg p-6 w-full max-w-sm border border-border"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-xl font-display font-bold text-foreground mb-4">Criar Sala</h2>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Modo</label>
            <div className="flex gap-2">
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
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Cartas na Mão</label>
            <div className="flex gap-2">
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
          </div>

          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={isPrivate}
              onChange={(e) => setIsPrivate(e.target.checked)}
              className="w-4 h-4 accent-primary"
            />
            <span className="text-sm text-foreground">Sala Privada</span>
          </label>

          <div className="flex gap-2 pt-2">
            <button
              onClick={onClose}
              className="flex-1 py-2 rounded-md bg-secondary text-secondary-foreground hover:bg-muted transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleCreate}
              disabled={loading}
              className="flex-1 py-2 rounded-md bg-primary text-primary-foreground font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {loading ? "Criando..." : "Criar"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
