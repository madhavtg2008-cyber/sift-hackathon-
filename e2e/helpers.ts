import { expect, type Page } from "@playwright/test";
import path from "node:path";

export const FIXTURE = path.join(__dirname, "fixtures", "whatsapp-export.txt");

/** Fresh browser profile → sign in → import the fixture export. */
export async function signInAndImport(page: Page, name = "Madhav") {
  await page.goto("/");
  await page.getByLabel("Your name, as it appears in chats").fill(name);
  await page.getByRole("button", { name: /Sign in/ }).click();
  await page.getByRole("button", { name: "+ Add your first chat" }).first().click();
  await page.locator('input[type="file"]').setInputFiles(FIXTURE);
  await expect(page.getByText(/Detected WhatsApp export · 5 messages/)).toBeVisible();
  await page.getByRole("button", { name: "Analyze on device" }).click();
}
