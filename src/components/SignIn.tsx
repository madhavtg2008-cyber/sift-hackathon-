"use client";

import { useEffect, useState } from "react";
import { lastProfile } from "@/lib/store";
import type { Profile } from "@/lib/types";
import { Logo, ShieldIcon } from "./icons";
import { ProfileForm } from "./ProfileForm";
import { Avatar } from "./ui";

/** Local sign-in: no password or server — the profile lives in this browser. */
export function SignIn({ savedChats, onSignIn }: { savedChats: number; onSignIn: (p: Profile) => void }) {
  const [returning, setReturning] = useState<Profile | null>(null);
  useEffect(() => setReturning(lastProfile()), []);
  return (
    <main className="grain flex min-h-dvh items-center justify-center px-4 py-10">
      <div className="rise w-full max-w-md">
        <Logo />
        <h1 className="mt-8 font-display text-5xl leading-[1.05]">
          Too many chats. <span className="italic text-accent">Only what matters.</span>
        </h1>
        <p className="mt-4 text-[0.9375rem] leading-relaxed text-muted">
          Sift reads your group chats and pulls out mentions, decisions, deadlines and tasks you missed — ranked by urgency. It runs
          entirely on this device: your conversations never touch a server.
        </p>
        <div className="mt-8 rounded-2xl border border-line bg-panel p-5">
          {returning ? (
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-muted">Welcome back</p>
              <button
                onClick={() => onSignIn(returning)}
                className="mt-3 flex w-full items-center gap-3 rounded-xl border border-line2 p-3 text-left transition hover:border-accent"
              >
                <Avatar name={returning.name} size={40} />
                <span className="flex-1">
                  <span className="block font-medium">Continue as {returning.name}</span>
                  <span className="block text-xs text-muted">
                    {savedChats} chat{savedChats === 1 ? "" : "s"} saved on this device
                  </span>
                </span>
                <span className="text-accent">→</span>
              </button>
              <button onClick={() => setReturning(null)} className="mt-3 text-xs text-muted underline underline-offset-4 hover:text-ink">
                Use a different name
              </button>
            </div>
          ) : (
            <ProfileForm initial={null} onSave={onSignIn} submitLabel="Sign in →" compact />
          )}
        </div>
        <p className="mt-4 flex items-center gap-2 text-xs text-faint">
          <ShieldIcon /> No password, no server. Your profile and chats live only in this browser.
        </p>
      </div>
    </main>
  );
}
