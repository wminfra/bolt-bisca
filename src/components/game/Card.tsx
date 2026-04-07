import React from "react";
import type { CardSnapshot } from "@/lib/types";
import { getCardStyle } from "@/lib/cardUtils";

interface CardProps {
  card: CardSnapshot;
  playable?: boolean;
  isWinner?: boolean;
  onClick?: () => void;
  size?: "xs" | "sm" | "md" | "lg";
}

const SIZES = {
  xs: "w-10 h-14",
  sm: "w-14 h-20",
  hand: "w-[4.5rem] h-[6.3rem]",
  md: "w-20 h-28",
  lg: "w-24 h-36",
};

export default function Card({ card, playable, isWinner, onClick, size = "md" }: CardProps) {
  const style = getCardStyle(card.suit, card.rank);

  return (
    <div
      className={`card-sprite ${SIZES[size]} ${playable ? "card-playable" : ""} ${isWinner ? "card-winner" : ""} flex-shrink-0`}
      style={style}
      onClick={playable ? onClick : undefined}
      title={`${card.rank_label} de ${card.suit_label}`}
    />
  );
}

interface CardBackProps {
  size?: "xs" | "sm" | "md" | "lg";
  count?: number;
}

export function CardBack({ size = "md", count }: CardBackProps) {
  return (
    <div className={`card-back ${SIZES[size]} flex-shrink-0 relative`}>
      {count !== undefined && count > 0 && (
        <span className="absolute bottom-1 right-1 text-xs font-bold text-gold opacity-60 z-10">
          {count}
        </span>
      )}
    </div>
  );
}
