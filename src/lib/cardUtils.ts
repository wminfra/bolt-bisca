import type { Suit } from "./types";

const SUIT_IMAGES: Record<Suit, string> = {
  oros: "/cards/oros.png",
  copas: "/cards/copas.png",
  espadas: "/cards/espadas.png",
  bastos: "/cards/bastos.png",
};

// Rank -> (column, row) in the 5x2 spritesheet
const RANK_MAP: Record<number, [number, number]> = {
  1: [0, 0],
  2: [1, 0],
  3: [2, 0],
  4: [3, 0],
  5: [4, 0],
  6: [0, 1],
  7: [1, 1],
  10: [2, 1],
  11: [3, 1],
  12: [4, 1],
};

export function getCardStyle(suit: Suit, rank: number): React.CSSProperties {
  const pos = RANK_MAP[rank];
  if (!pos) return {};
  const [col, row] = pos;
  return {
    backgroundImage: `url(${SUIT_IMAGES[suit]})`,
    backgroundSize: "500% 200%",
    backgroundPosition: `${col * 25}% ${row * 100}%`,
  };
}

export function parseCardId(cardId: string): { suit: Suit; rank: number } {
  const [suit, rankStr] = cardId.split("-");
  return { suit: suit as Suit, rank: parseInt(rankStr, 10) };
}
