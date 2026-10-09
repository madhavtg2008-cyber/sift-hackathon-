import { expect, test } from "@playwright/test";
import { signInAndImport } from "./helpers";

test("imports a WhatsApp export and surfaces what needs you", async ({ page }) => {
  await signInAndImport(page);
  // Chat view: the direct mention is flagged as a task with a deadline
  await expect(page.getByRole("heading", { name: "whatsapp-export" })).toBeVisible();
  await page
    .getByRole("button", { name: /Catch me up/ })
    .first()
    .click();
  await expect(page.getByText(/thing[s]? need you/)).toBeVisible();
  const card = page.locator("article", { hasText: "@Madhav can you deploy the site by 11:59 pm today?" });
  await expect(card).toBeVisible();
  await expect(card.getByText("Critical")).toBeVisible();
  // Decisions are collected
  await expect(page.getByText("we decided to go with the green theme, final hai").first()).toBeVisible();
});

test("marking done can be undone", async ({ page }) => {
  await signInAndImport(page);
  await page
    .getByRole("button", { name: /Catch me up/ })
    .first()
    .click();
  await page.getByRole("button", { name: "Mark as done" }).first().click();
  await expect(page.getByRole("status").filter({ hasText: "Marked done" })).toBeVisible();
  await page.getByRole("button", { name: "Undo" }).click();
  await expect(page.getByRole("button", { name: "Mark as not done" })).toHaveCount(0);
});

test("logging a reply marks the question answered", async ({ page }) => {
  await signInAndImport(page);
  await page.getByPlaceholder(/Note what you replied/).fill("Done, deploying now");
  await page.getByPlaceholder(/Note what you replied/).press("Enter");
  await page
    .getByRole("button", { name: /Catch me up/ })
    .first()
    .click();
  await expect(page.getByRole("button", { name: /Need your reply/ })).toContainText("0");
});

test("data survives a reload and search finds messages", async ({ page }) => {
  await signInAndImport(page);
  await page.reload();
  await page.keyboard.press("/");
  await page.keyboard.type("green theme");
  await expect(page.getByText(/1 result for/)).toBeVisible();
});

test("upcoming deadlines can be exported to a calendar file", async ({ page }) => {
  await signInAndImport(page);
  await page
    .getByRole("button", { name: /Catch me up/ })
    .first()
    .click();
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "+ Add to calendar" }).click();
  const file = await download;
  expect(file.suggestedFilename()).toBe("sift-deadlines.ics");
  const text = await (await file.createReadStream()).toArray().then((c) => Buffer.concat(c).toString());
  expect(text).toContain("BEGIN:VEVENT");
});
