"use client";

import { useState } from "react";
import type { Profile } from "@/lib/types";
import { Button, Field, inputCls } from "./ui";

const split = (s: string) =>
  s
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);

export function ProfileForm({
  initial,
  onSave,
  submitLabel = "Save",
  compact,
}: {
  initial: Profile | null;
  onSave: (p: Profile) => void;
  submitLabel?: string;
  compact?: boolean;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [aliases, setAliases] = useState(initial?.aliases.join(", ") ?? "");
  const [vips, setVips] = useState(initial?.vips.join(", ") ?? "");
  const [keywords, setKeywords] = useState(initial?.keywords.join(", ") ?? "");

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        if (!name.trim()) return;
        onSave({ name: name.trim(), aliases: split(aliases), vips: split(vips), keywords: split(keywords).map((k) => k.toLowerCase()) });
      }}
    >
      <Field label="Your name, as it appears in chats" hint="Used to detect when people mention you or ask you something.">
        <input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Madhav" className={inputCls} required />
      </Field>
      {!compact && (
        <>
          <Field label="Nicknames people use for you" hint="Comma separated, e.g. Maddy, MT">
            <input value={aliases} onChange={(e) => setAliases(e.target.value)} placeholder="Maddy, MT" className={inputCls} />
          </Field>
          <Field label="VIP people" hint="Messages from them get a priority boost. e.g. Mom, Rohan, Neha (CR)">
            <input value={vips} onChange={(e) => setVips(e.target.value)} placeholder="Mom, Rohan" className={inputCls} />
          </Field>
          <Field label="Topics you care about" hint="Messages containing these words are surfaced. e.g. invoice, exam, deploy">
            <input value={keywords} onChange={(e) => setKeywords(e.target.value)} placeholder="invoice, exam, deploy" className={inputCls} />
          </Field>
        </>
      )}
      <div className="flex justify-end">
        <Button variant="primary" type="submit" disabled={!name.trim()}>
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}
