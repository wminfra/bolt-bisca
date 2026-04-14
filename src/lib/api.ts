import { API_BASE } from "./config";
import type {
  AuthPayload,
  AuthResponse,
  CreateRoomPayload,
  JoinRoomPayload,
  SelectPartnerPayload,
  SessionSnapshot,
  RoomActionResponse,
  SessionResponse,
  PublicRoom,
  ErrorResponse,
} from "./types";

function getToken(): string | null {
  return localStorage.getItem("bisca_token");
}

export function setToken(token: string) {
  localStorage.setItem("bisca_token", token);
}

export function clearToken() {
  localStorage.removeItem("bisca_token");
}

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string> || {}),
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  if (!res.ok) {
    const err: ErrorResponse = await res.json().catch(() => ({ detail: "Erro de conexão" }));
    throw new Error(err.detail);
  }

  return res.json();
}

// Auth
export const register = (data: AuthPayload) =>
  request<AuthResponse>("/api/auth/register", { method: "POST", body: JSON.stringify(data) });

export const login = (data: AuthPayload) =>
  request<AuthResponse>("/api/auth/login", { method: "POST", body: JSON.stringify(data) });

// Session
export const getSession = () =>
  request<SessionSnapshot>("/api/me");

// Rooms
export const getPublicRooms = () =>
  request<{ rooms: PublicRoom[] }>("/api/rooms/public");

export const createRoom = (data: CreateRoomPayload) =>
  request<RoomActionResponse>("/api/rooms/create", { method: "POST", body: JSON.stringify(data) });

export const joinRoom = (data: JoinRoomPayload) =>
  request<RoomActionResponse>("/api/rooms/join", { method: "POST", body: JSON.stringify(data) });

export const leaveRoom = () =>
  request<SessionResponse>("/api/rooms/leave", { method: "POST" });

export const selectPartner = (roomId: string, data: SelectPartnerPayload) =>
  request<SessionResponse>(`/api/rooms/${roomId}/partner`, { method: "POST", body: JSON.stringify(data) });

export const startGame = (roomId: string) =>
  request<SessionResponse>(`/api/rooms/${roomId}/start`, { method: "POST" });

export const surrender = () =>
  request<SessionResponse>("/api/rooms/surrender", { method: "POST" });
