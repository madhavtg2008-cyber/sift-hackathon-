"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { AppData, Conversation, ItemState, Lexicon, Message, Profile, Source } from "./types";
import { DEFAULT_LEXICON } from "./lexicon";
import { uid } from "./util";

const KEY = "sift:v1";
const RULES_KEY = "sift:rules";
const LAST_PROFILE_KEY = "sift:lastProfile";

export function lastProfile(): Profile | null {
  try {
    const raw = localStorage.getItem(LAST_PROFILE_KEY);
    return raw ? (JSON.parse(raw) as Profile) : null;
  } catch {
    return null;
  }
}

const EMPTY: AppData = { version: 1, profile: null, conversations: [], items: {} };

function load(): AppData {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return EMPTY;
    const parsed = JSON.parse(raw) as AppData;
    if (parsed?.version !== 1) return EMPTY;
    return { ...EMPTY, ...parsed };
  } catch {
    return EMPTY;
  }
}

export function storageBytes() {
  try {
    let n = 0;
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k?.startsWith("sift:")) n += (localStorage.getItem(k)?.length ?? 0) * 2;
    }
    return n;
  } catch {
    return 0;
  }
}

/** All app state lives in this browser's localStorage. Nothing is synced anywhere. */
export function useAppData() {
  const [data, setData] = useState<AppData | null>(null);
  const first = useRef(true);

  useEffect(() => {
    setData(load());
  }, []);

  useEffect(() => {
    if (!data) return;
    if (first.current) {
      first.current = false;
      return;
    }
    try {
      localStorage.setItem(KEY, JSON.stringify(data));
    } catch {
      /* storage full or blocked — keep working in memory */
    }
  }, [data]);

  const update = useCallback((fn: (d: AppData) => AppData) => setData((d) => (d ? fn(d) : d)), []);

  const actions = {
    setProfile: (profile: Profile) => update((d) => ({ ...d, profile })),

    /** Sign out of the local profile. Chats stay on this device for the next sign-in. */
    logout: () =>
      update((d) => {
        try {
          if (d.profile) localStorage.setItem(LAST_PROFILE_KEY, JSON.stringify(d.profile));
        } catch {
          /* ignore */
        }
        return { ...d, profile: null };
      }),

    addConversation: (name: string, source: Source, messages: Omit<Message, "id">[], readCount = 0) => {
      const id = uid();
      const conv: Conversation = {
        id,
        name: name.trim() || "Untitled chat",
        source,
        messages: messages.map((m) => ({ ...m, id: uid() })).sort((a, b) => a.ts - b.ts),
        lastReadIndex: readCount - 1,
        createdAt: Date.now(),
      };
      update((d) => ({ ...d, conversations: [...d.conversations, conv] }));
      return id;
    },

    appendMessages: (convId: string, messages: Omit<Message, "id">[]) =>
      update((d) => ({
        ...d,
        conversations: d.conversations.map((c) =>
          c.id === convId
            ? { ...c, messages: [...c.messages, ...messages.map((m) => ({ ...m, id: uid() }))].sort((a, b) => a.ts - b.ts) }
            : c,
        ),
      })),

    markRead: (convId: string, upTo?: number) =>
      update((d) => ({
        ...d,
        conversations: d.conversations.map((c) =>
          c.id === convId ? { ...c, lastReadIndex: upTo ?? c.messages.length - 1 } : c,
        ),
      })),

    markAllRead: () =>
      update((d) => ({ ...d, conversations: d.conversations.map((c) => ({ ...c, lastReadIndex: c.messages.length - 1 })) })),

    markUnread: (convId: string) =>
      update((d) => ({
        ...d,
        conversations: d.conversations.map((c) => (c.id === convId ? { ...c, lastReadIndex: -1 } : c)),
      })),

    renameConversation: (convId: string, name: string) =>
      update((d) => ({ ...d, conversations: d.conversations.map((c) => (c.id === convId ? { ...c, name } : c)) })),

    togglePin: (convId: string) =>
      update((d) => ({
        ...d,
        conversations: d.conversations.map((c) => (c.id === convId ? { ...c, pinned: !c.pinned } : c)),
      })),

    deleteConversation: (convId: string) =>
      update((d) => {
        const items = Object.fromEntries(Object.entries(d.items).filter(([k]) => !k.startsWith(convId + ":")));
        return { ...d, items, conversations: d.conversations.filter((c) => c.id !== convId) };
      }),

    setItem: (key: string, patch: Partial<ItemState>) =>
      update((d) => ({ ...d, items: { ...d.items, [key]: { ...d.items[key], ...patch } } })),

    importBackup: (backup: AppData) => setData({ ...EMPTY, ...backup }),

    wipe: () => {
      try {
        Object.keys(localStorage)
          .filter((k) => k.startsWith("sift:"))
          .forEach((k) => localStorage.removeItem(k));
      } catch {
        /* ignore */
      }
      first.current = true;
      setData({ ...EMPTY });
    },
  };

  return { data, actions };
}

/** Rule pack: bundled default, refreshed from the backend and cached locally. */
export function useLexicon() {
  const [lex, setLex] = useState<Lexicon>(DEFAULT_LEXICON);
  const [source, setSource] = useState<"bundled" | "cached" | "server">("bundled");
  useEffect(() => {
    try {
      const cached = localStorage.getItem(RULES_KEY);
      if (cached) {
        setLex(JSON.parse(cached));
        setSource("cached");
      }
    } catch {
      /* ignore */
    }
    fetch("/api/rules")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((l: Lexicon) => {
        if (!l?.urgent) return;
        setLex(l);
        setSource("server");
        try {
          localStorage.setItem(RULES_KEY, JSON.stringify(l));
        } catch {
          /* ignore */
        }
      })
      .catch(() => {
        /* offline: keep bundled/cached rules */
      });
  }, []);
  return { lex, source };
}
