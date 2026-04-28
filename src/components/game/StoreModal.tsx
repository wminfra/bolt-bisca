import React, { useEffect, useState } from "react";
import { useEconomy } from "@/contexts/EconomyContext";
import { buyStoreItem, getStoreItems } from "@/lib/api";
import { showToast } from "@/components/game/ToastManager";
import type { StoreItem, StoreItemId } from "@/lib/types";

interface StoreModalProps {
  onClose: () => void;
}

const ITEM_META: Record<string, { icon: string; description: string }> = {
  elo_shield: {
    icon: "🛡️",
    description: "Protege contra perda de elo ao cair abaixo do piso da patente.",
  },
  double_xp_1h: {
    icon: "✨",
    description: "Multiplica os ganhos de XP por 1 hora.",
  },
  energy_refill: {
    icon: "⚡",
    description: "Recarga instantânea da sua energia.",
  },
  energy_freeze: {
    icon: "❄️",
    description: "Congela o consumo de energia por um período.",
  },
};

export default function StoreModal({ onClose }: StoreModalProps) {
  const { economy, applyEconomyState } = useEconomy();
  const [items, setItems] = useState<StoreItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<StoreItemId | null>(null);
  const [flash, setFlash] = useState<number | null>(null);

  const load = async () => {
    try {
      const res = await getStoreItems();
      setItems(res.items);
    } catch (err: any) {
      showToast("error", err?.message ?? "Erro ao carregar a loja");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleBuy = async (item: StoreItem) => {
    if (!item.can_buy || busyId) return;
    setBusyId(item.id);
    try {
      const res = await buyStoreItem(item.id);
      applyEconomyState(res.user_state);
      setFlash(-item.price);
      setTimeout(() => setFlash(null), 1500);
      showToast("success", `${item.name} adquirido!`);
      // Refresh items so can_buy flags refresh against new balance
      load();
    } catch (err: any) {
      const msg = err?.message ?? "Compra falhou";
      showToast("error", msg);
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="bg-card rounded-lg p-5 w-full max-w-md border border-border shadow-xl animate-in fade-in zoom-in-95 duration-200 max-h-[85vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xl font-display font-bold text-foreground">Loja</h2>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 font-mono text-amber-300 font-bold text-sm">
              <CoinIcon />
              <span>{economy?.coins ?? 0}</span>
              {flash !== null && (
                <span className="ml-1 text-rose-400 animate-in slide-in-from-top-1 fade-in duration-500">
                  {flash}
                </span>
              )}
            </div>
            <button
              onClick={onClose}
              className="text-muted-foreground hover:text-foreground"
              aria-label="Fechar"
            >
              ✕
            </button>
          </div>
        </div>

        <div className="overflow-y-auto -mx-1 px-1 space-y-2">
          {loading ? (
            <div className="text-center text-muted-foreground py-10 text-sm">Carregando...</div>
          ) : items.length === 0 ? (
            <div className="text-center text-muted-foreground py-10 text-sm">
              Nenhum item disponível.
            </div>
          ) : (
            items.map((item) => {
              const meta = ITEM_META[item.id] ?? { icon: "🎁", description: "" };
              const disabled = !item.can_buy || busyId === item.id;
              return (
                <div
                  key={item.id}
                  className={`flex items-center gap-3 p-3 rounded-md border bg-secondary/40 transition-colors ${
                    item.can_buy ? "border-border hover:border-primary/40" : "border-border opacity-70"
                  }`}
                >
                  <div className="text-2xl w-10 h-10 flex items-center justify-center rounded-md bg-background/60">
                    {meta.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-display font-semibold text-foreground text-sm truncate">
                        {item.name}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                      {meta.description}
                    </p>
                    {!item.can_buy && item.reason && (
                      <p className="text-[11px] text-rose-400 mt-1">⚠ {item.reason}</p>
                    )}
                  </div>
                  <button
                    onClick={() => handleBuy(item)}
                    disabled={disabled}
                    className="shrink-0 px-3 py-1.5 rounded-md bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1"
                  >
                    <CoinIcon />
                    <span>{item.price}</span>
                  </button>
                </div>
              );
            })
          )}
        </div>

        {economy && (
          <div className="mt-3 pt-3 border-t border-border text-[11px] text-muted-foreground flex items-center justify-between">
            <span>Escudos: {economy.rank_shield_charges}</span>
            {economy.double_xp_until && new Date(economy.double_xp_until) > new Date() && (
              <span className="text-amber-300">XP em dobro ativo</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function CoinIcon() {
  return (
    <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-gradient-to-br from-amber-300 to-amber-600 text-[9px] font-black text-amber-900 shadow-sm">
      $
    </span>
  );
}
