import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { signInAndImport } from "./helpers";

// Scan the settled UI: cards fade in, and a half-faded element would be measured at partial contrast.
test.use({ reducedMotion: "reduce" });

const report = (r: Awaited<ReturnType<typeof scan>>) =>
  r.violations.map(
    (v) =>
      `${v.id} (${v.impact}): ${v.nodes
        .slice(0, 3)
        .map((n) => n.target.join(" "))
        .join(" | ")}`,
  );

const scan = (page: import("@playwright/test").Page) =>
  new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();

test("sign-in screen has no WCAG A/AA violations", async ({ page }) => {
  await page.goto("/");
  const { violations } = await scan(page);
  expect(report({ violations } as never)).toEqual([]);
});

test("dashboard and chat view have no WCAG A/AA violations", async ({ page }) => {
  await signInAndImport(page);
  expect(report(await scan(page))).toEqual([]);
  await page
    .getByRole("button", { name: /Catch me up/ })
    .first()
    .click();
  expect(report(await scan(page))).toEqual([]);
});
