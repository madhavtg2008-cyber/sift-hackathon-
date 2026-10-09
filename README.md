# Sift — catch up on chats, privately

Sift is an AI micro-app that turns overwhelming chat conversations into a short, prioritized catch-up: the mentions, questions, decisions, deadlines and tasks you missed, ranked by urgency and relevance. **All processing happens on the user's device. Conversations and summaries never leave the browser.**

## Features

- **Unread-aware catch-up.** "Catch me up" shows how many things need you out of all unread messages, plus an estimate of reading time saved.
- **Detection engine.** Each message is tagged as a mention, question, task, decision, deadline or urgent item, with a plain-language "why" for every flag.
- **Priority scoring (0–100).** Combines urgency × relevance: direct mentions, unanswered questions, tasks assigned to you, deadline proximity (overdue / under 24h / under 72h), urgent tone, VIP senders and your keywords. Buckets are Critical, High, Medium and Low.
- **Missed-item detection.** Questions to you that you never replied to, and mentions you haven't acted on.
- **Deadline parser.** Understands "by 5pm today", "tomorrow 11am", "EOD", "by Friday", "14th Oct 11:59 pm", "in 2 hours", "on the 10th", and Hinglish ("kal subah 8 baje", "aaj", "parso").
- **Hinglish rule pack.** "jaldi", "bhej do", "final hai", "pakka", "kar do" and more.
- **On-device AI summary.** Uses Chrome's built-in Gemini Nano (Prompt API / Summarizer API) when available. It never falls back to a cloud AI.
- **Your chats only.** There is no demo or fake data — Sift starts empty and only analyses chats you upload or paste yourself.
- **Import anything.** Paste text, upload a WhatsApp `.txt` export, or a Slack/JSON export. Files are read with the File API and never uploaded.
- **Fully interactive.** Mark done, snooze, dismiss, open in chat, mark read up to a message, log your reply (which marks questions answered), paste new messages, search all chats, pin, rename, delete, export/restore a backup, wipe everything.
- **Privacy firewall.** Every `fetch`, XHR and beacon is inspected, and any request containing chat text is blocked before it leaves the browser. A built-in leak test proves it, and a network log shows every request.
- **Strict CSP.** `connect-src 'self'`, so the page can't talk to any other domain.

## Architecture

```
Browser (everything private happens here)
├── parser.ts       WhatsApp / JSON / plain-text chat parsing
├── engine.ts       detection + scoring + extractive summaries
├── dates.ts        deadline extraction (English + Hinglish)
├── ondevice.ts     Chrome built-in Gemini Nano (on-device LLM)
├── netguard.ts     privacy firewall + network audit log
└── store.ts        localStorage persistence (sift:* keys)

Next.js server (never sees conversations)
├── GET  /api/rules    versioned detection rule pack (cached on device)
├── GET  /api/health   status
└── POST /api/health   always refuses (403) — server accepts no content
```

## Run locally

```bash
npm install
npm run dev     # http://localhost:3000
```

## Deploy to Vercel

1. Push this folder to a GitHub repo.
2. On vercel.com, click **Add New → Project** and import the repo.
3. Keep the defaults (framework: Next.js) and click **Deploy**. No environment variables are needed.

## Try on-device AI

Use desktop Chrome 138+ (the Summarizer API is built in). The first run downloads Gemini Nano inside Chrome, and Sift shows the progress. In other browsers the local rules engine does all the work.

## 60-second demo script

1. Sign in with your name. Sift starts empty.
2. In WhatsApp, open a busy group → ⋮ → More → **Export chat** → **Without media**, then upload the .txt with **+ Add chat**.
3. Show the headline ("N things need you out of M unread") and **Needs you now**; tap **why?** on a card.
4. Open the chat: it jumps to the latest message. Switch to **Highlights** to collapse the noise.
5. Log a reply to a question, go back to **Catch me up**, and "Need your reply" drops.
6. Open the **On-device** badge, run the **leak test**, and the request is **BLOCKED**.
