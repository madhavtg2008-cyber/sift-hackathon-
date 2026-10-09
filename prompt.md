# prompt.md — AI-assisted development log for **Sift**

> **Note on timing:** this file was created at 14:35 IST on 9 Oct 2026, **after** the first working version of Sift was already built and deployed (the hackathon brief asking for `prompt.md` arrived mid-event). Everything below is reconstructed from the actual chat with the AI assistant. Prompts are quoted verbatim (typos included). Nothing has been invented. Entries added from now on are logged as they happen.

---

## 1. Project Overview

**Problem (hackathon brief, received 12:32 IST):** build a simple AI micro app that helps users quickly understand and prioritize important information from overwhelming chat conversations — unread conversations; important messages, decisions and action items; prioritizing by urgency and relevance; highlighting missed mentions, deadlines and tasks; local-first processing; conversation data and summaries must never leave the user's device.

**Solution — Sift:** a web app where you upload or paste your own chats (WhatsApp `.txt` export, Slack/JSON export, or plain `Name: message` text). Sift analyses them **in the browser** and shows:

- **Catch me up:** "N things need you out of M unread messages", a ranked *Needs you now* list, a deadline timeline, recent decisions, and missed mentions.
- **Per-message tags:** Mention, Question, Task, Decision, Deadline, Urgent — each with a 0–100 priority score and a "why?" explanation.
- **Category views:** Tasks, Questions, Deadlines, Mentions, Decisions (filter for me/everyone, sort, show done/snoozed).
- **Chat view:** opens at the latest message, unread divider, Highlights mode that hides small talk, rule-based catch-up summary, optional on-device AI summary, "log my reply" (marks questions answered), paste new messages.
- **Privacy:** everything stored in `localStorage`; a privacy firewall blocks any request containing chat text; a leak-test button proves it; strict CSP.
- **Personalisation:** local profile (name, nicknames, VIPs, keywords), sign out / "Welcome back" sign-in, 6 themes, accent colours, heading style, text size, focus mode.
- **Only the user's own chats:** no demo or fake data (removed at 14:27 IST at the user's request).

**Target users:** students and professionals in busy WhatsApp/Slack groups (class groups, project teams, family, clients), including Hinglish chats.

---

## 2. Tech Stack & Architecture

| Layer | Choice |
|---|---|
| Framework | Next.js 15 (App Router) + React 19 + TypeScript |
| Styling | Tailwind CSS v4, CSS-variable themes; fonts: Geist (npm `geist`), Instrument Serif (`@fontsource`) |
| Storage | Browser `localStorage` only (`sift:*` keys) |
| On-device AI | Chrome built-in Gemini Nano via Prompt API (`LanguageModel`) / Summarizer API, with rule-engine fallback (never a cloud API) |
| Backend | Next.js API routes on Vercel: `GET /api/rules` (detection rule pack), `GET /api/health`, `POST /api/health` (always 403, accepts no content) |
| Hosting | GitHub → Vercel (auto-deploy on push) |

```
Browser (all private processing)
├── parser.ts     WhatsApp (Android/iOS) / JSON / plain-text parsing
├── engine.ts     detection + 0–100 scoring + extractive summaries
├── dates.ts      deadline extraction (English + Hinglish: aaj, kal, parso, "8 baje")
├── lexicon.ts    rule pack (English + Hinglish keywords)
├── ondevice.ts   Gemini Nano wrapper with output sanity check
├── netguard.ts   privacy firewall (fetch/XHR/sendBeacon inspection) + network log
├── store.ts      localStorage persistence, sign-out / last profile
└── prefs*.ts     themes & reading preferences (+ no-flash boot script)

Server (never receives conversations)
└── /api/rules, /api/health
```

Security headers (`next.config.ts`): `Content-Security-Policy` with `connect-src 'self'`, `frame-ancestors 'none'`, `Referrer-Policy: no-referrer`, `X-Content-Type-Options: nosniff`.

---

## 3. AI Code Generation (significant prompts)

**AI tool for every entry: Claude (Anthropic), model Claude Opus 5.5, used in the claude.ai app with code/shell tools.** The AI wrote and ran the code in a cloud workspace, tested it in headless Chromium, and (from 13:30) pushed directly to the GitHub repo.

| # | Time (IST) | Actual prompt | Purpose | Files / components | Outcome & verification |
|---|---|---|---|---|---|
| 1 | 11:02 | "Ok so listen I'm at a hackathon in my college and we have to vibe code either an app or a website alright and upload it in vercel when they give me the topic will tell u what it is kindly do it for me got it? Maybe don't upload it in vercel I'll do it if u want" | Set up collaboration | — | AI proposed Next.js + Tailwind, user deploys. |
| 2 | 11:03 | "U have 4 hours so y can take ur time. What is anti gravity they're telling us to use it" | Understand tooling | — | AI web-searched and explained Google Antigravity. (User later clarified it was optional.) |
| 3 | 11:04 | "Ok fine be ready I'll give u the topic ok and it shudnt have static buttons or pages" | Requirement: fully interactive | All UI | Every control is wired to real state (verified in browser tests, §6). |
| 4 | 11:32 | "Ok ok listen it'll start in 10 min and we have to blunt a FULL STACK website in pretty sure with back end also MAYBE ZILL LET U KNOW but be ready" | Requirement: full stack | API routes | Backend kept to non-sensitive routes so the privacy rule still holds. |
| 5 | 12:32 | "challenge is to build a simple AI micro app that helps users wuickly understar and prioritize imprtant info from overwhelming chat convos. the solution can focus on: unread convos / indentifying important messages, decisions, and action items / prioritizing info based on urgency and relevence / highlighting mentions, deadlines, and tasks the user may have missed / using local first processing / ensuring convos data and summarises never leave the user device" | **Main build** | Whole app: `src/lib/*`, `src/components/*`, `src/app/api/*`, `next.config.ts`, `README.md` | First version built, `next build` passed, tested in headless Chromium, delivered as zip, deployed by user to Vercel. |
| 6 | 13:12 | "make a way so that i can also integrate whatsapo cahts into this and before that answer my question then ask me if u can go ahead or not. can i conect my whatsapp to this so taht all myu etxts are directly forwarded to the website" | Explore live WhatsApp integration | — | AI explained: no official API for personal chats; unofficial libraries risk bans and would break the "never leaves device" rule. Proposed a "Share to Sift" option. **Not built** (not approved yet). |
| 7 | 13:16 | "ok ok change it a little bit i want it to be a little decluttered and in the settings area down on the left let people also chantge the theme of the website etc and make ity unique" | Declutter + themes | `InsightCard`, `Digest`, `ConversationView`, `App`, new `SettingsModal`, `prefs.ts`, `prefs-shared.ts`, `globals.css`, `layout.tsx` | Cards simplified ("why?" toggle), 6 themes, accents, heading style, text size, focus mode. Verified with screenshots in 4 themes + reload persistence. |
| 8 | 14:01 | "ok when u open the chats make it automatically go all the way down and on the left in the chats section make it a drop down and also put  a delete button and a confirm to delete after that" | Chat UX | `ConversationView`, `App` | Auto-scroll to newest message; collapsible chat list; delete with inline confirm. Verified by browser test. |
| 9 | 14:08 | "in the bottom left make it a login kinda thing the profile diff and settings 2 diff buttons and the drop down and going back up make it smooth" | Account area + animation | `App`, new `ProfileModal`, `SettingsModal`, `store.ts` | Account card with Profile / Settings buttons; sign out with confirm; "Welcome back" sign-in; animated collapse. Verified by browser test. |
| 10 | 14:10 | "and also the tasts questions and all that a drop down from catch me up or not make it so it isnt so clustured" | Declutter sidebar | `App` | Categories nested in an animated dropdown under *Catch me up*. Verified by screenshot. |
| 11 | 14:18 | "also add a way to change name of the groups and give me more ideas to make it nice" | Rename chats | `App`, `ConversationView` | Rename from sidebar (pencil on hover). Ideas list given; none built yet. |
| 12 | 14:20 | "thats a very abd way make it a pencile button enar hte name to change it" | Better rename UX | `ConversationView` | Visible pencil button next to chat name, Save/Cancel form. Verified by screenshot. |
| 13 | 14:27 | "ok ok no no fake data and ONLY THE user can upload the chats no demo chats" | Remove all demo data | Deleted `src/lib/samples.ts`, `src/app/api/samples/route.ts`, `public/sample-whatsapp-chat.txt`; edited `ImportModal`, `Digest`, `App`, `PrivacyPanel`, `store.ts`, `types.ts`, `README.md` | Sift starts empty; old demo chats auto-removed from storage. Upload of a WhatsApp-format file verified in browser. |
| 14 | 14:35 | The "MASTER PROMPT — VIBE CODING HACKATHON" (asks for this `prompt.md`) | Documentation | `prompt.md` | This file. |

Deployment-related prompts (13:01–13:31) — "i made a repo and put it inb", "https://github.com/madhavtg2008-cyber/sift-hackathon-", "done ur on git", "done" — led to the GitHub App being installed so the AI could push directly; every push since 13:30 was confirmed by Vercel's commit status ("Deployment has completed").

---

## 4. Debugging (real issues hit during development)

| Issue | How it showed up | Fix | Verified |
|---|---|---|---|
| Display serif font not applied | Screenshot showed headings in sans-serif | Font CSS variables were defined on `<body>` but referenced at `:root`; moved Geist variables to `<html>` and set `--font-display` directly | Screenshot after rebuild |
| On-device AI "summary" echoed the transcript | Headless Chromium exposed a Summarizer stub that returned the input | Added `sane()` check (rejects empty or near-identical output), Prompt API → Summarizer fallback, softer error message | Browser test shows graceful message. **Real Gemini Nano not tested** (no model in the test browser) |
| Pasted messages counted as read | Pasted within the same second as a logged reply, so they sorted before it | Pasted timestamps start after the last existing message | Browser test |
| Build error: "You're importing a component that needs `useEffect`…" | `next build` failed after adding themes | Server `layout.tsx` imported a client hook module; split into `prefs-shared.ts` (no React) and `prefs.ts` (`"use client"`) | Build passed |
| TS error `Cannot find name 'KEY'` | After the split | Exported `PREFS_KEY` from shared module | `tsc --noEmit` clean |
| Stale `.next/types` errors after deleting `/api/samples` | `tsc` referenced removed route | Deleted `.next` and rebuilt | Build passed |
| Engine false positives / misses | Engine test printout | "Good morning everyone" flagged as callout → callouts need ≥ 4 words; "due on the 10th" not parsed → ordinal-date rule; "8 baje" not parsed → Hinglish time rule; small talk with dates ("fest tonight?") surfaced → date-only chit-chat dropped; small groups (≤ 3 others) treat unaddressed asks as "for you" | Re-ran engine test, outputs checked by hand |
| GitHub push refused (HTTP 403) | "Claude doesn't have GitHub access…" | User installed the Claude GitHub App on the repo | Push succeeded |
| User still saw old version after deploy | Screenshot at 13:31 showed old settings dialog | Checked GitHub commit status: deploy had just finished; advised hard refresh / not using a pinned deployment URL | Vercel status "Deployment has completed" |
| Commit shown as unverified | Git hook warning | Re-authored commit to the AI's noreply identity | Hook passed |
| Local tooling hiccups | `EADDRINUSE` when restarting the test server; `rsync` not installed | Killed the process on the port; used `tar` instead | — |

---

## 5. AI Features & Design decisions

- **Why rules + on-device LLM instead of a cloud LLM:** the brief requires that conversations and summaries never leave the device. Any cloud API (OpenAI, Gemini API, etc.) would violate this, so the core "AI" is a local rule/scoring engine, with Chrome's built-in Gemini Nano as an optional on-device summariser.
- **On-device prompt (used in `ondevice.ts`, Prompt API system prompt):**
  > You triage chat conversations for {name}. Reply in plain text, max 6 short bullet lines starting with "• ". Cover: what happened, decisions made, tasks or questions for {name}, and deadlines. No preamble.
- **Priority score (0–100):** mention +30, group callout +15, question to you +18 (+12 if unanswered), task for you +25 (+16 group, +14 small group), your own commitment +22, decision +18, deadline +10 (+25 overdue, +22 < 24 h, +12 < 72 h when relevant), urgent tone +18, VIP +10, keyword +8 each (max 16), unread +8; buckets Critical ≥ 70, High ≥ 48, Medium ≥ 28.
- **Backend design:** server only serves a versioned rule pack and health check; `POST /api/health` always returns 403 so the leak test has a real endpoint to (fail to) reach.
- **UI/UX decisions driven by user prompts:** decluttered cards with "why?" toggle (#7), themes Midnight / Paper / Chai / Matcha / Dusk / Terminal (#7), chats open at the bottom like a messenger (#8), account card + sign-in screen (#9), nested animated categories (#10), pencil-button rename (#12), no demo data (#13).

---

## 6. Testing & Improvements

All tests below were actually run by the AI in its workspace:

- **Type/lint/build:** `npx tsc --noEmit`, `npx eslint src`, `npm run build` after every change — all passing at last run.
- **Parser tests (tsx script):** Android WhatsApp export (incl. system lines, multi-line messages, `<Media omitted>`), iOS export, Slack/JSON export, plain text — all parsed correctly.
- **Engine tests (tsx script):** ran the scorer over realistic test conversations and checked tags, scores, deadlines and summaries by hand (led to the tuning fixes in §4). These test chats were development fixtures and have since been removed from the app.
- **End-to-end (Playwright, headless Chromium):** sign-in, import by file upload and by paste, chat view, Highlights mode, logging a reply (Needs-reply count dropped 5 → 3), pasting new messages, search, reload persistence, leak test (**BLOCKED**), theme switching + persistence, focus mode, delete with confirm, collapsible sections, rename, sign out → "Welcome back" → sign in. No page errors in any run.
- **Backend:** `curl` checks — `GET /api/health` returns OK; `POST /api/health` returns 403.
- **Deployment:** every push confirmed by Vercel commit status.
- **Not yet tested:** real Gemini Nano in desktop Chrome 138+, real phones, very large exports (> 8 MB is rejected by design).

---

## 7. Final Summary (as of 14:35 IST)

- **AI tools used:** Claude (Anthropic) — Claude Opus 5.5 in claude.ai (planning, code generation, debugging, testing, deployment via GitHub); web search (to look up Google Antigravity). Runtime AI inside the app: Chrome built-in Gemini Nano (on-device, optional).
- **AI's contribution:** architecture, all application code (~4,300 lines across ~29 files), engine tuning, automated tests, README, deploys to GitHub/Vercel.
- **User's contribution:** product direction and every UX change listed in §3, repo creation, Vercel setup, GitHub App authorisation, review of the live site.
- **Completed features:** local-first chat import (WhatsApp/JSON/text), detection + priority scoring, Catch me up dashboard, category views, chat view with highlights and auto-scroll, on-device AI summary (with fallback), privacy firewall + leak test + CSP, local profile with sign in/out, settings with 6 themes, rename/delete/pin chats, search, backup export/restore, wipe data, no fake data.

---

## Change log (from now on)

| Time (IST) | Prompt | Change | Verified |
|---|---|---|---|
| 14:35 | MASTER PROMPT (create prompt.md) | Added this file | Pushed to repo |
