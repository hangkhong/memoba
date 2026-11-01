import { expect, test, type Page } from "@playwright/test";
import { z } from "zod";
const credentials = z.object({ DEMO_EMAIL: z.email(), DEMO_PASSWORD: z.string().min(12) });

async function signIn(page: Page) {
  const env = credentials.parse(process.env);
  await page.goto("/login");
  await page.getByLabel("Email", { exact: true }).fill(env.DEMO_EMAIL);
  await page.getByLabel("Password", { exact: true }).fill(env.DEMO_PASSWORD);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL(/\/workspace/, { timeout: 15000 });
}

test("a visitor reads the docs without signing in, from the landing header", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  await page.getByRole("banner").getByRole("link", { name: "Docs", exact: true }).click();
  await expect(page).toHaveURL(/\/docs\/why-teams-start-from-scratch$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Why teams start from scratch");
  const contents = page.getByRole("navigation", { name: "Docs contents" });
  await expect(contents.getByRole("link", { name: "Why teams start from scratch" })).toHaveAttribute("aria-current", "page");
  await expect(contents.getByRole("link", { name: "How knowledge gets in" })).not.toHaveAttribute("aria-current", "page");
});

test("a link between two pages opens the in-app page and scrolls to its anchor", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/docs/what-memoba-leaves-out");
  const link = page.getByRole("link", { name: "Import", exact: true });
  await expect(link).not.toHaveAttribute("target", "_blank");
  await link.click();
  await expect(page).toHaveURL(/\/docs\/how-knowledge-gets-in#import-drafts-it-never-saves$/);
  await expect(page.getByRole("heading", { level: 2, name: "Import drafts, it never saves" })).toBeInViewport();
  await expect(page.getByRole("navigation", { name: "Docs contents" }).getByRole("link", { name: "How knowledge gets in" })).toHaveAttribute("aria-current", "page");
});

test("a link to a reference page opens GitHub, and next and previous follow the reading order", async ({ page }) => {
  await page.goto("/docs/what-memoba-leaves-out");
  await expect(page.getByRole("link", { name: "evaluation record" }).first()).toHaveAttribute("href", /^https:\/\/github\.com\/hangkhong\/memoba\/blob\/main\/docs\/reference\/evaluation\.md/);
  await page.getByRole("navigation", { name: "Previous and next page" }).getByRole("link", { name: /Why search alone is not enough/ }).click();
  await expect(page).toHaveURL(/\/docs\/why-search-alone-is-not-enough$/);
  await page.getByRole("navigation", { name: "Previous and next page" }).getByRole("link", { name: /What Memoba leaves out/ }).click();
  await expect(page).toHaveURL(/\/docs\/what-memoba-leaves-out$/);
});

test("an unknown docs page is not found", async ({ page }) => {
  expect((await page.goto("/docs/nope"))?.status()).toBe(404);
});

test("a member opens Docs from the sidebar and stays inside the workspace", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await signIn(page);
  await page.getByRole("link", { name: "Docs", exact: true }).click();
  await expect(page).toHaveURL(/\/workspace\/docs\/why-teams-start-from-scratch$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Why teams start from scratch");
  await expect(page.getByRole("link", { name: "Docs", exact: true })).toHaveAttribute("data-active");
  await expect(page.getByRole("link", { name: "New chat" })).toBeVisible();
  await page.getByRole("navigation", { name: "Previous and next page" }).getByRole("link", { name: /What Memoba believes/ }).click();
  await expect(page).toHaveURL(/\/workspace\/docs\/what-memoba-believes$/);
});

test("on a phone the contents sit behind a disclosure and the page does not scroll sideways", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/docs/how-the-agent-answers");
  await expect(page.getByRole("navigation", { name: "Docs contents" })).toBeHidden();
  await page.getByText("Contents", { exact: true }).click();
  await page.getByRole("navigation", { name: "Docs contents" }).getByRole("link", { name: "How knowledge gets in" }).click();
  await expect(page).toHaveURL(/\/docs\/how-knowledge-gets-in$/);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});

test("on a phone a member opens Docs from the sidebar drawer", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await signIn(page);
  await page.getByRole("button", { name: "Toggle Sidebar" }).first().click();
  await page.getByRole("link", { name: "Docs", exact: true }).click();
  await expect(page).toHaveURL(/\/workspace\/docs\/why-teams-start-from-scratch$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Why teams start from scratch");
});
