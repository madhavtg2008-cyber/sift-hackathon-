# Sift — catch up on chats, privately

[![CI](https://github.com/madhavtg2008-cyber/sift-hackathon-/actions/workflows/ci.yml/badge.svg)](https://github.com/madhavtg2008-cyber/sift-hackathon-/actions/workflows/ci.yml)

Sift turns overwhelming chat conversations into a short, prioritized catch-up: the mentions, questions, decisions, deadlines and tasks you missed, ranked by urgency and relevance. **All processing happens on your device. Conversations and summaries never leave the browser.**

## Features

**Understanding chats**

- **Unread-aware catch-up.** "Catch me up" shows how many things need you out of all unread messages, plus an estimate of reading time saved.
- **Detection engine.** Each message is tagged as a mention, question, task, decision, deadline or urgent item, with a plain-language "why?" for every flag.
- **Priority scoring (0–100).** Urgency × relevance: direct mentions, unanswered questions, tasks for you, deadline proximity (overdue / < 24 h / < 72 h), urgent tone, VIP senders and your keywords → Critical / High / Medium / Low.
- **Missed-item detection.** Questions you never replied to and mentions you haven't acted on.
- **Deadline parser.** "by 5pm today", "tomorrow 11am", "EOD", "by Friday", "14th Oct 11:59 pm", "in 2 hours", "on the 10th", and Hinglish ("kal subah 8 baje", "aaj", "parso").
- **Hinglish rule pack.** "jaldi", "bhej do", "final hai", "pakka", "kar do" and more.
- **On-device AI summary.** Chrome's built-in Gemini Nano (Prompt / Summarizer API) when available — never a cloud AI.

**Getting chats in**

- **Share to Sift (Android PWA).** WhatsApp → Export chat → Share → **Sift**. A service worker catches the file inside the browser; the POST never reaches the network.
- **Upload or paste.** WhatsApp `.txt` or `.zip` exports (Android and iPhone), Slack/JSON exports, or plain `Name: message` text. Zips are unpacked in the browser.
- **Your chats only.** No demo or fake data.

**Using it**

- Mark done / snooze / hide with **undo toasts**, open in chat, mark read up to a message, log your reply (marks questions answered), paste new messages, search, pin, rename, delete with confirm + undo.
- Local profile with sign in / sign out, 6 themes, accent colours, heading style, text size, focus mode.
- **Mobile tab bar**, installable as an app, keyboard shortcuts (`/` search, `n` new chat, `Esc` clear).

## Security & privacy

| Layer                        | What it does                                                                                                                                                                        |
| ---------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Local-first processing       | Parsing, scoring, summaries and search run in the tab (or a Web Worker).                                                                                                            |
| Privacy firewall             | Every `fetch` / XHR / `sendBeacon` is inspected; requests containing chat text are **blocked** before leaving the browser. Built-in leak test + network log.                        |
| Encrypted storage (optional) | AES-256-GCM, key from your passphrase via PBKDF2-SHA256 (310 000 iterations). Non-extractable key kept in memory only; fresh IV per write; tamper detection. Lock / unlock screen.  |
| Nonce-based CSP              | Per-request nonce via middleware, `script-src 'self' 'nonce-…' 'strict-dynamic'` (no `unsafe-inline` scripts), `connect-src 'self'`, `object-src 'none'`, `frame-ancestors 'none'`. |
| Headers                      | HSTS (preload), X-Frame-Options DENY, COOP/CORP same-origin, nosniff, no-referrer, restrictive Permissions-Policy, `X-Powered-By` removed.                                          |
| Server                       | Accepts no content: `POST /api/health` always returns 403.                                                                                                                          |

## Architecture

```
Browser (all private processing)
├── components/        App shell, Sidebar, Digest, ConversationView, ListView, modals
├── hooks/useAnalysis  inline analysis for small inboxes, Web Worker above 1 500 messages
├── workers/           analyze.worker.ts — engine off the main thread
├── lib/parser.ts      WhatsApp (Android/iOS) / JSON / plain-text parsing
├── lib/share.ts       .zip unpacking + Share-to-Sift handoff
├── lib/engine.ts      detection + 0–100 scoring + extractive summaries
├── lib/dates.ts       deadline extraction (English + Hinglish)
├── lib/ondevice.ts    Chrome built-in Gemini Nano wrapper
├── lib/netguard.ts    privacy firewall + network audit log
├── lib/vault.ts       AES-GCM / PBKDF2 encryption
└── lib/store.ts       localStorage persistence (plain or encrypted vault)

public/sw.js           service worker: Share-to-Sift target only
src/middleware.ts      per-request CSP nonce

Next.js server (never sees conversations)
├── GET  /api/rules    versioned rule pack, ETag / 304 revalidation
├── GET  /api/health   status
└── POST /api/health   always 403 — accepts no content
```

**Performance:** analysis moves to a Web Worker for big inboxes; chat threads render the newest 300 messages with "show earlier" paging (a 4 000-message chat opens in under half a second in testing).

## Quality

```bash
npm run lint        # ESLint (also enforced during `next build`)
npm run typecheck   # tsc --noEmit
npm test            # 56 Vitest unit tests: parser, deadlines, engine, encryption, zip import
npm run format:check
npm run build
```

GitHub Actions runs all of the above on every push.

## Run locally

```bash
npm install
npm run dev     # http://localhost:3000
```

## Deploy

Import the repo on Vercel with default settings. No environment variables are needed.

## Try on-device AI

Desktop Chrome 138+ includes the Summarizer API. The first run downloads Gemini Nano inside Chrome. Other browsers use the local rules engine.

## 60-second demo

1. Sign in with your name. Sift starts empty.
2. In WhatsApp: busy group → ⋮ → More → **Export chat** → **Without media** → share to **Sift** (or upload the file).
3. Show "N things need you out of M unread" and **Needs you now**; tap **why?** on a card; tick one done and hit **Undo**.
4. Open the chat — it jumps to the latest message; switch to **Highlights**.
5. Privacy badge → **Run leak test** (BLOCKED) → **Encrypt** with a passphrase → **Lock** → unlock.
