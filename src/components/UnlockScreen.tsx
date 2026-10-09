"use client";

import { useState } from "react";
import { Logo, ShieldIcon } from "./icons";
import { Button, inputCls } from "./ui";

/** Shown when the user's data is encrypted and locked. Decryption happens in this tab. */
export function UnlockScreen({ onUnlock, onWipe }: { onUnlock: (passphrase: string) => Promise<boolean>; onWipe: () => void }) {
  const [pass, setPass] = useState("");
  const [state, setState] = useState<"idle" | "working" | "wrong">("idle");
  const [confirmWipe, setConfirmWipe] = useState(false);
  return (
    <main className="grain flex min-h-dvh items-center justify-center px-4 py-10">
      <div className="rise w-full max-w-sm">
        <Logo />
        <h1 className="mt-8 font-display text-4xl leading-tight">
          Your chats are <span className="italic text-accent">locked.</span>
        </h1>
        <p className="mt-3 text-sm text-muted">
          They&apos;re encrypted on this device with AES-256. Enter your passphrase to unlock them here.
        </p>
        <form
          className="mt-6 space-y-3 rounded-2xl border border-line bg-panel p-5"
          onSubmit={async (e) => {
            e.preventDefault();
            if (!pass) return;
            setState("working");
            const ok = await onUnlock(pass);
            if (!ok) {
              setState("wrong");
              setPass("");
            }
          }}
        >
          <label className="block">
            <span className="mb-1.5 block text-xs font-medium text-muted">Passphrase</span>
            <input
              type="password"
              autoFocus
              autoComplete="current-password"
              value={pass}
              onChange={(e) => {
                setPass(e.target.value);
                if (state === "wrong") setState("idle");
              }}
              className={inputCls}
              aria-invalid={state === "wrong"}
            />
          </label>
          {state === "wrong" && (
            <p role="alert" className="text-xs text-crit">
              That passphrase didn&apos;t work. Try again.
            </p>
          )}
          <Button variant="primary" type="submit" disabled={!pass || state === "working"} className="w-full">
            {state === "working" ? "Unlocking…" : "Unlock"}
          </Button>
        </form>
        <div className="mt-4 flex items-center justify-between text-xs text-faint">
          <span className="flex items-center gap-1.5">
            <ShieldIcon /> Decrypted only in this browser
          </span>
          {confirmWipe ? (
            <span className="flex gap-2">
              <button onClick={onWipe} className="font-semibold text-crit">
                Yes, erase everything
              </button>
              <button onClick={() => setConfirmWipe(false)} className="hover:text-ink">
                Cancel
              </button>
            </span>
          ) : (
            <button onClick={() => setConfirmWipe(true)} className="underline underline-offset-4 hover:text-ink">
              Forgot it?
            </button>
          )}
        </div>
      </div>
    </main>
  );
}
