"use client";

import { useState } from "react";
import type { Profile } from "@/lib/types";
import { ProfileForm } from "./ProfileForm";
import { Avatar, Button, Modal } from "./ui";

export function ProfileModal({
  open,
  onClose,
  profile,
  stats,
  onSave,
  onLogout,
}: {
  open: boolean;
  onClose: () => void;
  profile: Profile;
  stats: { chats: number; messages: number; done: number };
  onSave: (p: Profile) => void;
  onLogout: () => void;
}) {
  const [confirmOut, setConfirmOut] = useState(false);
  return (
    <Modal
      open={open}
      onClose={() => {
        setConfirmOut(false);
        onClose();
      }}
      title="Profile"
    >
      <div className="flex items-center gap-4">
        <Avatar name={profile.name} size={56} />
        <div className="min-w-0">
          <p className="truncate font-display text-3xl leading-tight">{profile.name}</p>
          <p className="mt-0.5 flex items-center gap-1.5 text-xs text-muted">
            <span className="h-1.5 w-1.5 rounded-full bg-accent" /> Local account · stored only on this device
          </p>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-3 gap-2">
        {(
          [
            ["Chats", stats.chats],
            ["Messages", stats.messages],
            ["Tasks done", stats.done],
          ] as const
        ).map(([l, n]) => (
          <div key={l} className="rounded-xl border border-line bg-bg px-3 py-2.5">
            <p className="font-mono text-xl">{n}</p>
            <p className="text-[0.6875rem] text-muted">{l}</p>
          </div>
        ))}
      </div>

      <div className="mt-6">
        <ProfileForm
          key={profile.name}
          initial={profile}
          onSave={(p) => {
            onSave(p);
            onClose();
          }}
          submitLabel="Save profile"
        />
      </div>

      <div className="mt-6 flex items-center justify-between gap-3 border-t border-line pt-4">
        {confirmOut ? (
          <>
            <span className="text-xs text-muted">Sign out? Your chats stay saved on this device.</span>
            <div className="flex gap-1.5">
              <Button size="sm" variant="ghost" onClick={() => setConfirmOut(false)}>
                Cancel
              </Button>
              <Button size="sm" variant="danger" onClick={onLogout}>
                Sign out
              </Button>
            </div>
          </>
        ) : (
          <>
            <span className="text-xs text-faint">No password, no server — your profile is just for this browser.</span>
            <Button size="sm" variant="danger" onClick={() => setConfirmOut(true)}>
              Sign out
            </Button>
          </>
        )}
      </div>
    </Modal>
  );
}
