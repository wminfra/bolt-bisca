import { useEffect, useState } from "react";

/**
 * Visual countdown for next energy regeneration.
 * Receives the seconds value from backend snapshot and counts down locally
 * without ever mutating the actual energy state. When it reaches zero, the
 * next websocket snapshot will provide the real updated energy value.
 */
export function useEnergyTimer(nextEnergyInSeconds: number | undefined): number {
  const [remaining, setRemaining] = useState<number>(nextEnergyInSeconds ?? 0);

  // Reset whenever a fresh value arrives from the backend
  useEffect(() => {
    setRemaining(nextEnergyInSeconds ?? 0);
  }, [nextEnergyInSeconds]);

  useEffect(() => {
    if (!remaining || remaining <= 0) return;
    const id = setInterval(() => {
      setRemaining((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(id);
  }, [remaining > 0]);

  return remaining;
}

export function formatMMSS(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}
