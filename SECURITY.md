# Security

## Reporting a vulnerability

Please open a private security advisory on this repository (**Security → Report a vulnerability**). Do not include real chat data in reports. We aim to respond within 72 hours. See also `/.well-known/security.txt` on the deployed site.

## Threat model

Sift's core promise is that **conversations and summaries never leave the user's device**. The table lists what we defend against and how each control is verified.

| Threat                                                             | Control                                                                                                                                                                                                                                                 | Verified by                                                                                                                                         |
| ------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| App code (or a compromised dependency) sends chat text to a server | Privacy firewall wraps `fetch`, `XMLHttpRequest` and `sendBeacon`; any request whose URL or body contains chat text is blocked before it leaves the browser                                                                                             | `tests/netguard.test.ts`, E2E `privacy.spec.ts` (asserts no request carrying chat text reaches the network), in-app leak test                       |
| Exfiltration to a third-party origin                               | CSP `connect-src 'self'`; `default-src 'self'`; `object-src 'none'`                                                                                                                                                                                     | `tests/csp.test.ts`, E2E header checks                                                                                                              |
| Injected inline script (XSS)                                       | Nonce-based CSP: `script-src 'self' 'nonce-…' 'strict-dynamic'` — no `unsafe-inline` or `unsafe-eval` in production; fresh nonce per request; React escapes all chat text                                                                               | `tests/csp.test.ts`, E2E "fresh nonce per load"                                                                                                     |
| Clickjacking                                                       | `X-Frame-Options: DENY`, `frame-ancestors 'none'`                                                                                                                                                                                                       | E2E header checks                                                                                                                                   |
| Protocol downgrade                                                 | HSTS (`max-age=63072000; includeSubDomains; preload`), `upgrade-insecure-requests`                                                                                                                                                                      | E2E header checks                                                                                                                                   |
| Someone with access to the laptop reads stored chats               | Optional AES-256-GCM vault; key derived with PBKDF2-SHA256 (310 000 iterations); non-extractable key kept only in memory; fresh 96-bit IV per write; GCM authentication detects tampering; plaintext and the last-profile hint are removed when enabled | `tests/vault.test.ts` (round trip, wrong passphrase, tamper detection, unique IVs), E2E (no plaintext in `localStorage`, wrong passphrase rejected) |
| Malicious or corrupted rule pack from the network                  | Rule packs are validated against the shared zod schema on the server **and** on the client before use; bundled defaults are used otherwise                                                                                                              | `tests/api.test.ts`                                                                                                                                 |
| API abuse                                                          | 60 requests/min per IP sliding window with `RateLimit-*` and `Retry-After`; strict query validation; 405 for unsupported methods; errors never echo internals                                                                                           | `tests/api.test.ts`                                                                                                                                 |
| Server becomes a data sink                                         | No write endpoints; `POST /api/v1/health` always returns 403 without reading the body                                                                                                                                                                   | `tests/api.test.ts`                                                                                                                                 |
| Vulnerable dependencies                                            | `npm audit --omit=dev --audit-level=high` in CI, Dependabot weekly updates, CodeQL `security-extended` analysis on every push                                                                                                                           | GitHub Actions                                                                                                                                      |
| Shared-file abuse (Share to Sift)                                  | The service worker only handles `POST /share-target`, stores the file in a local cache, and the page deletes it after import; files over 20 MB are rejected                                                                                             | Manual + E2E share flow                                                                                                                             |

## Headers (production)

```
Content-Security-Policy: default-src 'self'; script-src 'self' 'nonce-<random>' 'strict-dynamic';
  style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:;
  connect-src 'self'; worker-src 'self' blob:; manifest-src 'self'; object-src 'none';
  frame-ancestors 'none'; base-uri 'self'; form-action 'self'; upgrade-insecure-requests
Strict-Transport-Security: max-age=63072000; includeSubDomains; preload
X-Frame-Options: DENY
X-Content-Type-Options: nosniff
Referrer-Policy: no-referrer
Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Resource-Policy: same-origin
Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()
```

`style-src 'unsafe-inline'` is kept because React sets inline `style` attributes for theme colours; no inline `<style>` blocks are injected from user data.

## Known limitations

- The rate limiter is per server instance (in memory), which suits a public, read-only API; a shared store would be needed for strict global limits.
- If the encryption passphrase is forgotten, data cannot be recovered — by design.
- On-device AI depends on the browser (desktop Chrome 138+). Other browsers use the local rules engine; there is never a cloud fallback.
