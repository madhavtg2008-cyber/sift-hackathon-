import { describe, expect, it } from "vitest";
import { strToU8, zipSync } from "fflate";
import { chatFromBytes } from "@/lib/share";

describe("chatFromBytes", () => {
  it("reads plain text exports", () => {
    expect(chatFromBytes(strToU8("A: hi"), "chat.txt")).toEqual({ name: "chat.txt", text: "A: hi" });
  });
  it("extracts the chat from a WhatsApp .zip export", () => {
    const zip = zipSync({ "WhatsApp Chat with Team.txt": strToU8("12/10/24, 9:41 pm - A: hi"), "IMG-001.jpg": new Uint8Array([1, 2, 3]) });
    const r = chatFromBytes(zip, "WhatsApp Chat with Team.zip");
    expect(r.name).toBe("WhatsApp Chat with Team.txt");
    expect(r.text).toContain("A: hi");
  });
  it("uses the zip name for iPhone exports (_chat.txt)", () => {
    const r = chatFromBytes(zipSync({ "_chat.txt": strToU8("[12/10/24, 9:41:22 PM] A: hi") }), "WhatsApp Chat - Family.zip");
    expect(r.name).toBe("WhatsApp Chat - Family");
  });
  it("explains when a zip has no chat file", () => {
    expect(() => chatFromBytes(zipSync({ "photo.jpg": new Uint8Array([1]) }), "x.zip")).toThrow(/chat .txt/);
  });
});
