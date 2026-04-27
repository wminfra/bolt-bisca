import React, { useState } from "react";
import { GameProvider, useGame } from "@/contexts/GameContext";
import { SocialProvider } from "@/contexts/SocialContext";
import LoginScreen from "@/components/game/LoginScreen";
import LobbyScreen from "@/components/game/LobbyScreen";
import WaitingRoomScreen from "@/components/game/WaitingRoomScreen";
import GameTableScreen from "@/components/game/GameTableScreen";
import PracticeGameScreen from "@/components/game/PracticeGameScreen";
import ToastManager from "@/components/game/ToastManager";
import RoomInvitePopup from "@/components/game/RoomInvitePopup";
import { PracticeCtx, type PracticeContextValue } from "@/contexts/PracticeContext";
import type { Difficulty } from "@/lib/practice/biscaEngine";

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

  const ctx: PracticeContextValue = {
    active: practice.active,
    difficulty: practice.difficulty,
    start: (d) => setPractice({ active: true, difficulty: d }),
    exit: () => setPractice((p) => ({ ...p, active: false })),
  };

  return (
    <GameProvider>
      <SocialProvider>
        <PracticeCtx.Provider value={ctx}>
          <ScreenRouter />
          <ToastManager />
          <RoomInvitePopup />
        </PracticeCtx.Provider>
      </SocialProvider>
    </GameProvider>
  );
}

declare global {
  interface Window {
    initMobileAds?: () => void;
  }
}
window.initMobileAds = function () {
  // Future: Load AdMob SDK via WebView bridge
};
