import React, { useEffect, useRef, useState } from "react";
import Card, { CardBack } from "@/components/game/Card";
import {
  initPractice,
  playCard,
  resolveTrick,
  chooseBotCard,
  cardPoints,
  type Difficulty,
  type PracticeState,
} from "@/lib/practice/biscaEngine";

interface Props {
  difficulty: Difficulty;
  onExit: () => void;
}

export default function PracticeGameScreen({ difficulty, onExit }: Props) {
  const [state, setState] = useState<PracticeState>(() => initPractice(difficulty));
  const timers = useRef<number[]>([]);

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      timers.current.forEach((t) => window.clearTimeout(t));
    };
  }, []);

  // Bot turn handler
  useEffect(() => {
    if (state.finished || state.resolving) return;
    if (state.turn !== "bot") return;
    const t = window.setTimeout(() => {
      const card = chooseBotCard(state);
      setState((s) => playCard(s, "bot", card.id));
    }, 700);
    timers.current.push(t);
    return () => window.clearTimeout(t);
  }, [state]);

  // Resolve trick after both players played
  useEffect(() => {
    if (!state.resolving) return;
    const t = window.setTimeout(() => {
      setState((s) => resolveTrick(s));
    }, 1200);
    timers.current.push(t);
    return () => window.clearTimeout(t);
  }, [state.resolving, state.trickNumber]);

  const playYour = (cardId: string) => {
    if (state.turn !== "you" || state.resolving || state.finished) return;
    setState((s) => playCard(s, "you", cardId));
  };

  const stockCount = state.stock.length + (state.trumpAvailable ? 1 : 0);

  const winnerLabel = (() => {
    if (!state.finished) return null;
    if (state.yourPoints > state.botPoints) return "vitoria";
    if (state.botPoints > state.yourPoints) return "derrota";
    return "empate";
  })();

  return (
    <div className="screen fixed inset-0 felt-bg flex flex-col overflow-hidden">
      {/* Top bar */}
      <div className="flex-none flex items-center justify-between px-3 py-1 bg-card/80 border-b border-border text-[11px]">
        <div>
          <span className="text-muted-foreground">Praticar </span>
          <span className="font-mono text-primary uppercase">{difficulty}</span>
          <span className="text-muted-foreground ml-2">Vaza #{state.trickNumber}</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-muted-foreground">
            Vez:{" "}
            <span className="text-foreground font-medium">
              {state.turn === "you" ? "Você" : "Bot"}
            </span>
          </span>
          <button
            onClick={onExit}
            className="px-2 py-0.5 rounded bg-destructive/80 text-destructive-foreground text-[10px] font-semibold hover:bg-destructive transition-colors"
          >
            🏳️ Sair
          </button>
        </div>
      </div>

      {/* Score bar */}
      <div className="flex-none flex justify-center gap-4 py-1 text-[10px]">
        <div className="text-center">
          <div className="text-muted-foreground">Bot</div>
          <div className="text-foreground font-semibold">{state.botPoints} pts</div>
        </div>
        <div className="text-center">
          <div className="text-muted-foreground">Você</div>
          <div className="text-foreground font-semibold">{state.yourPoints} pts</div>
        </div>
      </div>

      {/* Bot opponent */}
      <div className="flex-none flex flex-col items-center py-1">
        <div className="flex items-center gap-1">
          <div className="w-5 h-5 rounded-full bg-secondary flex items-center justify-center text-[8px] font-bold text-secondary-foreground">
            BO
          </div>
          <span
            className={`text-[9px] font-medium leading-none ${
              state.turn === "bot" ? "text-primary" : "text-muted-foreground"
            }`}
          >
            Bot {state.turn === "bot" && "⏳"}
          </span>
        </div>
        <div className="flex gap-0.5 mt-0.5">
          {state.botHand.map((_, i) => (
            <CardBack key={i} size="xs" />
          ))}
        </div>
      </div>

      {/* Trump + Stock centered above table */}
      <div
        className="relative flex flex-col items-center self-center"
        style={{ width: 72, height: 60 }}
      >
        <div className="relative" style={{ width: 48, height: 56 }}>
          {state.trumpAvailable && (
            <div
              className="absolute"
              style={{ transform: "rotate(-90deg)", top: 4, left: -45, zIndex: 1 }}
            >
              <Card card={state.trump} size="sm" />
            </div>
          )}
          {stockCount > 0 && state.stock.length > 0 && (
            <div className="absolute top-0 left-0" style={{ zIndex: 2 }}>
              <CardBack size="sm" count={stockCount} />
            </div>
          )}
        </div>
        <span className="text-[9px] text-primary font-display font-semibold uppercase leading-none mt-0.5">
          Trunfo{!state.trumpAvailable && `: ${state.trump.suit_label}`}
        </span>
      </div>

      {/* Table cards */}
      <div className="flex-1 flex flex-col items-center justify-center min-h-0 gap-1 px-2">
        <div className="flex gap-2 items-end justify-center min-h-[4.5rem] flex-wrap">
          {state.table.map((tp, idx) => {
            const isWinner =
              state.resolving &&
              state.lastTrick === null && // not yet resolved
              false;
            return (
              <div
                key={`${tp.player}-${tp.card.id}`}
                className="flex flex-col items-center gap-0.5"
                style={{ zIndex: idx + 1 }}
              >
                <Card card={tp.card} size="sm" isWinner={isWinner} />
                <span className="text-[9px] text-muted-foreground leading-none">
                  {tp.player === "you" ? "Você" : "Bot"}
                </span>
              </div>
            );
          })}
          {state.table.length === 0 && (
            <div className="w-14 h-20 border border-dashed border-border/30 rounded-lg flex items-center justify-center text-muted-foreground text-[9px]">
              Mesa vazia
            </div>
          )}
        </div>

        {state.lastTrick && !state.resolving && state.table.length === 0 && (
          <p className="text-[10px] text-muted-foreground">
            Última vaza:{" "}
            <span className="text-foreground">
              {state.lastTrick.winner === "you" ? "Você" : "Bot"}
            </span>{" "}
            ganhou ({state.lastTrick.cards.reduce((s, c) => s + cardPoints(c), 0)} pts)
          </p>
        )}
      </div>

      {/* Player hand 3x2 */}
      <div className="flex-none border-t border-border/30 bg-card/40 px-2 py-2">
        <div className="grid grid-cols-3 gap-1.5 w-fit mx-auto">
          {state.yourHand.map((card) => (
            <Card
              key={card.id}
              card={card}
              size="hand"
              playable={state.turn === "you" && !state.resolving && !state.finished}
              onClick={() => playYour(card.id)}
            />
          ))}
        </div>
      </div>

      {/* Result overlay */}
      {state.finished && (
        <div className="modal-overlay" style={{ zIndex: 200 }}>
          <div className="bg-card rounded-lg p-8 w-full max-w-sm border border-primary/50 text-center">
            <h2
              className={`text-3xl font-display font-bold mb-1 ${
                winnerLabel === "empate"
                  ? "text-muted-foreground"
                  : winnerLabel === "vitoria"
                  ? "text-primary"
                  : "text-destructive"
              }`}
            >
              {winnerLabel === "empate"
                ? "Empate!"
                : winnerLabel === "vitoria"
                ? "🏆 Vitória!"
                : "😞 Derrota"}
            </h2>
            <p className="text-lg text-foreground font-display mb-1">Modo Praticar</p>
            <span className="inline-block text-[10px] px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground mb-4">
              Dificuldade: {difficulty}
            </span>

            <div className="space-y-3 mb-6">
              <div
                className={`p-3 rounded-md border ${
                  state.yourPoints > state.botPoints
                    ? "border-primary bg-primary/10"
                    : "border-border bg-secondary"
                }`}
              >
                <div className="font-medium text-foreground">Você</div>
                <div className="text-2xl font-display font-bold text-primary mt-1">
                  {state.yourPoints} pts
                </div>
              </div>
              <div
                className={`p-3 rounded-md border ${
                  state.botPoints > state.yourPoints
                    ? "border-primary bg-primary/10"
                    : "border-border bg-secondary"
                }`}
              >
                <div className="font-medium text-foreground">Bot</div>
                <div className="text-2xl font-display font-bold text-primary mt-1">
                  {state.botPoints} pts
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setState(initPractice(difficulty))}
                className="flex-1 py-2.5 rounded-md bg-primary text-primary-foreground font-display font-semibold hover:opacity-90"
              >
                Jogar Novamente
              </button>
              <button
                onClick={onExit}
                className="flex-1 py-2.5 rounded-md bg-secondary text-secondary-foreground font-display font-semibold hover:bg-muted"
              >
                Sair
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
