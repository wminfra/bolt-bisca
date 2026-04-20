import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from "react";
import type { SessionSnapshot, WsServerMessage } from "@/lib/types";
import { setToken, clearToken, getSession } from "@/lib/api";
import {
  connectWs,
  disconnectWs,
  onWsMessage,
  onWsStatus,
  setResyncCallback,
  reconnectNow as wsReconnectNow,
  type ConnectionStatus,
} from "@/lib/websocket";

type Screen = "login" | "lobby" | "waiting" | "game";

interface GameState {
  token: string | null;
  session: SessionSnapshot | null;
  screen: Screen;
  connectionStatus: ConnectionStatus;
}

interface GameContextType extends GameState {
  handleLogin: (token: string, session: SessionSnapshot) => void;
  logout: () => void;
  updateSession: (session: SessionSnapshot) => void;
  reconnectNow: () => void;
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
    connectionStatus: "disconnected",
  });

  const stateRef = useRef(state);
  stateRef.current = state;

  const updateSession = useCallback((session: SessionSnapshot) => {
    setState((s) => ({
      ...s,
      session,
      screen: deriveScreen(session, s.token),
    }));
  }, []);

  const logout = useCallback(() => {
    clearToken();
    setResyncCallback(null);
    disconnectWs();
    setState({
      token: null,
      session: null,
      screen: "login",
      connectionStatus: "disconnected",
    });
  }, []);

  // Resync via /api/me before reopening socket
  const resync = useCallback(async () => {
    if (!stateRef.current.token) return;
    try {
      const session = await getSession();
      updateSession(session);
    } catch (err: any) {
      const msg = String(err?.message ?? "");
      if (msg.includes("401") || msg.toLowerCase().includes("unauthorized")) {
        logout();
        throw err;
      }
      throw err;
    }
  }, [updateSession, logout]);

  // Register resync callback for the websocket layer
  useEffect(() => {
    setResyncCallback(resync);
    return () => setResyncCallback(null);
  }, [resync]);

  // Subscribe to WS status
  useEffect(() => {
    const unsub = onWsStatus((status) => {
      setState((s) => ({ ...s, connectionStatus: status }));
    });
    return unsub;
  }, []);

  // Handle WS messages
  useEffect(() => {
    const unsub = onWsMessage((msg: WsServerMessage) => {
      if (msg.type === "session_state") {
        updateSession(msg.payload);
      } else if (msg.type === "error") {
        window.dispatchEvent(new CustomEvent("bisca-toast", { detail: { type: "error", message: msg.message } }));
      }
    });
    return unsub;
  }, [updateSession]);

  // Auto-rehydrate on mount if token exists but no session
  useEffect(() => {
    if (state.token && !state.session) {
      (async () => {
        try {
          const session = await getSession();
          setState((s) => ({
            ...s,
            session,
            screen: deriveScreen(session, s.token),
          }));
          if (state.token) connectWs(state.token);
        } catch (err: any) {
          const msg = String(err?.message ?? "");
          if (msg.includes("401") || msg.toLowerCase().includes("unauthorized")) {
            logout();
          }
        }
      })();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleLogin = useCallback((token: string, session: SessionSnapshot) => {
    setToken(token);
    connectWs(token);
    setState({
      token,
      session,
      screen: deriveScreen(session, token),
      connectionStatus: "disconnected",
    });
  }, []);

  const reconnectNow = useCallback(() => {
    wsReconnectNow();
  }, []);

  return (
    <GameContext.Provider value={{ ...state, handleLogin, logout, updateSession, reconnectNow }}>
      {children}
    </GameContext.Provider>
  );
}
