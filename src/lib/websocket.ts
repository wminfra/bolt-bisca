import { WS_BASE } from "./config";
import type { WsClientMessage, WsServerMessage } from "./types";

type MessageHandler = (msg: WsServerMessage) => void;
type StatusHandler = (connected: boolean) => void;

let ws: WebSocket | null = null;
let messageHandlers: MessageHandler[] = [];
let statusHandlers: StatusHandler[] = [];
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
let currentToken: string | null = null;

export function connectWs(token: string) {
  currentToken = token;
  if (ws) {
    ws.onclose = null;
    ws.close();
  }

  ws = new WebSocket(`${WS_BASE}/ws?token=${token}`);

  ws.onopen = () => {
    statusHandlers.forEach((h) => h(true));
    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }
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
    statusHandlers.forEach((h) => h(false));
    // auto-reconnect after 3s
    if (currentToken) {
      reconnectTimer = setTimeout(() => {
        if (currentToken) connectWs(currentToken);
      }, 3000);
    }
  };

  ws.onerror = () => {
    ws?.close();
  };
}

export function disconnectWs() {
  currentToken = null;
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
  if (ws) {
    ws.onclose = null;
    ws.close();
    ws = null;
  }
  statusHandlers.forEach((h) => h(false));
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
  return () => {
    statusHandlers = statusHandlers.filter((h) => h !== handler);
  };
}
