import React from "react";
import type { Difficulty } from "@/lib/practice/biscaEngine";

export interface PracticeContextValue {
  active: boolean;
  difficulty: Difficulty;
  start: (d: Difficulty) => void;
  exit: () => void;
}

export const PracticeCtx = React.createContext<PracticeContextValue>({
  active: false,
  difficulty: "easy",
  start: () => {},
  exit: () => {},
});
