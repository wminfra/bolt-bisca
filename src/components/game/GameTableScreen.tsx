import React from "react";
import { useGame } from "@/contexts/GameContext";
import { sendWs } from "@/lib/websocket";
import Card, { CardBack } from "@/components/game/Card";
import type { RoomPlayerSnapshot, GameSnapshot, CardSnapshot } from "@/lib/types";
import GameResultOverlay from "@/components/game/GameResultOverlay";

export default function GameTableScreen() {
  const { session } = useGame();
  const room = session?.room;
  const game = room?.game;
  if (!room || !game) return null;

  const resolving = game.resolving === true;

  const playCard = (cardId: string) => {
    if (!game.you_can_play || resolving) return;
    sendWs({ type: "play_card", payload: { card_id: cardId } });
  };

  // Position opponents around the table based on seating
  const { seating_order, viewer_seat } = game;
  const totalPlayers = seating_order.length;
  const opponents = getOpponentPositions(room.players, seating_order, viewer_seat, totalPlayers);

  return (
    <div className="screen min-h-screen felt-bg flex flex-col relative overflow-hidden">
      {/* Ad placeholder top */}
      <div id="ad-top-banner">{/* Google AdSense */}</div>

      {/* Game info bar */}
      <div className="flex items-center justify-between px-4 py-2 bg-card/80 border-b border-border">
        <div className="text-sm">
          <span className="text-muted-foreground">Sala </span>
          <span className="font-mono text-primary">{room.id}</span>
          <span className="text-muted-foreground ml-3">Vaza #{game.trick_number}</span>
        </div>
        <div className="text-sm text-muted-foreground">
          Vez de: <span className="text-foreground font-medium">{game.turn_nickname}</span>
        </div>
        <ScoreBoard game={game} players={room.players} />
      </div>

      {/* Table area */}
      <div className="flex-1 flex items-center justify-center relative">
        {/* Opponents */}
        {opponents.map((opp) => (
          <OpponentHand key={opp.player.id} position={opp.position} player={opp.player} isTurn={opp.player.id === game.turn_player_id} />
        ))}

        {/* Center: table cards + trump */}
        <div className="flex flex-col items-center gap-4">
          {/* Trump & Stock */}
          <div className="relative flex items-center justify-center mb-4">
            {/* Trump card rotated 90° behind the stock */}
            {game.trump_available && game.trump_card && (
              <div className="absolute z-0" style={{ transform: "rotate(90deg)", left: "-8px" }}>
                <Card card={game.trump_card} size="sm" />
              </div>
            )}
            {/* Stock pile on top */}
            {game.stock_count > 0 && (
              <div className="relative z-10">
                <CardBack size="sm" count={game.stock_count} />
              </div>
            )}
            {/* Trump label */}
            <span className="ml-3 text-xs text-primary font-display font-semibold uppercase z-10">
              Trunfo{!game.trump_available && `: ${game.trump_suit}`}
            </span>
          </div>

          {/* Table cards */}
          <div className="flex gap-6 items-end min-h-[8rem]">
            {game.table_cards.map((tc, idx) => (
              <div key={tc.player_id} className="flex flex-col items-center gap-1" style={{ zIndex: idx + 1 }}>
                <Card
                  card={tc.card}
                  size="md"
                  isWinner={winningCardId === tc.card.id}
                />
                <span className="text-[10px] text-muted-foreground">{tc.nickname}</span>
              </div>
            ))}
            {game.table_cards.length === 0 && (
              <div className="w-20 h-28 border-2 border-dashed border-border/30 rounded-lg flex items-center justify-center text-muted-foreground text-xs">
                Mesa vazia
              </div>
            )}
          </div>

          {/* Last trick info */}
          {game.last_trick && !resolving && (
            <p className="text-xs text-muted-foreground">
              Última vaza: <span className="text-foreground">{game.last_trick.winner_nickname}</span> ganhou
            </p>
          )}
        </div>
      </div>

      {/* Player hand at bottom */}
      <div className="px-4 pb-6 pt-2">
        <div className="flex justify-center gap-2 sm:gap-3">
          {game.your_hand.map((card) => (
            <Card
              key={card.id}
              card={card}
              size="lg"
              playable={game.you_can_play && !resolving}
              onClick={() => playCard(card.id)}
            />
          ))}
        </div>
      </div>

      {/* Ad placeholder bottom */}
      <div id="ad-bottom-anchor">{/* Google AdSense / AdMob anchor */}</div>

      {/* Result overlay */}
      {game.result && <GameResultOverlay result={game.result} />}
    </div>
  );
}

// ScoreBoard
function ScoreBoard({ game, players }: { game: GameSnapshot; players: RoomPlayerSnapshot[] }) {
  // Group by team_id
  const teams = new Map<number, { names: string[]; captured: number }>();
  players.forEach((p) => {
    const tid = p.team_id ?? 0;
    const existing = teams.get(tid) || { names: [], captured: 0 };
    existing.names.push(p.nickname);
    existing.captured += p.captured_count;
    teams.set(tid, existing);
  });

  return (
    <div className="flex gap-3">
      {Array.from(teams.entries()).map(([tid, t]) => (
        <div key={tid} className="text-xs text-center">
          <div className="text-muted-foreground">{t.names.join(" & ")}</div>
          <div className="text-foreground font-semibold">{t.captured} capturadas</div>
        </div>
      ))}
    </div>
  );
}

// Opponent positions
type Position = "top" | "left" | "right";

function getOpponentPositions(
  players: RoomPlayerSnapshot[],
  seatingOrder: string[],
  viewerSeat: number,
  total: number
): { player: RoomPlayerSnapshot; position: Position }[] {
  const result: { player: RoomPlayerSnapshot; position: Position }[] = [];
  const positions2: Position[] = ["top"];
  const positions3: Position[] = ["left", "top", "right"];

  for (let i = 1; i < total; i++) {
    const seatIdx = (viewerSeat + i) % total;
    const playerId = seatingOrder[seatIdx];
    const player = players.find((p) => p.id === playerId);
    if (!player) continue;

    let pos: Position;
    if (total === 2) {
      pos = positions2[0];
    } else if (total === 4) {
      pos = positions3[i - 1] || "top";
    } else {
      pos = "top";
    }

    result.push({ player, position: pos });
  }
  return result;
}

function OpponentHand({ position, player, isTurn }: { position: Position; player: RoomPlayerSnapshot; isTurn: boolean }) {
  const posClasses: Record<Position, string> = {
    top: "absolute top-16 left-1/2 -translate-x-1/2",
    left: "absolute left-4 top-1/2 -translate-y-1/2",
    right: "absolute right-4 top-1/2 -translate-y-1/2",
  };

  const isHorizontal = position === "left" || position === "right";

  return (
    <div className={`${posClasses[position]} flex flex-col items-center gap-1 z-10`}>
      <span className={`text-xs font-medium ${isTurn ? "text-primary" : "text-muted-foreground"}`}>
        {player.nickname} {isTurn && "⏳"}
        {!player.connected && " 🔴"}
      </span>
      <div className={`flex ${isHorizontal ? "flex-col" : "flex-row"} gap-0.5`}>
        {Array.from({ length: player.hand_count }).map((_, i) => (
          <CardBack key={i} size="sm" />
        ))}
      </div>
    </div>
  );
}
