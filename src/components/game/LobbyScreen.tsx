import React, { useState, useEffect, useContext } from "react";
import { useGame } from "@/contexts/GameContext";
import { getPublicRooms, createRoom, joinRoom } from "@/lib/api";
import { showToast } from "@/components/game/ToastManager";
import type { PublicRoom, RoomMode } from "@/lib/types";
import { PracticeCtx } from "@/contexts/PracticeContext";
import type { Difficulty } from "@/lib/practice/biscaEngine";
import ConnectionStatus from "@/components/game/ConnectionStatus";
import PlayerProfileCard from "@/components/game/PlayerProfileCard";
import RankedQueueButton from "@/components/game/RankedQueueButton";
import MatchmakingQueue from "@/components/game/MatchmakingQueue";

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

  const energy = session?.user?.energy;
  const hasEnergy = energy === undefined || energy >= 1;

  const handleNoEnergy = () => {
    showToast("error", "Energia insuficiente! Aguarde a recarga ou suba de nível.");
  };

  const handleApiEnergyError = (err: any) => {
    if (err?.status === 403) {
      showToast("error", "Energia insuficiente! Aguarde a recarga ou suba de nível.");
    } else {
      showToast("error", err.message);
    }
  };

  const handleJoinById = async () => {
    if (!hasEnergy) return handleNoEnergy();
    const id = joinId.trim().toUpperCase();
    if (id.length !== 5) return showToast("error", "ID deve ter 5 caracteres");
    setLoading(true);
    try {
      const res = await joinRoom({ room_id: id });
      updateSession(res.session);
    } catch (err: any) {
      handleApiEnergyError(err);
    } finally {
      setLoading(false);
    }
  };

  const handleJoinRoom = async (roomId: string) => {
    if (!hasEnergy) return handleNoEnergy();
    setLoading(true);
    try {
      const res = await joinRoom({ room_id: roomId });
      updateSession(res.session);
    } catch (err: any) {
      handleApiEnergyError(err);
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
          <div className="flex items-center gap-3">
            <ConnectionStatus />
            <button
              onClick={logout}
              className="text-sm text-muted-foreground hover:text-accent transition-colors"
            >
              Sair
            </button>
          </div>
        </div>

        {/* Player profile */}
        <PlayerProfileCard />

        {/* Ad placeholder */}
        <div id="ad-top-banner">{/* Google AdSense banner */}</div>

        {/* Actions */}
        <div className="flex flex-col gap-3 mb-6">
          <RankedQueueButton />
          <button
            onClick={() => setShowPracticeModal(true)}
            className="w-full py-2.5 bg-accent text-accent-foreground rounded-md font-display font-semibold hover:opacity-90 transition-opacity"
          >
            🎯 Modo Praticar (Single Player)
          </button>
          <div className="flex gap-3">
            <button
              onClick={() => (hasEnergy ? setShowCreateModal(true) : handleNoEnergy())}
              disabled={!hasEnergy}
              title={!hasEnergy ? "Energia insuficiente" : undefined}
              className="flex-1 py-2.5 bg-primary text-primary-foreground rounded-md font-display font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
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
                disabled={loading || !hasEnergy}
                title={!hasEnergy ? "Energia insuficiente" : undefined}
                className="px-4 py-2 bg-secondary text-secondary-foreground rounded-md hover:bg-muted transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Entrar
              </button>
            </div>
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

      {/* Practice Modal */}
      {showPracticeModal && (
        <PracticeModal
          onClose={() => setShowPracticeModal(false)}
          onStart={(d) => {
            setShowPracticeModal(false);
            practice.start(d);
          }}
        />
      )}

      {/* Matchmaking overlay */}
      {session?.ranked?.in_queue && <MatchmakingQueue />}
    </div>
  );
}

function PracticeModal({
  onClose,
  onStart,
}: {
  onClose: () => void;
  onStart: (d: Difficulty) => void;
}) {
  const [difficulty, setDifficulty] = useState<Difficulty>("medium");

  const labels: Record<Difficulty, { title: string; desc: string }> = {
    easy: { title: "Fácil", desc: "Bot joga cartas aleatórias" },
    medium: { title: "Médio", desc: "Bot avalia vazas valiosas" },
    hard: { title: "Difícil", desc: "Bot conta cartas e guarda trunfos" },
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="bg-card rounded-lg p-6 w-full max-w-sm border border-border"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-xl font-display font-bold text-foreground mb-1">Modo Praticar</h2>
        <p className="text-xs text-muted-foreground mb-4">
          Jogue contra o bot offline. Sem ranking ou persistência.
        </p>

        <label className="block text-sm font-medium text-foreground mb-2">Dificuldade</label>
        <div className="space-y-2 mb-4">
          {(Object.keys(labels) as Difficulty[]).map((d) => (
            <button
              key={d}
              onClick={() => setDifficulty(d)}
              className={`w-full text-left p-3 rounded-md border transition-colors ${
                difficulty === d
                  ? "border-primary bg-primary/10"
                  : "border-border bg-secondary hover:bg-muted"
              }`}
            >
              <div className="font-display font-semibold text-foreground">{labels[d].title}</div>
              <div className="text-xs text-muted-foreground">{labels[d].desc}</div>
            </button>
          ))}
        </div>

        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 py-2 rounded-md bg-secondary text-secondary-foreground hover:bg-muted transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={() => onStart(difficulty)}
            className="flex-1 py-2 rounded-md bg-primary text-primary-foreground font-semibold hover:opacity-90 transition-opacity"
          >
            Começar
          </button>
        </div>
      </div>
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
