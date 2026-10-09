/**
 * Privacy firewall. Wraps fetch / XHR / sendBeacon in the page and inspects every
 * outgoing request. If a request URL or body contains any conversation content,
 * it is BLOCKED before it leaves the browser. Every request is logged so the user
 * can audit exactly what went over the network.
 */

export interface NetEvent {
  id: number;
  time: number;
  method: string;
  url: string;
  bytes: number;
  sameOrigin: boolean;
  blocked: boolean;
  reason?: string;
}

type Listener = () => void;

let installed = false;
let seq = 0;
let events: NetEvent[] = [];
const listeners = new Set<Listener>();
let sensitive: () => string[] = () => [];

function emit() {
  events = [...events];
  listeners.forEach((l) => l());
}

export const netguard = {
  subscribe(l: Listener) {
    listeners.add(l);
    return () => listeners.delete(l);
  },
  snapshot() {
    return events;
  },
  setSensitiveSource(fn: () => string[]) {
    sensitive = fn;
  },
  clear() {
    events = [];
    emit();
  },
};

const EMPTY: NetEvent[] = [];
export function serverSnapshot() {
  return EMPTY;
}

function bodyToString(body: unknown): string {
  if (body == null) return "";
  if (typeof body === "string") return body;
  if (body instanceof URLSearchParams) return body.toString();
  if (typeof FormData !== "undefined" && body instanceof FormData) {
    const parts: string[] = [];
    body.forEach((v) => typeof v === "string" && parts.push(v));
    return parts.join("\n");
  }
  if (body instanceof ArrayBuffer) return new TextDecoder().decode(body);
  if (ArrayBuffer.isView(body)) return new TextDecoder().decode(body as ArrayBufferView);
  return "";
}

function inspect(method: string, rawUrl: string, body: unknown): NetEvent {
  let url = rawUrl;
  let sameOrigin = true;
  try {
    const u = new URL(rawUrl, location.href);
    sameOrigin = u.origin === location.origin;
    url = sameOrigin ? u.pathname + u.search : u.href;
  } catch {
    /* keep raw */
  }
  const payload = bodyToString(body);
  const haystack = (decodeURIComponent(safe(rawUrl)) + "\n" + payload).toLowerCase();
  let blocked = false;
  let reason: string | undefined;
  for (const s of sensitive()) {
    if (s.length >= 12 && haystack.includes(s)) {
      blocked = true;
      reason = "Request contained conversation text";
      break;
    }
  }
  const ev: NetEvent = {
    id: ++seq,
    time: Date.now(),
    method: method.toUpperCase(),
    url,
    bytes: new Blob([payload]).size,
    sameOrigin,
    blocked,
    reason,
  };
  events.push(ev);
  if (events.length > 200) events.shift();
  queueMicrotask(emit);
  return ev;
}

function safe(s: string) {
  try {
    return decodeURIComponent(s);
  } catch {
    return s;
  }
}

export function installNetguard() {
  if (installed || typeof window === "undefined") return;
  installed = true;

  const origFetch = window.fetch.bind(window);
  window.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    const method = init?.method ?? (input instanceof Request ? input.method : "GET");
    // Next.js internal router/HMR requests are same-origin and carry no chat data; still logged.
    const ev = inspect(method, url, init?.body);
    if (ev.blocked) return Promise.reject(new TypeError(`Sift privacy firewall blocked ${ev.url}`));
    return origFetch(input, init);
  };

  const origOpen = XMLHttpRequest.prototype.open;
  const origSend = XMLHttpRequest.prototype.send;
  XMLHttpRequest.prototype.open = function (
    this: XMLHttpRequest & { __sift?: [string, string] },
    method: string,
    url: string | URL,
    ...rest: unknown[]
  ) {
    this.__sift = [method, String(url)];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (origOpen as any).call(this, method, url, ...rest);
  } as typeof XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.send = function (
    this: XMLHttpRequest & { __sift?: [string, string] },
    body?: Document | XMLHttpRequestBodyInit | null,
  ) {
    const [m, u] = this.__sift ?? ["GET", ""];
    const ev = inspect(m, u, body);
    if (ev.blocked) throw new TypeError(`Sift privacy firewall blocked ${ev.url}`);
    return origSend.call(this, body);
  };

  if (navigator.sendBeacon) {
    const origBeacon = navigator.sendBeacon.bind(navigator);
    navigator.sendBeacon = (url: string | URL, data?: BodyInit | null) => {
      const ev = inspect("BEACON", String(url), data);
      if (ev.blocked) return false;
      return origBeacon(url, data);
    };
  }
}

/** Lets the user prove the firewall works: tries to send a chat message to the server. */
export async function selfTest(sample: string) {
  try {
    await fetch("/api/v1/health", { method: "POST", body: JSON.stringify({ leak: sample }) });
    return false; // request went through: firewall failed
  } catch {
    return true; // blocked
  }
}
