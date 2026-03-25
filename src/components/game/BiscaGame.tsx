import React from "react";
import { GameProvider, useGame } from "@/contexts/GameContext";
import LoginScreen from "@/components/game/LoginScreen";
import LobbyScreen from "@/components/game/LobbyScreen";
import WaitingRoomScreen from "@/components/game/WaitingRoomScreen";
import GameTableScreen from "@/components/game/GameTableScreen";
import ToastManager from "@/components/game/ToastManager";

function ScreenRouter() {
  const { screen } = useGame();

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
  return (
    <GameProvider>
      <ScreenRouter />
      <ToastManager />
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
