import React, { useEffect, useMemo, useState } from "react";
import { useSocial } from "@/contexts/SocialContext";
import { useGame } from "@/contexts/GameContext";
import {
  searchUsers,
  sendFriendRequest,
  respondFriendRequest,
  blockUser,
  unblockUser,
} from "@/lib/api";
import { showToast } from "@/components/game/ToastManager";
import type { FriendEntry, SocialSearchResult } from "@/lib/types";

type Tab = "friends" | "requests" | "blocked";

interface Props {
  onClose: () => void;
}

export default function SocialModal({ onClose }: Props) {
  const {
    friends,
    blocks,
    pendingIncoming,
    pendingOutgoing,
    loading,
    refresh,
    applyOptimisticBlock,
    markNotificationsSeen,
  } = useSocial();
  const [tab, setTab] = useState<Tab>("friends");
  const [search, setSearch] = useState("");
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<SocialSearchResult[] | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  // Mark badge as seen when modal opens
  useEffect(() => {
    markNotificationsSeen();
  }, [markNotificationsSeen]);

  // Refresh on open
  useEffect(() => {
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Online friends float to top
  const sortedFriends = useMemo(() => {
    return [...friends].sort((a, b) => {
      const ao = a.is_online ? 1 : 0;
      const bo = b.is_online ? 1 : 0;
      if (ao !== bo) return bo - ao;
      return a.nickname.localeCompare(b.nickname);
    });
  }, [friends]);


  const handleSearch = async () => {
    const q = search.trim();
    if (!q) {
      setSearchResults(null);
      return;
    }
    setSearching(true);
    try {
      const res = await searchUsers(q);
      setSearchResults(res.results);
    } catch (err: any) {
      showToast("error", err.message || "Erro ao buscar");
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  };

  const wrap = async (userId: string, fn: () => Promise<unknown>, successMsg?: string) => {
    setBusyId(userId);
    try {
      await fn();
      if (successMsg) showToast("success", successMsg);
      await refresh();
      // Re-run search to refresh statuses
      if (searchResults && search.trim()) {
        const res = await searchUsers(search.trim()).catch(() => null);
        if (res) setSearchResults(res.results);
      }
    } catch (err: any) {
      showToast("error", err.message || "Falha na operação");
    } finally {
      setBusyId(null);
    }
  };

  const handleAdd = (userId: string) =>
    wrap(userId, () => sendFriendRequest(userId), "Pedido enviado");
  const handleAccept = (userId: string) =>
    wrap(userId, () => respondFriendRequest(userId, true), "Amizade aceita");
  const handleDecline = (userId: string) =>
    wrap(userId, () => respondFriendRequest(userId, false));
  const handleBlock = (userId: string) => {
    applyOptimisticBlock(userId);
    return wrap(userId, () => blockUser(userId), "Usuário bloqueado");
  };
  const handleUnblock = (userId: string) =>
    wrap(userId, () => unblockUser(userId), "Usuário desbloqueado");


  const incomingCount = pendingIncoming.length;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="bg-card rounded-lg w-full max-w-sm border border-border max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 border-b border-border flex items-center justify-between">
          <h2 className="text-lg font-display font-bold text-foreground">Social</h2>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground transition-colors text-xl leading-none px-2"
            aria-label="Fechar"
          >
            ×
          </button>
        </div>

        {/* Search */}
        <div className="p-4 border-b border-border">
          <div className="flex gap-2">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              placeholder="Buscar por nickname"
              className="flex-1 px-3 py-2 rounded-md bg-secondary text-secondary-foreground border border-border focus:outline-none focus:ring-2 focus:ring-primary text-sm"
            />
            <button
              onClick={handleSearch}
              disabled={searching || !search.trim()}
              className="px-3 py-2 bg-primary text-primary-foreground rounded-md text-sm font-semibold hover:opacity-90 disabled:opacity-50 transition-opacity"
            >
              {searching ? "..." : "Buscar"}
            </button>
          </div>
          {searchResults !== null && (
            <div className="mt-3 space-y-2">
              {searchResults.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-2">
                  Nenhum usuário encontrado.
                </p>
              ) : (
                searchResults.map((r) => (
                  <SearchResultRow
                    key={r.user_id}
                    result={r}
                    busy={busyId === r.user_id}
                    onAdd={() => handleAdd(r.user_id)}
                    onBlock={() => handleBlock(r.user_id)}
                    onUnblock={() => handleUnblock(r.user_id)}
                  />
                ))
              )}
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="flex border-b border-border">
          {([
            { id: "friends" as Tab, label: `Amigos (${friends.length})` },
            {
              id: "requests" as Tab,
              label: `Pedidos${incomingCount > 0 ? ` (${incomingCount})` : ""}`,
            },
            { id: "blocked" as Tab, label: `Bloqueados (${blocks.length})` },
          ]).map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex-1 py-2.5 text-xs font-semibold transition-colors relative ${
                tab === t.id
                  ? "text-primary border-b-2 border-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {t.label}
              {t.id === "requests" && incomingCount > 0 && tab !== "requests" && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-destructive" />
              )}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading && friends.length === 0 && blocks.length === 0 ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-14 rounded-md bg-secondary/40 animate-pulse" />
              ))}
            </div>
          ) : tab === "friends" ? (
            <FriendsTab
              friends={sortedFriends}
              busyId={busyId}
              canInvite={canInvite}
              invitedIds={invitedIds}
              onInvite={handleInvite}
              onBlock={handleBlock}
            />
          ) : tab === "requests" ? (
            <RequestsTab
              incoming={pendingIncoming}
              outgoing={pendingOutgoing}
              busyId={busyId}
              onAccept={handleAccept}
              onDecline={handleDecline}
            />
          ) : (
            <BlockedTab
              blocks={blocks}
              busyId={busyId}
              onUnblock={handleUnblock}
            />
          )}
        </div>
      </div>
    </div>
  );
}

function StatusDot({ online }: { online?: boolean }) {
  return (
    <span
      className={`inline-block w-2 h-2 rounded-full ${
        online ? "bg-primary shadow-[0_0_6px_hsl(var(--primary))]" : "bg-muted-foreground/40"
      }`}
      aria-label={online ? "Online" : "Offline"}
    />
  );
}

function Row({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-2 p-3 rounded-md bg-secondary/40 border border-border">
      {children}
    </div>
  );
}

function SearchResultRow({
  result,
  busy,
  onAdd,
  onBlock,
  onUnblock,
}: {
  result: SocialSearchResult;
  busy: boolean;
  onAdd: () => void;
  onBlock: () => void;
  onUnblock: () => void;
}) {
  const status = result.current_status;
  return (
    <Row>
      <span className="text-sm text-foreground truncate">{result.nickname}</span>
      <div className="flex gap-1.5">
        {status === null && (
          <button
            onClick={onAdd}
            disabled={busy}
            className="px-3 py-1 text-xs rounded bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50 transition-opacity"
          >
            Adicionar
          </button>
        )}
        {status === "pending" && (
          <span className="px-3 py-1 text-xs rounded bg-muted text-muted-foreground">
            Pendente
          </span>
        )}
        {status === "accepted" && (
          <span className="px-3 py-1 text-xs rounded bg-primary/20 text-primary">
            Amigo
          </span>
        )}
        {status === "blocked" ? (
          <button
            onClick={onUnblock}
            disabled={busy}
            className="px-3 py-1 text-xs rounded bg-secondary text-secondary-foreground hover:bg-muted disabled:opacity-50 transition-colors"
          >
            Desbloquear
          </button>
        ) : (
          <button
            onClick={onBlock}
            disabled={busy}
            className="px-3 py-1 text-xs rounded bg-destructive/20 text-destructive hover:bg-destructive/30 disabled:opacity-50 transition-colors"
          >
            Bloquear
          </button>
        )}
      </div>
    </Row>
  );
}

function FriendsTab({
  friends,
  busyId,
  canInvite,
  invitedIds,
  onInvite,
  onBlock,
}: {
  friends: FriendEntry[];
  busyId: string | null;
  canInvite: boolean;
  invitedIds: Set<string>;
  onInvite: (id: string) => void;
  onBlock: (id: string) => void;
}) {
  if (friends.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-8">
        Você ainda não tem amigos. Use a busca para adicionar!
      </p>
    );
  }
  return (
    <div className="space-y-2">
      {friends.map((f) => {
        const invited = invitedIds.has(f.user_id);
        const inviteDisabled = !canInvite || !f.is_online || invited || busyId === f.user_id;
        return (
          <Row key={f.user_id}>
            <div className="flex items-center gap-2 min-w-0">
              <StatusDot online={f.is_online} />
              <span className="text-sm text-foreground truncate">{f.nickname}</span>
            </div>
            <div className="flex gap-1.5">
              <button
                onClick={() => onInvite(f.user_id)}
                disabled={inviteDisabled}
                title={
                  !canInvite
                    ? "Crie ou entre em uma sala para convidar"
                    : !f.is_online
                    ? "Amigo offline"
                    : invited
                    ? "Convidado!"
                    : undefined
                }
                className="px-3 py-1 text-xs rounded bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-opacity"
              >
                {invited ? "Convidado!" : "Convidar"}
              </button>
              <button
                onClick={() => onBlock(f.user_id)}
                disabled={busyId === f.user_id}
                className="px-2 py-1 text-xs rounded bg-secondary text-secondary-foreground hover:bg-muted disabled:opacity-50 transition-colors"
              >
                Bloquear
              </button>
            </div>
          </Row>
        );
      })}
    </div>
  );
}

function RequestsTab({
  incoming,
  outgoing,
  busyId,
  onAccept,
  onDecline,
}: {
  incoming: FriendEntry[];
  outgoing: FriendEntry[];
  busyId: string | null;
  onAccept: (id: string) => void;
  onDecline: (id: string) => void;
}) {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
          Recebidos ({incoming.length})
        </h3>
        {incoming.length === 0 ? (
          <p className="text-xs text-muted-foreground py-2">Nenhum pedido recebido.</p>
        ) : (
          <div className="space-y-2">
            {incoming.map((p) => (
              <Row key={p.user_id}>
                <span className="text-sm text-foreground truncate">{p.nickname}</span>
                <div className="flex gap-1.5">
                  <button
                    onClick={() => onAccept(p.user_id)}
                    disabled={busyId === p.user_id}
                    className="px-3 py-1 text-xs rounded bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50 transition-opacity"
                  >
                    Aceitar
                  </button>
                  <button
                    onClick={() => onDecline(p.user_id)}
                    disabled={busyId === p.user_id}
                    className="px-3 py-1 text-xs rounded bg-secondary text-secondary-foreground hover:bg-muted disabled:opacity-50 transition-colors"
                  >
                    Recusar
                  </button>
                </div>
              </Row>
            ))}
          </div>
        )}
      </div>
      <div>
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
          Enviados ({outgoing.length})
        </h3>
        {outgoing.length === 0 ? (
          <p className="text-xs text-muted-foreground py-2">Nenhum pedido enviado.</p>
        ) : (
          <div className="space-y-2">
            {outgoing.map((p) => (
              <Row key={p.user_id}>
                <span className="text-sm text-foreground truncate">{p.nickname}</span>
                <span className="text-xs text-muted-foreground">Pendente</span>
              </Row>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function BlockedTab({
  blocks,
  busyId,
  onUnblock,
}: {
  blocks: FriendEntry[];
  busyId: string | null;
  onUnblock: (id: string) => void;
}) {
  if (blocks.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-8">
        Nenhum usuário bloqueado.
      </p>
    );
  }
  return (
    <div className="space-y-2">
      {blocks.map((b) => (
        <Row key={b.user_id}>
          <span className="text-sm text-foreground truncate">{b.nickname}</span>
          <button
            onClick={() => onUnblock(b.user_id)}
            disabled={busyId === b.user_id}
            className="px-3 py-1 text-xs rounded bg-secondary text-secondary-foreground hover:bg-muted disabled:opacity-50 transition-colors"
          >
            Desbloquear
          </button>
        </Row>
      ))}
    </div>
  );
}
