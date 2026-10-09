import { describe, expect, it } from "vitest";
import { deriveKey, newSalt, open, seal } from "@/lib/vault";

describe("vault (AES-GCM + PBKDF2)", () => {
  it("round-trips data with the right passphrase", async () => {
    const salt = newSalt();
    const key = await deriveKey("correct horse", salt);
    const blob = await seal('{"chats":["hello"]}', key, salt);
    const { plaintext } = await open(blob, "correct horse");
    expect(plaintext).toBe('{"chats":["hello"]}');
  });
  it("never stores the plaintext", async () => {
    const salt = newSalt();
    const blob = await seal("super secret message", await deriveKey("pw", salt), salt);
    expect(JSON.stringify(blob)).not.toContain("secret");
  });
  it("rejects a wrong passphrase", async () => {
    const salt = newSalt();
    const blob = await seal("data", await deriveKey("right", salt), salt);
    await expect(open(blob, "wrong")).rejects.toThrow();
  });
  it("detects tampering", async () => {
    const salt = newSalt();
    const blob = await seal("data", await deriveKey("pw", salt), salt);
    const bytes = Uint8Array.from(atob(blob.data), (c) => c.charCodeAt(0));
    bytes[0] ^= 1;
    await expect(open({ ...blob, data: btoa(String.fromCharCode(...bytes)) }, "pw")).rejects.toThrow();
  });
  it("uses a fresh IV for every write", async () => {
    const salt = newSalt();
    const key = await deriveKey("pw", salt);
    const [a, b] = await Promise.all([seal("same", key, salt), seal("same", key, salt)]);
    expect(a.iv).not.toBe(b.iv);
    expect(a.data).not.toBe(b.data);
  });
});
