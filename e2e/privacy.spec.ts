import { expect, test } from "@playwright/test";
import { signInAndImport } from "./helpers";

test("the privacy firewall blocks a leak attempt", async ({ page }) => {
  const leaked: string[] = [];
  page.on("request", (r) => {
    if (r.postData()?.includes("deploy the site")) leaked.push(r.url());
  });
  await signInAndImport(page);
  await page.getByRole("button", { name: /On-device/ }).click();
  await page.getByRole("button", { name: "Run leak test" }).click();
  await expect(page.getByText("Blocked — nothing left your device")).toBeVisible();
  expect(leaked).toEqual([]); // nothing containing chat text reached the network
});

test("encrypted storage: no plaintext at rest, wrong passphrase rejected, unlock works", async ({ page }) => {
  await signInAndImport(page);
  await page.getByRole("button", { name: /On-device/ }).click();
  await page.getByPlaceholder("New passphrase (8+ characters)").fill("correct-horse-42");
  await page.getByPlaceholder("Repeat passphrase").fill("correct-horse-42");
  await page.getByRole("button", { name: "Encrypt", exact: true }).click();
  await expect(page.getByText("🔒 Encrypted")).toBeVisible();

  const stored = await page.evaluate(() => JSON.stringify(localStorage));
  expect(stored).not.toContain("deploy the site");
  expect(stored).toContain("sift:vault");

  await page.getByRole("button", { name: "Lock now" }).click();
  await page.reload();
  await expect(page.getByText(/Your chats are/)).toBeVisible();
  await page.getByLabel("Passphrase").fill("wrong-pass-00");
  await page.getByRole("button", { name: "Unlock" }).click();
  await expect(page.getByRole("alert").filter({ hasText: "didn't work" })).toBeVisible();
  await page.getByLabel("Passphrase").fill("correct-horse-42");
  await page.getByRole("button", { name: "Unlock" }).click();
  await expect(page.getByRole("button", { name: /Open whatsapp-export/ }).first()).toBeVisible();
});

test("security headers are served", async ({ request }) => {
  const res = await request.get("/");
  const h = res.headers();
  expect(h["content-security-policy"]).toMatch(/script-src 'self' 'nonce-[^']+' 'strict-dynamic'/);
  expect(h["content-security-policy"]).toContain("connect-src 'self'");
  expect(h["strict-transport-security"]).toContain("max-age=63072000");
  expect(h["x-frame-options"]).toBe("DENY");
  expect(h["x-powered-by"]).toBeUndefined();
});

test("each page load gets a fresh CSP nonce", async ({ request }) => {
  const nonce = async () => (await request.get("/")).headers()["content-security-policy"].match(/nonce-([^']+)/)![1];
  expect(await nonce()).not.toBe(await nonce());
});
