import React, { useState } from "react";
import { GameProvider, useGame } from "@/contexts/GameContext";
import LoginScreen from "@/components/game/LoginScreen";
import LobbyScreen from "@/components/game/LobbyScreen";
import WaitingRoomScreen from "@/components/game/WaitingRoomScreen";
import GameTableScreen from "@/components/game/GameTableScreen";
import PracticeGameScreen from "@/components/game/PracticeGameScreen";
import ToastManager from "@/components/game/ToastManager";
import type { Difficulty } from "@/lib/practice/biscaEngine";

interface PracticeContext {
  active: boolean;
  difficulty: Difficulty;
  start: (d: Difficulty) => void;
  exit: () => void;
}

export const PracticeCtx = React.createContext<PracticeContext>({
  active: false,
  difficulty: "easy",
  start: () => {},
  exit: () => {},
});

function ScreenRouter() {
  const { screen } = useGame();
  const practice = React.useContext(PracticeCtx);

  if (practice.active) {
    return <PracticeGameScreen difficulty={practice.difficulty} onExit={practice.exit} />;
  }

  switch (screen) {
    case "login":
      return <LoginScreen />;
    case "lobby":
      return <LobbyScreen />;
    case "waiting":
      return <WaitingRoomScreen />;
    case "game":
      return <GameTableScreen />;
    default:
      return <LoginScreen />;
  }
}

export default function BiscaGame() {
  const [practice, setPractice] = useState<{ active: boolean; difficulty: Difficulty }>({
    active: false,
    difficulty: "easy",
  });

  const ctx: PracticeContext = {
    active: practice.active,
    difficulty: practice.difficulty,
    start: (d) => setPractice({ active: true, difficulty: d }),
    exit: () => setPractice((p) => ({ ...p, active: false })),
  };

  return (
    <GameProvider>
      <PracticeCtx.Provider value={ctx}>
        <ScreenRouter />
        <ToastManager />
      </PracticeCtx.Provider>
    </GameProvider>
  );
}

// Mobile ads placeholder
declare global {
  interface Window {
    initMobileAds?: () => void;
  }
}
window.initMobileAds = function () {
  // Future: Load AdMob SDK via WebView bridge
  // Example: window.AdMob?.showBanner({ adId: '...', position: 'bottom' });
};
