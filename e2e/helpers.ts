import { expect, type Page } from "@playwright/test";

/**
 * A small WhatsApp-format export dated today (early morning), so "by 5pm today"
 * is always an upcoming deadline whenever the suite runs.
 */
export function todaysExport() {
  const d = new Date();
  const date = `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getFullYear()).slice(2)}`;
  return [
    `${date}, 12:01 am - Arjun: Morning everyone`,
    `${date}, 12:02 am - Arjun: @Madhav can you deploy the site by 11:59 pm today?`,
    `${date}, 12:05 am - Priya: we decided to go with the green theme, final hai`,
    `${date}, 12:06 am - Kabir: lol`,
    `${date}, 12:07 am - Priya: URGENT: submit the form before EOD!!`,
  ].join("\n");
}

/** Fresh browser profile → sign in → import the export. */
export async function signInAndImport(page: Page, name = "Madhav") {
  await page.goto("/");
  await page.getByLabel("Your name, as it appears in chats").fill(name);
  await page.getByRole("button", { name: /Sign in/ }).click();
  await page.getByRole("button", { name: "+ Add your first chat" }).first().click();
  await page
    .locator('input[type="file"]')
    .setInputFiles({ name: "whatsapp-export.txt", mimeType: "text/plain", buffer: Buffer.from(todaysExport()) });
  await expect(page.getByText(/Detected WhatsApp export · 5 messages/)).toBeVisible();
  await page.getByRole("button", { name: "Analyze on device" }).click();
}
