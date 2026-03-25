import React, { useEffect, useState } from "react";

interface ToastItem {
  id: number;
  type: "error" | "success" | "info";
  message: string;
}

let nextId = 0;

export function showToast(type: ToastItem["type"], message: string) {
  window.dispatchEvent(new CustomEvent("bisca-toast", { detail: { type, message } }));
}

export default function ToastManager() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  useEffect(() => {
    const handler = (e: Event) => {
      const { type, message } = (e as CustomEvent).detail;
      const id = nextId++;
      setToasts((t) => [...t, { id, type, message }]);
      setTimeout(() => {
        setToasts((t) => t.filter((toast) => toast.id !== id));
      }, 4000);
    };
    window.addEventListener("bisca-toast", handler);
    return () => window.removeEventListener("bisca-toast", handler);
  }, []);

  return (
    <div className="toast-container">
      {toasts.map((t) => (
        <div key={t.id} className={`toast toast-${t.type}`}>
          {t.message}
        </div>
      ))}
    </div>
  );
}
