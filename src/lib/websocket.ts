import { WS_BASE } from "./config";
import type { WsClientMessage, WsServerMessage } from "./types";

export type ConnectionStatus = "connected" | "disconnected" | "reconnecting";

type MessageHandler = (msg: WsServerMessage) => void;
type StatusHandler = (status: ConnectionStatus) => void;

let ws: WebSocket | null = null;
let messageHandlers: MessageHandler[] = [];
let statusHandlers: StatusHandler[] = [];
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
let currentToken: string | null = null;
let currentStatus: ConnectionStatus = "disconnected";
let reconnectAttempts = 0;
let resyncCallback: (() => Promise<void>) | null = null;

const MAX_BACKOFF_MS = 15000;
const BASE_BACKOFF_MS = 3000;

function setStatus(s: ConnectionStatus) {
  currentStatus = s;
  statusHandlers.forEach((h) => h(s));
}

export function getStatus(): ConnectionStatus {
  return currentStatus;
}

export function setResyncCallback(cb: (() => Promise<void>) | null) {
  resyncCallback = cb;
}

function clearReconnectTimer() {
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
}

function openSocket(token: string) {
  // Ensure no duplicate sockets
  if (ws) {
    ws.onopen = null;
    ws.onclose = null;
    ws.onerror = null;
    ws.onmessage = null;
    try { ws.close(); } catch { /* noop */ }
    ws = null;
  }

  ws = new WebSocket(`${WS_BASE}/ws?token=${token}`);

  ws.onopen = () => {
    reconnectAttempts = 0;
    clearReconnectTimer();
    setStatus("connected");
  };

  ws.onmessage = (event) => {
    try {
      const msg: WsServerMessage = JSON.parse(event.data);
      messageHandlers.forEach((h) => h(msg));
    } catch {
      // ignore malformed
    }
  };

  ws.onclose = () => {
    if (!currentToken) {
      setStatus("disconnected");
      return;
    }
    scheduleReconnect();
  };

  ws.onerror = () => {
    try { ws?.close(); } catch { /* noop */ }
  };
}

function scheduleReconnect() {
  if (!currentToken) return;
  clearReconnectTimer();
  setStatus("reconnecting");
  const delay = Math.min(BASE_BACKOFF_MS * Math.pow(1.5, reconnectAttempts), MAX_BACKOFF_MS);
  reconnectAttempts += 1;
  reconnectTimer = setTimeout(() => {
    void attemptReconnect();
  }, delay);
}

async function attemptReconnect() {
  if (!currentToken) return;
  try {
    if (resyncCallback) {
      await resyncCallback();
    }
    if (currentToken) openSocket(currentToken);
  } catch {
    // resync failed (likely 401 already handled by callback) — schedule again
    scheduleReconnect();
  }
}

export function connectWs(token: string) {
  currentToken = token;
  reconnectAttempts = 0;
  openSocket(token);
}

export function reconnectNow() {
  if (!currentToken) return;
  clearReconnectTimer();
  reconnectAttempts = 0;
  void attemptReconnect();
}

export function disconnectWs() {
  currentToken = null;
  clearReconnectTimer();
  reconnectAttempts = 0;
  if (ws) {
    ws.onclose = null;
    ws.onerror = null;
    ws.onmessage = null;
    ws.onopen = null;
    try { ws.close(); } catch { /* noop */ }
    ws = null;
  }
  setStatus("disconnected");
}

export function sendWs(msg: WsClientMessage) {
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(msg));
  }
}

export function onWsMessage(handler: MessageHandler) {
  messageHandlers.push(handler);
  return () => {
    messageHandlers = messageHandlers.filter((h) => h !== handler);
  };
}

export function onWsStatus(handler: StatusHandler) {
  statusHandlers.push(handler);
  // Emit current status immediately
  handler(currentStatus);
  return () => {
    statusHandlers = statusHandlers.filter((h) => h !== handler);
  };
}
