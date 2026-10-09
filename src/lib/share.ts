/**
 * Reads chat files on the device: plain .txt / .json, or the .zip that newer WhatsApp
 * versions produce on "Export chat". Also picks up files handed over by the service
 * worker's share target. Nothing here touches the network.
 */
import { unzipSync, strFromU8 } from "fflate";

export interface LoadedChat {
  name: string;
  text: string;
}

const isZip = (bytes: Uint8Array) => bytes[0] === 0x50 && bytes[1] === 0x4b; // "PK"

export function chatFromBytes(bytes: Uint8Array, fileName: string): LoadedChat {
  if (!isZip(bytes)) return { name: fileName, text: strFromU8(bytes) };
  const files = unzipSync(bytes, { filter: (f) => /\.(txt|json)$/i.test(f.name) && !f.name.startsWith("__MACOSX") });
  const entry = Object.entries(files).sort((a, b) => b[1].length - a[1].length)[0];
  if (!entry) throw new Error("This zip doesn't contain a chat .txt file.");
  // Android zips hold "WhatsApp Chat with X.txt"; iPhone zips hold "_chat.txt", so use the zip's name.
  const inner = entry[0].split("/").pop() ?? "";
  const name = /^_chat\.txt$/i.test(inner) ? fileName.replace(/\.zip$/i, "") : inner;
  return { name, text: strFromU8(entry[1]) };
}

export async function chatFromFile(file: File): Promise<LoadedChat> {
  return chatFromBytes(new Uint8Array(await file.arrayBuffer()), file.name);
}

/** Collects a chat shared to Sift (see public/sw.js) and removes it from the share cache. */
export async function takeSharedChat(): Promise<LoadedChat | null> {
  if (typeof caches === "undefined") return null;
  const cache = await caches.open("sift-share");
  const res = await cache.match("/shared-chat");
  if (!res) return null;
  await cache.delete("/shared-chat");
  const name = decodeURIComponent(res.headers.get("x-file-name") ?? "Shared chat");
  return chatFromBytes(new Uint8Array(await res.arrayBuffer()), name);
}
