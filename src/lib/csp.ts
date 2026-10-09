/**
 * Content-Security-Policy for Sift. Scripts are allowed only with a per-request nonce
 * (no 'unsafe-inline'), and the page may only connect to its own origin — so even if
 * some code tried to send chat data elsewhere, the browser would refuse.
 */
export function buildCsp(nonce: string, dev = false) {
  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${dev ? " 'unsafe-eval'" : ""}`,
    // React sets inline style attributes (theme colours); no inline <style> injection is used.
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self' data:",
    `connect-src 'self'${dev ? " ws: wss:" : ""}`,
    "worker-src 'self' blob:",
    "manifest-src 'self'",
    "object-src 'none'",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    ...(dev ? [] : ["upgrade-insecure-requests"]),
  ].join("; ");
}
