// Types derived from openapi.yaml

export type Suit = "oros" | "copas" | "espadas" | "bastos";
export type RoomMode = "1v1" | "2v2";
export type RoomStatus = "waiting" | "playing" | "finished";

export interface AuthPayload {
  nickname: string;
  password: string;
}

export interface CreateRoomPayload {
  mode: RoomMode;
  hand_size: 3 | 6;
  is_private?: boolean;
}

export interface JoinRoomPayload {
  room_id: string;
}

export interface SelectPartnerPayload {
  partner_user_id: string;
}

export interface CardSnapshot {
  id: string;
  suit: Suit;
  suit_label: string;
  rank: number;
  rank_label: string;
  points: number;
}

export interface TableCardSnapshot {
  player_id: string;
  nickname: string;
  card: CardSnapshot;
}

export interface LastTrickSnapshot {
  winner_user_id: string;
  winner_nickname: string;
  winning_card: CardSnapshot;
  cards: CardSnapshot[];
  resolved_at: string;
}

export interface TeamScore {
  team_id: number;
  label: string;
  members: string[];
  points: number;
}

export interface MatchResult {
  scoreboard: TeamScore[];
  winner_team_id: number | null;
  winner_label: string;
  winner_team_label?: string;
  is_tie: boolean;
  target: number;
  total_points: number;
  finish_reason?: "completed" | "surrender" | "walkover" | string;
  viewer_won?: boolean;
  elo_changes?: Record<string, number>;
  updated_elos?: Record<string, number>;
  rank_shield?: Record<string, { used: boolean; remaining_charges: number }>;
}

export interface GameSnapshot {
  you_can_play: boolean;
  your_hand: CardSnapshot[];
  table_cards: TableCardSnapshot[];
  turn_player_id: string;
  turn_nickname: string;
  seating_order: string[];
  viewer_seat: number;
  stock_count: number;
  trump_suit: string;
  trump_card: CardSnapshot;
  trump_available: boolean;
  resolving: boolean;
  trick_number: number;
  last_trick: LastTrickSnapshot | null;
  result: MatchResult | null;
}

export interface RoomPlayerSnapshot {
  id: string;
  nickname: string;
  is_creator: boolean;
  is_you: boolean;
  team_id: number | null;
  seat_index: number | null;
  connected: boolean;
  hand_count: number;
  captured_count: number;
}

export interface RoomSnapshot {
  id: string;
  is_private: boolean;
  mode: RoomMode;
  hand_size: 3 | 6;
  status: RoomStatus;
  creator_id: string;
  creator_nickname: string;
  capacity: number;
  players: RoomPlayerSnapshot[];
  partner_user_id: string | null;
  viewer_is_creator: boolean;
  can_start: boolean;
  you_can_start: boolean;
  start_reason: string | null;
  can_choose_partner: boolean;
  game: GameSnapshot | null;
  ranked?: boolean;
}

export interface SessionUser {
  id: string;
  nickname: string;
  elo?: number;
  patent?: string;
  games_played?: number;
  games_won?: number;
  penalty_until?: string | null;
  rank_shield_charges?: number;
  // Progression
  level?: number;
  xp?: number;
  xp_to_next_level?: number;
  xp_progress_percentage?: number;
  // Energy
  energy?: number;
  max_energy?: number;
  next_energy_in_seconds?: number;
}

export interface RankedQueueState {
  in_queue: boolean;
  queue_mode: RoomMode | null;
  queue_hand_size: 3 | 6 | null;
  queued_at: string | null;
  penalty_until: string | null;
}

export interface PublicRoom {
  id: string;
  mode: string;
  hand_size: number;
  players: number;
  capacity: number;
  creator_nickname: string;
  player_nicknames: string[];
}

export interface SessionSnapshot {
  user: SessionUser;
  public_rooms: PublicRoom[];
  room: RoomSnapshot | null;
  ranked?: RankedQueueState;
}

export interface AuthResponse {
  token: string;
  session: SessionSnapshot;
}

export interface ErrorResponse {
  detail: string;
}

export interface RoomActionResponse {
  room_id: string;
  session: SessionSnapshot;
}

export interface SessionResponse {
  session: SessionSnapshot;
}

// WebSocket messages
export interface WsPlayCardMessage {
  type: "play_card";
  payload: { card_id: string };
}

export interface WsRefreshMessage {
  type: "refresh";
}

export type WsClientMessage = WsPlayCardMessage | WsRefreshMessage;

export interface WsSessionStateMessage {
  type: "session_state";
  payload: SessionSnapshot;
}

export interface WsErrorMessage {
  type: "error";
  message: string;
}

// ===== Social =====
export type FriendStatus = "pending" | "accepted" | "blocked" | "declined";

export interface FriendEntry {
  user_id: string;
  nickname: string;
  status: FriendStatus;
  created_at?: string;
  updated_at?: string;
  is_online?: boolean;
}

export interface FriendsListResponse {
  friends: FriendEntry[];
  blocks: FriendEntry[];
  pending_incoming: FriendEntry[];
  pending_outgoing: FriendEntry[];
}

export interface SocialSearchResult {
  user_id: string;
  nickname: string;
  current_status: FriendStatus | null;
}

export interface SocialSearchResponse {
  results: SocialSearchResult[];
}

export interface SocialActionResponse {
  status: FriendStatus | "declined";
  auto_accepted?: boolean;
}

// ===== WS social events =====
export interface WsFriendPresenceMessage {
  type: "friend_presence";
  payload: { user_id: string; online?: boolean; is_online?: boolean };
}

export interface WsFriendRequestReceivedMessage {
  type: "friend_request_received";
  payload: { from_user_id: string; from_nickname: string };
}

export interface WsRoomInviteMessage {
  type: "room_invite";
  payload: {
    room_id: string;
    from_nickname: string;
    mode?: RoomMode | string;
    expires_in?: number;
  };
}

export type WsServerMessage =
  | WsSessionStateMessage
  | WsErrorMessage
  | WsFriendPresenceMessage
  | WsFriendRequestReceivedMessage
  | WsRoomInviteMessage;
