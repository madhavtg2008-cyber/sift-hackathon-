import { expect, test } from "@playwright/test";
import { signInAndImport } from "./helpers";

test("phones get the bottom tab bar and the drawer", async ({ page }) => {
  await signInAndImport(page);
  await page.getByRole("button", { name: "Back" }).click();
  const tabs = page.getByRole("navigation", { name: "Main" });
  await expect(tabs).toBeVisible();
  await tabs.getByRole("button", { name: /Chats/ }).click();
  await expect(page.getByRole("button", { name: /Open whatsapp-export/ }).last()).toBeVisible();
});
