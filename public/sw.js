/*
 * Sift service worker.
 * Its only job is the "Share to Sift" target: when you share a WhatsApp export to Sift,
 * the file is caught HERE, inside your browser, and handed to the page. The POST never
 * reaches the network or the server.
 */
const SHARE_CACHE = "sift-share";

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (event.request.method !== "POST" || url.pathname !== "/share-target") return;
  event.respondWith(
    (async () => {
      const form = await event.request.formData();
      const file = form.get("chat");
      const text = form.get("text");
      const cache = await caches.open(SHARE_CACHE);
      if (file && typeof file !== "string") {
        await cache.put("/shared-chat", new Response(file, { headers: { "x-file-name": encodeURIComponent(file.name || "Shared chat") } }));
      } else if (typeof text === "string" && text.trim()) {
        await cache.put(
          "/shared-chat",
          new Response(text, { headers: { "x-file-name": encodeURIComponent(form.get("title") || "Shared chat") } }),
        );
      }
      return Response.redirect("/?share=1", 303);
    })(),
  );
});
