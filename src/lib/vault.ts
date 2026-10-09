/**
 * Optional at-rest encryption for everything Sift stores in the browser.
 * AES-GCM 256 with a key derived from the user's passphrase (PBKDF2-SHA256, 310k iterations).
 * The key is non-extractable and lives only in memory; the passphrase is never stored.
 */

export interface VaultBlob {
  v: 1;
  salt: string; // base64
  iv: string; // base64
  data: string; // base64 ciphertext (includes GCM auth tag)
}

const ITERATIONS = 310_000;
const enc = new TextEncoder();
const dec = new TextDecoder();

const b64 = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes));
function unb64(s: string) {
  const bin = atob(s);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}
/** btoa can't take huge argument lists, so encode large buffers in chunks. */
function b64Large(bytes: Uint8Array) {
  let s = "";
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(s);
}

export async function deriveKey(passphrase: string, salt: Uint8Array): Promise<CryptoKey> {
  const base = await crypto.subtle.importKey("raw", enc.encode(passphrase), "PBKDF2", false, ["deriveKey"]);
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt: salt as BufferSource, iterations: ITERATIONS, hash: "SHA-256" },
    base,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

export function newSalt() {
  return crypto.getRandomValues(new Uint8Array(16));
}

export async function seal(plaintext: string, key: CryptoKey, salt: Uint8Array): Promise<VaultBlob> {
  const iv = crypto.getRandomValues(new Uint8Array(12)); // fresh IV for every write
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, enc.encode(plaintext)));
  return { v: 1, salt: b64(salt), iv: b64(iv), data: b64Large(ct) };
}

/** Throws if the passphrase is wrong or the data was tampered with (GCM authentication). */
export async function open(blob: VaultBlob, passphrase: string): Promise<{ plaintext: string; key: CryptoKey; salt: Uint8Array }> {
  const salt = unb64(blob.salt);
  const key = await deriveKey(passphrase, salt);
  const pt = await crypto.subtle.decrypt({ name: "AES-GCM", iv: unb64(blob.iv) as BufferSource }, key, unb64(blob.data) as BufferSource);
  return { plaintext: dec.decode(pt), key, salt };
}
