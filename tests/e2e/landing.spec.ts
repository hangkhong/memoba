import { expect, test } from "@playwright/test";
import { z } from "zod";
const credentials = z.object({ DEMO_EMAIL: z.email(), DEMO_PASSWORD: z.string().min(12) });

test("an anonymous visitor sees the landing page, and its header button follows the scroll to sign-in", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Your team already solved this. Nobody remembers where.");
  await expect(page.getByText("Northwind Ledger, a fictional invoicing company")).toBeVisible();

  const button = page.getByRole("banner").getByRole("link", { name: "Open the demo" });
  await expect(button).toBeVisible();
  await page.locator("footer.end").scrollIntoViewIfNeeded();
  await expect(button).toBeInViewport();
  await button.click();
  await expect(page).toHaveURL(/\/login$/);
});

test("the header button stays visible on a phone", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  const button = page.getByRole("banner").getByRole("link", { name: "Open the demo" });
  await expect(button).toBeInViewport();
  await page.locator("#honest").scrollIntoViewIfNeeded();
  await expect(button).toBeInViewport();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(390);
});

test("the engine plays one chosen outcome, pauses, and steps", async ({ page }) => {
  await page.goto("/");
  const engine = page.locator("#engine");
  await page.getByRole("button", { name: "Could not search" }).click();
  await expect(engine).toHaveAttribute("data-run", "failed");
  await page.getByRole("button", { name: "Pause" }).click();
  await page.getByRole("button", { name: "Next step" }).click();
  await expect(engine).toHaveAttribute("data-step", "1");
  await page.getByRole("button", { name: "Previous step" }).click();
  await expect(engine).toHaveAttribute("data-step", "0");
});

test("a signed-in user visiting the landing page lands in chat", async ({ page }) => {
  const env = credentials.parse(process.env);
  await page.goto("/login");
  await page.getByLabel("Email", { exact: true }).fill(env.DEMO_EMAIL);
  await page.getByLabel("Password", { exact: true }).fill(env.DEMO_PASSWORD);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL(/\/workspace/, { timeout: 15000 });
  await page.goto("/");
  await expect(page).toHaveURL(/\/workspace\/chat$/);
});
