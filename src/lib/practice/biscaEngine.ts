// ============================================================
// Bisca Single-Player Engine
// 100% client-side. No server calls.
// ============================================================
import type { CardSnapshot, Suit } from "@/lib/types";

export type Difficulty = "easy" | "medium" | "hard";
export type PlayerId = "you" | "bot";

const SUITS: Suit[] = ["oros", "copas", "espadas", "bastos"];
const SUIT_LABELS: Record<Suit, string> = {
  oros: "Ouros",
  copas: "Copas",
  espadas: "Espadas",
  bastos: "Paus",
};

// Ranks present in Bisca deck (40 cards): 1..7, 10, 11, 12 (no 8, 9)
const RANKS: { rank: number; label: string; points: number; strength: number }[] = [
  { rank: 1, label: "Ás", points: 11, strength: 10 },
  { rank: 7, label: "7", points: 10, strength: 9 },
  { rank: 12, label: "Rei", points: 4, strength: 8 },
  { rank: 11, label: "Valete", points: 3, strength: 7 },
  { rank: 10, label: "Cavalo", points: 2, strength: 6 },
  { rank: 6, label: "6", points: 0, strength: 5 },
  { rank: 5, label: "5", points: 0, strength: 4 },
  { rank: 4, label: "4", points: 0, strength: 3 },
  { rank: 3, label: "3", points: 0, strength: 2 },
  { rank: 2, label: "2", points: 0, strength: 1 },
];

export function rankInfo(rank: number) {
  return RANKS.find((r) => r.rank === rank)!;
}

export function cardPoints(card: CardSnapshot): number {
  return rankInfo(card.rank).points;
}

function cardStrength(rank: number): number {
  return rankInfo(rank).strength;
}

function makeCard(suit: Suit, rank: number): CardSnapshot {
  const info = rankInfo(rank);
  return {
    id: `${suit}-${rank}`,
    suit,
    suit_label: SUIT_LABELS[suit],
    rank,
    rank_label: info.label,
    points: info.points,
  };
}

function buildDeck(): CardSnapshot[] {
  const deck: CardSnapshot[] = [];
  for (const s of SUITS) for (const r of RANKS) deck.push(makeCard(s, r.rank));
  return deck;
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export interface TablePlay {
  player: PlayerId;
  card: CardSnapshot;
}

export interface PracticeState {
  difficulty: Difficulty;
  trump: CardSnapshot;          // The flipped trump card
  trumpSuit: Suit;
  stock: CardSnapshot[];        // Remaining draw pile (excluding trump)
  trumpAvailable: boolean;      // True until trump card is taken
  yourHand: CardSnapshot[];
  botHand: CardSnapshot[];
  yourCaptured: CardSnapshot[];
  botCaptured: CardSnapshot[];
  table: TablePlay[];
  turn: PlayerId;               // Whose turn to play
  leader: PlayerId;             // Who led this trick
  trickNumber: number;
  resolving: boolean;           // Briefly true while showing the resolved trick
  lastTrick: { winner: PlayerId; cards: CardSnapshot[] } | null;
  finished: boolean;
  yourPoints: number;
  botPoints: number;
  // Card counting (for hard bot)
  seen: CardSnapshot[];         // All cards revealed (played + trump)
}

export function initPractice(difficulty: Difficulty): PracticeState {
  const deck = shuffle(buildDeck());
  const yourHand = deck.splice(0, 3);
  const botHand = deck.splice(0, 3);
  const trump = deck.pop()!; // Bottom of stock = trump
  const stock = deck;        // Remaining (will be drawn from top)
  // Random who starts
  const leader: PlayerId = Math.random() < 0.5 ? "you" : "bot";

  return {
    difficulty,
    trump,
    trumpSuit: trump.suit,
    stock,
    trumpAvailable: true,
    yourHand,
    botHand,
    yourCaptured: [],
    botCaptured: [],
    table: [],
    turn: leader,
    leader,
    trickNumber: 1,
    resolving: false,
    lastTrick: null,
    finished: false,
    yourPoints: 0,
    botPoints: 0,
    seen: [trump],
  };
}

// Determine winner of a 2-card trick
export function trickWinner(plays: TablePlay[], trumpSuit: Suit): PlayerId {
  const [first, second] = plays;
  const firstIsTrump = first.card.suit === trumpSuit;
  const secondIsTrump = second.card.suit === trumpSuit;

  if (firstIsTrump && secondIsTrump) {
    return cardStrength(first.card.rank) >= cardStrength(second.card.rank) ? first.player : second.player;
  }
  if (firstIsTrump) return first.player;
  if (secondIsTrump) return second.player;
  // Same suit: highest strength wins. Different suit (no trump): first wins.
  if (first.card.suit === second.card.suit) {
    return cardStrength(first.card.rank) >= cardStrength(second.card.rank) ? first.player : second.player;
  }
  return first.player;
}

// Apply a played card. Mutates a copy and returns new state.
export function playCard(state: PracticeState, player: PlayerId, cardId: string): PracticeState {
  if (state.finished || state.resolving) return state;
  if (state.turn !== player) return state;

  const hand = player === "you" ? [...state.yourHand] : [...state.botHand];
  const idx = hand.findIndex((c) => c.id === cardId);
  if (idx < 0) return state;
  const card = hand.splice(idx, 1)[0];

  const table = [...state.table, { player, card }];
  const next: PracticeState = {
    ...state,
    yourHand: player === "you" ? hand : state.yourHand,
    botHand: player === "bot" ? hand : state.botHand,
    table,
    seen: [...state.seen, card],
  };

  if (table.length === 1) {
    // Pass turn to other player
    next.turn = player === "you" ? "bot" : "you";
    return next;
  }

  // Trick complete — mark resolving
  next.resolving = true;
  return next;
}

// Resolve the trick: assign captured cards, draw, and start next trick
export function resolveTrick(state: PracticeState): PracticeState {
  if (!state.resolving || state.table.length !== 2) return state;
  const winner = trickWinner(state.table, state.trumpSuit);
  const trickCards = state.table.map((t) => t.card);
  const trickPoints = trickCards.reduce((s, c) => s + cardPoints(c), 0);

  let yourCaptured = state.yourCaptured;
  let botCaptured = state.botCaptured;
  let yourPoints = state.yourPoints;
  let botPoints = state.botPoints;

  if (winner === "you") {
    yourCaptured = [...yourCaptured, ...trickCards];
    yourPoints += trickPoints;
  } else {
    botCaptured = [...botCaptured, ...trickCards];
    botPoints += trickPoints;
  }

  // Draw cards: winner first, then loser
  let stock = [...state.stock];
  let yourHand = [...state.yourHand];
  let botHand = [...state.botHand];
  let trumpAvailable = state.trumpAvailable;
  const trumpCard = state.trump;

  const drawOne = (who: PlayerId) => {
    if (stock.length > 0) {
      const c = stock.shift()!;
      if (who === "you") yourHand.push(c);
      else botHand.push(c);
    } else if (trumpAvailable) {
      // Last card of stock = trump
      if (who === "you") yourHand.push(trumpCard);
      else botHand.push(trumpCard);
      trumpAvailable = false;
    }
  };

  const loser: PlayerId = winner === "you" ? "bot" : "you";
  drawOne(winner);
  drawOne(loser);

  const finished = yourHand.length === 0 && botHand.length === 0;

  return {
    ...state,
    yourCaptured,
    botCaptured,
    yourPoints,
    botPoints,
    yourHand,
    botHand,
    stock,
    trumpAvailable,
    table: [],
    resolving: false,
    lastTrick: { winner, cards: trickCards },
    leader: winner,
    turn: winner,
    trickNumber: state.trickNumber + 1,
    finished,
  };
}

// ─── Bot AI ────────────────────────────────────────────────
export function chooseBotCard(state: PracticeState): CardSnapshot {
  const hand = state.botHand;
  if (state.difficulty === "easy") {
    return hand[Math.floor(Math.random() * hand.length)];
  }
  if (state.difficulty === "medium") return mediumBot(state);
  return hardBot(state);
}

function lowestNonTrump(hand: CardSnapshot[], trumpSuit: Suit): CardSnapshot {
  const nonTrump = hand.filter((c) => c.suit !== trumpSuit);
  const pool = nonTrump.length > 0 ? nonTrump : hand;
  return [...pool].sort((a, b) => cardPoints(a) - cardPoints(b) || cardStrength(a.rank) - cardStrength(b.rank))[0];
}

function mediumBot(state: PracticeState): CardSnapshot {
  const hand = state.botHand;
  const trumpSuit = state.trumpSuit;

  // If bot is leading
  if (state.table.length === 0) {
    // Lead with low non-trump
    return lowestNonTrump(hand, trumpSuit);
  }

  // Bot is responding
  const opp = state.table[0].card;
  const oppPoints = cardPoints(opp);
  const oppIsTrump = opp.suit === trumpSuit;

  // Try to win if trick is valuable
  const valuable = oppPoints >= 4;

  // Cards that beat opponent
  const winners = hand.filter((c) => {
    const trial: TablePlay[] = [state.table[0], { player: "bot", card: c }];
    return trickWinner(trial, trumpSuit) === "bot";
  });

  if (valuable && winners.length > 0) {
    // Use the cheapest winner (prefer non-trump winners)
    const nonTrumpWin = winners.filter((c) => c.suit !== trumpSuit);
    const pool = nonTrumpWin.length > 0 ? nonTrumpWin : winners;
    return [...pool].sort((a, b) => cardStrength(a.rank) - cardStrength(b.rank))[0];
  }

  // Not valuable or can't win → discard lowest
  return lowestNonTrump(hand, trumpSuit);
}

function hardBot(state: PracticeState): CardSnapshot {
  const hand = state.botHand;
  const trumpSuit = state.trumpSuit;
  const stockLeft = state.stock.length + (state.trumpAvailable ? 1 : 0);
  const endgame = stockLeft === 0;

  // Track unseen high cards
  const seenIds = new Set(state.seen.map((c) => c.id));
  hand.forEach((c) => seenIds.add(c.id)); // own hand counts as known
  const unseenTrumpsHigh = (["1", "7", "12"] as const).some((r) => {
    const id = `${trumpSuit}-${r}`;
    return !seenIds.has(id);
  });

  // Bot leading
  if (state.table.length === 0) {
    if (endgame) {
      // Endgame: play strongest if trick will likely win
      const best = [...hand].sort((a, b) => cardStrength(b.rank) - cardStrength(a.rank))[0];
      return best;
    }
    // Avoid leading high cards or trumps; lead a 2/3/4/5/6 of non-trump
    const lowNonTrump = hand
      .filter((c) => c.suit !== trumpSuit && cardPoints(c) === 0)
      .sort((a, b) => cardStrength(a.rank) - cardStrength(b.rank))[0];
    if (lowNonTrump) return lowNonTrump;
    return lowestNonTrump(hand, trumpSuit);
  }

  // Bot responding
  const opp = state.table[0].card;
  const oppPoints = cardPoints(opp);

  const winners = hand.filter((c) => {
    const trial: TablePlay[] = [state.table[0], { player: "bot", card: c }];
    return trickWinner(trial, trumpSuit) === "bot";
  });

  // Always try to win valuable tricks (>= 10 points)
  if (oppPoints >= 10 && winners.length > 0) {
    // Use cheapest winner; prefer non-trump
    const nonTrumpWin = winners.filter((c) => c.suit !== trumpSuit);
    const pool = nonTrumpWin.length > 0 ? nonTrumpWin : winners;
    return [...pool].sort((a, b) => cardStrength(a.rank) - cardStrength(b.rank))[0];
  }

  // For medium tricks (4-9 pts), win only with cheap non-trump or low trump (not high trump)
  if (oppPoints >= 4 && winners.length > 0) {
    const cheap = winners.filter(
      (c) => cardPoints(c) === 0 || (c.suit === trumpSuit && cardStrength(c.rank) <= 5)
    );
    if (cheap.length > 0) {
      return [...cheap].sort((a, b) => cardStrength(a.rank) - cardStrength(b.rank))[0];
    }
    // In endgame, take with whatever
    if (endgame) {
      return [...winners].sort((a, b) => cardStrength(a.rank) - cardStrength(b.rank))[0];
    }
  }

  // Don't waste high cards on cheap tricks → discard lowest
  // But if we're in endgame and we can win cheaply, do it
  if (endgame && winners.length > 0) {
    const cheapest = [...winners].sort((a, b) => cardStrength(a.rank) - cardStrength(b.rank))[0];
    return cheapest;
  }

  // Discard lowest non-trump; conserve trump unless forced
  return lowestNonTrump(hand, trumpSuit);
}
