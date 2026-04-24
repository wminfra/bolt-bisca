import React, { useState, useEffect, useRef } from "react";
import { useGame } from "@/contexts/GameContext";
import { sendWs } from "@/lib/websocket";
import { surrender } from "@/lib/api";
import Card, { CardBack } from "@/components/game/Card";
import type { RoomPlayerSnapshot, GameSnapshot, TableCard } from "@/lib/types";
import GameResultOverlay from "@/components/game/GameResultOverlay";
import { showToast } from "@/components/game/ToastManager";
import ConnectionStatus from "@/components/game/ConnectionStatus";

// Minimum visual duration (ms) for showing the resolved trick on the table.
// The frontend enforces this window even if the backend clears `resolving` earlier.
const RESOLVE_MS = 2000;

export default function GameTableScreen() {
  const { session, updateSession } = useGame();
  const room = session?.room;
  const game = room?.game;
  const [surrendering, setSurrendering] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const lastTableCardsRef = useRef<TableCard[]>([]);

  // Cache the last non-empty table_cards so we can keep showing them
  // during the local resolution window even if the backend clears them.
  if (game && game.table_cards.length > 0) {
    lastTableCardsRef.current = game.table_cards;
  }

  // Schedule a re-render at the exact moment the local resolution window expires.
  const resolvedAt = game?.last_trick ? Date.parse(game.last_trick.resolved_at) : 0;
  const elapsed = now - resolvedAt;
  const showingTrick = !!game?.last_trick && resolvedAt > 0 && elapsed < RESOLVE_MS;

  useEffect(() => {
    if (!showingTrick) return;
    const remaining = Math.max(0, RESOLVE_MS - elapsed);
    const id = window.setTimeout(() => setNow(Date.now()), remaining + 16);
    return () => window.clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resolvedAt, showingTrick]);

  // Reset cached cards when the match ends to avoid stale UI on next match.
  useEffect(() => {
    if (room?.status === "finished") {
      lastTableCardsRef.current = [];
    }
  }, [room?.status]);

  if (!room || !game) return null;

  // Combined: backend says resolving OR we're inside the local 2s window.
  const resolving = game.resolving === true || showingTrick;

  // Cards to render on the table: prefer current backend state; fall back to
  // the cached snapshot if the backend already cleared while we're still inside
  // the local visual window.
  const tableCards =
    game.table_cards.length > 0
      ? game.table_cards
      : showingTrick
      ? lastTableCardsRef.current
      : [];

  const playCard = (cardId: string) => {
    if (!game.you_can_play || resolving) return;
    sendWs({ type: "play_card", payload: { card_id: cardId } });
  };

  const handleSurrender = async () => {
    if (!confirm("Tem certeza que deseja desistir? A vitória será dada ao adversário.")) return;
    setSurrendering(true);
    try {
      const res = await surrender();
      updateSession(res.session);
    } catch (err: any) {
      if (err.message?.includes("409") || err.message?.toLowerCase().includes("conflict")) {
        showToast("error", "Desistência não permitida neste momento.");
      } else {
        showToast("error", err.message ?? "Erro ao desistir.");
      }
    } finally {
      setSurrendering(false);
    }
  };

  const { seating_order, viewer_seat } = game;
  const totalPlayers = seating_order.length;
  const opponents = getOpponentSlots(room.players, seating_order, viewer_seat, totalPlayers);

  const topOpp = opponents.find((o) => o.slot === "top");
  const leftOpp = opponents.find((o) => o.slot === "left");
  const rightOpp = opponents.find((o) => o.slot === "right");

  return (
    <div className="screen fixed inset-0 felt-bg flex flex-col overflow-hidden">
      {/* Top bar */}
      <div className="flex-none flex items-center justify-between px-3 py-1 bg-card/80 border-b border-border text-[11px]">
        <div>
          <span className="text-muted-foreground">Sala </span>
          <span className="font-mono text-primary">{room.id}</span>
          <span className="text-muted-foreground ml-2">Vaza #{game.trick_number}</span>
        </div>
        <div className="flex items-center gap-2">
          <ConnectionStatus />
          <span className="text-muted-foreground">
            Vez: <span className="text-foreground font-medium">{game.turn_nickname}</span>
          </span>
          {room.status === "playing" && (
            <button
              onClick={handleSurrender}
              disabled={surrendering}
              className="px-2 py-0.5 rounded bg-destructive/80 text-destructive-foreground text-[10px] font-semibold hover:bg-destructive transition-colors disabled:opacity-50"
            >
              🏳️ Desistir
            </button>
          )}
        </div>
      </div>

      {/* Score bar */}
      <div className="flex-none">
        <ScoreBoard game={game} players={room.players} />
      </div>

      {/* Main game area */}
      <div className="flex-1 flex flex-col min-h-0">
        {/* Top opponent */}
        {topOpp && (
          <div className="flex-none flex flex-col items-center py-1">
            <OpponentLabel player={topOpp.player} isTurn={topOpp.player.id === game.turn_player_id} />
            <div className="flex gap-0.5 mt-0.5">
              {Array.from({ length: topOpp.player.hand_count }).map((_, i) => (
                <CardBack key={i} size="xs" />
              ))}
            </div>
          </div>
        )}

        {/* Trump + Stock — centered above table */}
        <TrumpStock game={game} />

        {/* Middle section: sides + center */}
        <div className="flex-1 flex min-h-0">
          {/* Left opponent */}
          {leftOpp ? (
            <div className="flex-none w-12 flex flex-col items-center justify-center gap-0.5 px-0.5">
              <OpponentLabel player={leftOpp.player} isTurn={leftOpp.player.id === game.turn_player_id} vertical />
              <div className="flex flex-col gap-0.5">
                {Array.from({ length: leftOpp.player.hand_count }).map((_, i) => (
                  <CardBack key={i} size="xs" />
                ))}
              </div>
            </div>
          ) : <div className="w-0" />}

          {/* Center area */}
          <div className="flex-1 flex flex-col items-center justify-center min-h-0 gap-1">

            {/* Table cards */}
            <div className="flex gap-2 items-end justify-center min-h-[4.5rem] flex-wrap">
              {game.table_cards.map((tc, idx) => {
                const isWinner = resolving && game.last_trick
                  ? game.last_trick.winning_card.id === tc.card.id
                  : false;
                return (
                  <div key={tc.player_id} className="flex flex-col items-center gap-0.5" style={{ zIndex: idx + 1 }}>
                    <Card card={tc.card} size="sm" isWinner={isWinner} />
                    <span className="text-[9px] text-muted-foreground leading-none">{tc.nickname}</span>
                  </div>
                );
              })}
              {game.table_cards.length === 0 && (
                <div className="w-14 h-20 border border-dashed border-border/30 rounded-lg flex items-center justify-center text-muted-foreground text-[9px]">
                  Mesa vazia
                </div>
              )}
            </div>

            {game.last_trick && !resolving && (
              <p className="text-[10px] text-muted-foreground">
                Última vaza: <span className="text-foreground">{game.last_trick.winner_nickname}</span> ganhou
              </p>
            )}
          </div>

          {/* Right opponent */}
          {rightOpp ? (
            <div className="flex-none w-12 flex flex-col items-center justify-center gap-0.5 px-0.5">
              <OpponentLabel player={rightOpp.player} isTurn={rightOpp.player.id === game.turn_player_id} vertical />
              <div className="flex flex-col gap-0.5">
                {Array.from({ length: rightOpp.player.hand_count }).map((_, i) => (
                  <CardBack key={i} size="xs" />
                ))}
              </div>
            </div>
          ) : <div className="w-0" />}
        </div>
      </div>

      {/* Player hand — 3x2 grid */}
      <div className="flex-none border-t border-border/30 bg-card/40 px-2 py-2">
        <div className="grid grid-cols-3 gap-1.5 w-fit mx-auto">
          {game.your_hand.map((card) => (
            <Card
              key={card.id}
              card={card}
              size="hand"
              playable={game.you_can_play && !resolving}
              onClick={() => playCard(card.id)}
            />
          ))}
        </div>
      </div>

      {/* Result overlay */}
      {game.result && <GameResultOverlay result={game.result} />}
    </div>
  );
}

/* ── Trump & Stock ── */
function TrumpStock({ game }: { game: GameSnapshot }) {
  return (
    <div className="relative flex flex-col items-center self-center" style={{ width: 72, height: 60 }}>
      <div className="relative" style={{ width: 48, height: 56 }}>
        {game.trump_available && game.trump_card && (
          <div
            className="absolute"
            style={{ transform: "rotate(-90deg)", top: 4, left: -45, zIndex: 1 }}
          >
            <Card card={game.trump_card} size="sm" />
          </div>
        )}
        {game.stock_count > 0 && (
          <div className="absolute top-0 left-0" style={{ zIndex: 2 }}>
            <CardBack size="sm" count={game.stock_count} />
          </div>
        )}
      </div>
      <span className="text-[9px] text-primary font-display font-semibold uppercase leading-none mt-0.5">
        Trunfo{!game.trump_available && `: ${game.trump_suit}`}
      </span>
    </div>
  );
}

/* ── ScoreBoard ── */
function ScoreBoard({ game, players }: { game: GameSnapshot; players: RoomPlayerSnapshot[] }) {
  const teams = new Map<number, { names: string[]; captured: number }>();
  players.forEach((p) => {
    const tid = p.team_id ?? 0;
    const existing = teams.get(tid) || { names: [], captured: 0 };
    existing.names.push(p.nickname);
    existing.captured += p.captured_count;
    teams.set(tid, existing);
  });

  return (
    <div className="flex justify-center gap-4 py-1 text-[10px]">
      {Array.from(teams.entries()).map(([tid, t]) => (
        <div key={tid} className="text-center">
          <div className="text-muted-foreground">{t.names.join(" & ")}</div>
          <div className="text-foreground font-semibold">{t.captured} capturadas</div>
        </div>
      ))}
    </div>
  );
}

/* ── Opponent label with connection feedback ── */
function OpponentLabel({ player, isTurn, vertical }: { player: RoomPlayerSnapshot; isTurn: boolean; vertical?: boolean }) {
  const initials = player.nickname.slice(0, 2).toUpperCase();
  const disconnected = !player.connected;

  return (
    <div className={`flex items-center gap-1 ${vertical ? "flex-col" : ""} ${disconnected ? "opacity-50 grayscale" : ""}`}>
      <div className="relative">
        <div className="w-5 h-5 rounded-full bg-secondary flex items-center justify-center text-[8px] font-bold text-secondary-foreground">
          {initials}
        </div>
        {disconnected && (
          <div className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-destructive flex items-center justify-center text-[6px] text-destructive-foreground leading-none">
            ⚡
          </div>
        )}
      </div>
      <span className={`text-[9px] font-medium leading-none ${isTurn ? "text-primary" : "text-muted-foreground"} ${vertical ? "writing-mode-vertical" : ""}`}>
        {player.nickname}
        {isTurn && " ⏳"}
      </span>
    </div>
  );
}

/* ── Opponent positions ── */
type Slot = "top" | "left" | "right";

function getOpponentSlots(
  players: RoomPlayerSnapshot[],
  seatingOrder: string[],
  viewerSeat: number,
  total: number
): { player: RoomPlayerSnapshot; slot: Slot }[] {
  const result: { player: RoomPlayerSnapshot; slot: Slot }[] = [];
  const slotMap2: Slot[] = ["top"];
  const slotMap4: Slot[] = ["left", "top", "right"];

  for (let i = 1; i < total; i++) {
    const seatIdx = (viewerSeat + i) % total;
    const playerId = seatingOrder[seatIdx];
    const player = players.find((p) => p.id === playerId);
    if (!player) continue;

    let slot: Slot;
    if (total === 2) {
      slot = slotMap2[0];
    } else if (total === 4) {
      slot = slotMap4[i - 1] || "top";
    } else {
      slot = "top";
    }
    result.push({ player, slot });
  }
  return result;
}
