import { expect, test } from "@playwright/test";
import { z } from "zod";
import { steps } from "../../src/components/landing/engine-timeline";
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

test("the engine plays five steps, pauses, and steps, and the caption follows", async ({ page }) => {
  await page.goto("/");
  const engine = page.locator("#engine");
  await engine.scrollIntoViewIfNeeded();
  const picture = engine.getByRole("img", { name: /^Diagram in five steps/ });
  await expect(picture).toBeVisible();
  await expect.poll(() => picture.evaluate((canvas: HTMLCanvasElement) => canvas.getContext("2d")?.getImageData(5, 5, 1, 1).data[3] ?? 0)).toBe(255);
  for (const step of steps) {
    await page.getByRole("button", { name: `Step ${step.id}: ${step.title}` }).click();
    await expect(engine).toHaveAttribute("data-step", String(step.id));
    await expect(engine.locator(".stepcap")).toHaveText(step.caption);
  }
  await page.getByRole("button", { name: "Step 1: A chatbot" }).click();
  await page.getByRole("button", { name: "Next step" }).click();
  await expect(engine).toHaveAttribute("data-step", "2");
  await page.getByRole("button", { name: "Previous step" }).click();
  await expect(engine).toHaveAttribute("data-step", "1");
  await page.getByRole("button", { name: "Play" }).click();
  await page.getByRole("button", { name: "Pause" }).click();
  await expect(page.getByRole("button", { name: "Play" })).toBeVisible();
});

test("the engine starts on its own when first seen and moves on to the next step", async ({ page }) => {
  await page.goto("/");
  const engine = page.locator("#engine");
  await engine.scrollIntoViewIfNeeded();
  await expect(engine).toHaveAttribute("data-step", "1");
  await expect(engine).toHaveAttribute("data-step", "2", { timeout: 10000 });
});

test("with reduced motion the engine shows the full picture and the five steps as a list", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  const engine = page.locator("#engine");
  await expect(engine).toHaveAttribute("data-step", "5");
  await expect(engine.getByRole("img", { name: /^Diagram in five steps/ })).toBeVisible();
  await expect(engine.getByRole("button", { name: "Next step" })).toBeHidden();
  await expect(engine.locator(".all li")).toHaveCount(5);
  await expect(engine.locator(".all li").first()).toBeVisible();
});

test("without JavaScript the engine still shows its picture and the five steps as a list", async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto("/");
  const engine = page.locator("#engine");
  await engine.scrollIntoViewIfNeeded();
  await expect(engine.locator(".all li")).toHaveCount(5);
  await expect(engine.locator(".all li").first()).toBeVisible();
  await expect(engine.getByRole("button", { name: "Next step" })).toBeHidden();
  await expect.poll(() => engine.locator("img.rest").evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0)).toBe(true);
  await context.close();
});

test("on a phone the engine fits the screen and steps with the sticky bar", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  const engine = page.locator("#engine");
  await engine.scrollIntoViewIfNeeded();
  await expect(engine.getByRole("img", { name: /^Diagram in five steps/ })).toBeVisible();
  await page.getByRole("button", { name: "Next step" }).click();
  await expect(engine).toHaveAttribute("data-step", "2");
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(390);
});

test("the section tags use reader-facing names", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator(".tag").allTextContents()).resolves.toEqual([
    "01 / 07Overview", "02 / 07The problem", "03 / 07Two memories", "04 / 07How it answers", "05 / 07Workspace", "06 / 07What it won't say", "07 / 07Try it",
  ]);
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
