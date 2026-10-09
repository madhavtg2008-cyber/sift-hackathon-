# Testing

All numbers below come from the last local run and are re-checked by GitHub Actions on every push.

| Suite           | Tool                                                  | Count                        | What it covers                                                                                                                                                                                                                                                                |
| --------------- | ----------------------------------------------------- | ---------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Unit + API      | Vitest                                                | 89 tests in 10 files         | Chat parsing (Android/iOS WhatsApp, Slack/JSON, plain text), deadline extraction (English + Hinglish), detection & scoring, AES-GCM vault, privacy firewall, CSP, iCalendar export, zip import, every `/api/v1` route (validation, 304, 400, 403, 405, 429, legacy redirects) |
| End-to-end      | Playwright                                            | 12 tests (desktop + Pixel 7) | Import → catch-up, undo, reply tracking, persistence + search, calendar export, leak test blocked, encryption lock/unlock, security headers, fresh CSP nonce, mobile tab bar                                                                                                  |
| Accessibility   | axe-core via Playwright                               | 2 scans                      | WCAG 2.0/2.1 A + AA on the sign-in screen, chat view and dashboard — **0 violations**                                                                                                                                                                                         |
| Static analysis | ESLint, TypeScript strict, Prettier                   | —                            | Enforced in CI and during `next build`                                                                                                                                                                                                                                        |
| Security        | CodeQL (`security-extended`), `npm audit`, Dependabot | —                            | Every push / weekly                                                                                                                                                                                                                                                           |

**Coverage** (logic layers: `src/lib`, `src/server`, `src/app/api`): **91.6 % lines, 83.9 % branches, 87.3 % functions**, with CI thresholds of 80 / 75 / 80. UI components and browser-only glue (storage, on-device model) are exercised by the Playwright suite instead.

## Bugs the tests caught

| Bug                                                                                     | Found by                                                      |
| --------------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| Slack `ts` values parsed as fractional milliseconds                                     | `parser.test.ts`                                              |
| Zip imports named after the zip file instead of the chat inside it                      | browser test → `share.test.ts`                                |
| `+` in `?pack=en+hinglish` decoded as a space, so the client would have been sent a 400 | code review while writing `api.test.ts`                       |
| Low-contrast secondary text in all six themes (WCAG 1.4.3)                              | axe scan                                                      |
| `aria-label` on an element without a role                                               | axe scan                                                      |
| PostCSS advisory (GHSA-qx2v-qp2m-jg93 and others) in Next.js's bundled copy             | `npm audit` in CI → fixed with an override, 0 vulnerabilities |

## Running

```bash
npm test               # unit + API
npm run test:coverage  # with coverage thresholds
npm run build && npm run test:e2e   # Playwright (starts the production server)
```

E2E tests generate their WhatsApp-format input on the fly, dated today, so deadline assertions never go stale.
