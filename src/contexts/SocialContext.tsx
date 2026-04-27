import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { onWsMessage } from "@/lib/websocket";
import { getFriends } from "@/lib/api";
import { useGame } from "@/contexts/GameContext";
import type { FriendEntry, FriendsListResponse } from "@/lib/types";

export interface RoomInvite {
  room_id: string;
  from_nickname: string;
  mode?: string;
  expires_in: number;
  received_at: number;
}

interface SocialContextValue {
  friends: FriendEntry[];
  blocks: FriendEntry[];
  pendingIncoming: FriendEntry[];
  pendingOutgoing: FriendEntry[];
  loading: boolean;
  hasNotification: boolean;
  refresh: () => Promise<void>;
  applyOptimisticBlock: (userId: string) => void;
  invite: RoomInvite | null;
  dismissInvite: () => void;
  markNotificationsSeen: () => void;
}

const SocialContext = createContext<SocialContextValue | null>(null);

export function useSocial() {
  const ctx = useContext(SocialContext);
  if (!ctx) throw new Error("useSocial outside provider");
  return ctx;
}

export function SocialProvider({ children }: { children: React.ReactNode }) {
  const { token } = useGame();
  const [data, setData] = useState<FriendsListResponse>({
    friends: [],
    blocks: [],
    pending_incoming: [],
    pending_outgoing: [],
  });
  const [loading, setLoading] = useState(false);
  const [hasNotification, setHasNotification] = useState(false);
  const [invite, setInvite] = useState<RoomInvite | null>(null);
  const lastIncomingIdsRef = useRef<Set<string>>(new Set());

  const refresh = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await getFriends();
      setData(res);
      // Detect new incoming requests for badge
      const incomingIds = new Set(res.pending_incoming.map((p) => p.user_id));
      let hasNew = false;
      incomingIds.forEach((id) => {
        if (!lastIncomingIdsRef.current.has(id)) hasNew = true;
      });
      lastIncomingIdsRef.current = incomingIds;
      if (hasNew || res.pending_incoming.length > 0) {
        setHasNotification(true);
      }
    } catch {
      /* ignore — modal will show empty state */
    } finally {
      setLoading(false);
    }
  }, [token]);

  // Initial fetch on login
  useEffect(() => {
    if (token) void refresh();
    else {
      setData({ friends: [], blocks: [], pending_incoming: [], pending_outgoing: [] });
      setHasNotification(false);
      setInvite(null);
      lastIncomingIdsRef.current = new Set();
    }
  }, [token, refresh]);

  // WS social events
  useEffect(() => {
    const unsub = onWsMessage((msg) => {
      if (msg.type === "friend_presence") {
        const { user_id } = msg.payload;
        const online = msg.payload.online ?? msg.payload.is_online ?? false;
        setData((d) => ({
          ...d,
          friends: d.friends.map((f) =>
            f.user_id === user_id ? { ...f, is_online: online } : f
          ),
        }));
      } else if (msg.type === "friend_request_received") {
        setHasNotification(true);
        void refresh();
      } else if (msg.type === "room_invite") {
        const { room_id, from_nickname, mode, expires_in } = msg.payload;
        setInvite({
          room_id,
          from_nickname,
          mode,
          expires_in: expires_in ?? 15,
          received_at: Date.now(),
        });
      }
    });
    return unsub;
  }, [refresh]);

  const applyOptimisticBlock = useCallback((userId: string) => {
    setData((d) => ({
      friends: d.friends.filter((f) => f.user_id !== userId),
      blocks: d.blocks,
      pending_incoming: d.pending_incoming.filter((f) => f.user_id !== userId),
      pending_outgoing: d.pending_outgoing.filter((f) => f.user_id !== userId),
    }));
  }, []);

  const dismissInvite = useCallback(() => setInvite(null), []);
  const markNotificationsSeen = useCallback(() => setHasNotification(false), []);

  return (
    <SocialContext.Provider
      value={{
        friends: data.friends,
        blocks: data.blocks,
        pendingIncoming: data.pending_incoming,
        pendingOutgoing: data.pending_outgoing,
        loading,
        hasNotification,
        refresh,
        applyOptimisticBlock,
        invite,
        dismissInvite,
        markNotificationsSeen,
      }}
    >
      {children}
    </SocialContext.Provider>
  );
}
