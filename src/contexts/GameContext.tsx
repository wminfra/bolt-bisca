import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import type { SessionSnapshot, WsServerMessage } from "@/lib/types";
import { setToken, clearToken } from "@/lib/api";
import { connectWs, disconnectWs, onWsMessage } from "@/lib/websocket";

type Screen = "login" | "lobby" | "waiting" | "game";

interface GameState {
  token: string | null;
  session: SessionSnapshot | null;
  screen: Screen;
  wsConnected: boolean;
}

interface GameContextType extends GameState {
  handleLogin: (token: string, session: SessionSnapshot) => void;
  logout: () => void;
  updateSession: (session: SessionSnapshot) => void;
}

const GameContext = createContext<GameContextType | null>(null);

export function useGame() {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error("useGame outside provider");
  return ctx;
}

function deriveScreen(session: SessionSnapshot | null, token: string | null): Screen {
  if (!token || !session) return "login";
  if (!session.room) return "lobby";
  if (session.room.status === "waiting") return "waiting";
  return "game";
}

export function GameProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<GameState>({
    token: localStorage.getItem("bisca_token"),
    session: null,
    screen: "login",
    wsConnected: false,
  });

  const updateSession = useCallback((session: SessionSnapshot) => {
    setState((s) => ({
      ...s,
      session,
      screen: deriveScreen(session, s.token),
    }));
  }, []);

  // Handle WS messages — purely reactive, no timers
  useEffect(() => {
    const unsub = onWsMessage((msg: WsServerMessage) => {
      if (msg.type === "session_state") {
        // Always apply the latest snapshot immediately
        updateSession(msg.payload);
      } else if (msg.type === "error") {
        window.dispatchEvent(new CustomEvent("bisca-toast", { detail: { type: "error", message: msg.message } }));
      }
    });
    return unsub;
  }, [updateSession]);

  const handleLogin = useCallback((token: string, session: SessionSnapshot) => {
    setToken(token);
    connectWs(token);
    setState({
      token,
      session,
      screen: deriveScreen(session, token),
      wsConnected: true,
    });
  }, []);

  const logout = useCallback(() => {
    clearToken();
    disconnectWs();
    setState({
      token: null,
      session: null,
      screen: "login",
      wsConnected: false,
    });
  }, []);

  return (
    <GameContext.Provider value={{ ...state, handleLogin, logout, updateSession }}>
      {children}
    </GameContext.Provider>
  );
}
