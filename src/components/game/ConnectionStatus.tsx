import React from "react";
import { useGame } from "@/contexts/GameContext";
import { cn } from "@/lib/utils";

export default function ConnectionStatus({ className }: { className?: string }) {
  const { connectionStatus, reconnectNow, token } = useGame();
  if (!token) return null;

  const isConnected = connectionStatus === "connected";
  const isReconnecting = connectionStatus === "reconnecting";

  const dotColor = isConnected
    ? "bg-emerald-500"
    : isReconnecting
    ? "bg-amber-400 animate-pulse"
    : "bg-red-500";

  const label = isConnected
    ? "Online"
    : isReconnecting
    ? "Tentando reconectar em 3s..."
    : "Offline";

  return (
    <div className={cn("flex items-center gap-1.5 text-[10px]", className)}>
      <span className={cn("w-2 h-2 rounded-full", dotColor)} aria-hidden />
      <span className={cn("font-medium", isConnected ? "text-emerald-500" : isReconnecting ? "text-amber-400" : "text-red-500")}>
        {label}
      </span>
      {!isConnected && (
        <button
          onClick={reconnectNow}
          className="ml-1 px-1.5 py-0.5 rounded bg-primary/20 hover:bg-primary/30 text-primary text-[10px] font-semibold border border-primary/40 transition"
        >
          Reconectar
        </button>
      )}
    </div>
  );
}
