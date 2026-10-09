"use client";

import { useCallback, useRef, useState } from "react";

export interface Toast {
  id: number;
  message: string;
  action?: { label: string; run: () => void };
}

/** Small toast queue. Toasts auto-hide after 5 s; at most 3 are shown. */
export function useToasts() {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const seq = useRef(0);
  const dismiss = useCallback((id: number) => setToasts((t) => t.filter((x) => x.id !== id)), []);
  const show = useCallback(
    (message: string, action?: Toast["action"]) => {
      const id = ++seq.current;
      setToasts((t) => [...t.slice(-2), { id, message, action }]);
      setTimeout(() => dismiss(id), 5000);
    },
    [dismiss],
  );
  return { toasts, show, dismiss };
}

export function ToastStack({ toasts, dismiss }: { toasts: Toast[]; dismiss: (id: number) => void }) {
  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 bottom-20 z-50 flex flex-col items-center gap-2 px-4 lg:bottom-6"
    >
      {toasts.map((t) => (
        <div
          key={t.id}
          role="status"
          className="rise pointer-events-auto flex max-w-md items-center gap-3 rounded-xl border border-line2 bg-panel2 py-2 pl-4 pr-2 text-sm shadow-2xl"
        >
          <span className="min-w-0 flex-1 truncate">{t.message}</span>
          {t.action && (
            <button
              onClick={() => {
                t.action!.run();
                dismiss(t.id);
              }}
              className="rounded-lg px-2.5 py-1 text-sm font-semibold text-accent hover:bg-accent/10"
            >
              {t.action.label}
            </button>
          )}
          <button onClick={() => dismiss(t.id)} className="rounded-md px-1.5 text-muted hover:text-ink" aria-label="Dismiss">
            ✕
          </button>
        </div>
      ))}
    </div>
  );
}
