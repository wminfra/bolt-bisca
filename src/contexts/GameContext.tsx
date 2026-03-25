import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from "react";
import type { SessionSnapshot, WsServerMessage } from "@/lib/types";
import { setToken, clearToken } from "@/lib/api";
import { connectWs, disconnectWs, onWsMessage } from "@/lib/websocket";

type Screen = "login" | "lobby" | "waiting" | "game";

interface GameState {
  token: string | null;
  session: SessionSnapshot | null;
  screen: Screen;
  wsConnected: boolean;
  resolving: boolean;
}

interface GameContextType extends GameState {
  handleLogin: (token: string, session: SessionSnapshot) => void;
  logout: () => void;
  updateSession: (session: SessionSnapshot) => void;
  setResolving: (v: boolean) => void;
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
    resolving: false,
  });

  const resolvingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingSnapshotRef = useRef<SessionSnapshot | null>(null);

  const updateSession = useCallback((session: SessionSnapshot) => {
    setState((s) => ({
      ...s,
      session,
      screen: deriveScreen(session, s.token),
    }));
  }, []);

  const setResolving = useCallback((v: boolean) => {
    setState((s) => ({ ...s, resolving: v }));
  }, []);

  // Handle WS messages
  useEffect(() => {
    const unsub = onWsMessage((msg: WsServerMessage) => {
      if (msg.type === "session_state") {
        const snap = msg.payload;
        const isResolving = snap.room?.game?.resolving === true;

        if (isResolving) {
          // Show resolving state
          updateSession(snap);
          setResolving(true);
          // Block updates for 2s
          if (resolvingTimerRef.current) clearTimeout(resolvingTimerRef.current);
          resolvingTimerRef.current = setTimeout(() => {
            setResolving(false);
            // Apply any pending snapshot
            if (pendingSnapshotRef.current) {
              updateSession(pendingSnapshotRef.current);
              pendingSnapshotRef.current = null;
            }
          }, 2000);
        } else {
          // If we're in resolving delay, queue it
          if (resolvingTimerRef.current) {
            pendingSnapshotRef.current = snap;
          } else {
            updateSession(snap);
          }
        }
      } else if (msg.type === "error") {
        // Show toast
        window.dispatchEvent(new CustomEvent("bisca-toast", { detail: { type: "error", message: msg.message } }));
      }
    });
    return unsub;
  }, [updateSession, setResolving]);

  const handleLogin = useCallback((token: string, session: SessionSnapshot) => {
    setToken(token);
    connectWs(token);
    setState({
      token,
      session,
      screen: deriveScreen(session, token),
      wsConnected: true,
      resolving: false,
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
      resolving: false,
    });
  }, []);

  return (
    <GameContext.Provider value={{ ...state, handleLogin, logout, updateSession, setResolving }}>
      {children}
    </GameContext.Provider>
  );
}
