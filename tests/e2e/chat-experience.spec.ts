import { expect, test, type Page } from "@playwright/test";
import { z } from "zod";
import { demoPrompts } from "../../evals/demo/prompts";
import { conversationDetailSchema } from "../../src/modules/conversations/view-schema";

test.use({ screenshot: "off" });

async function signIn(page: Page) {
  const env = z.object({ DEMO_EMAIL: z.string(), DEMO_PASSWORD: z.string() }).parse(process.env);
  await page.goto("/login");
  await page.getByLabel("Email", { exact: true }).fill(env.DEMO_EMAIL);
  await page.getByLabel("Password", { exact: true }).fill(env.DEMO_PASSWORD);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page.getByRole("heading", { name: "What are you working on?", exact: true })).toBeVisible({ timeout: 15000 });
  await expect(page).toHaveURL(/\/workspace\/chat$/);
  const workspace = await page.request.get("/api/workspace");
  expect(workspace.status()).toBe(200);
  expect(workspace.headers()["cache-control"]).toContain("no-store");
}

async function sendWithEnter(page: Page, label: string, message: string) {
  const turn = page.waitForResponse((response) => response.request().method() === "POST" && response.url().endsWith("/turns"));
  const analysis = page.waitForResponse((response) => response.request().method() === "POST" && response.url().endsWith("/analyses"));
  await page.getByLabel(label, { exact: true }).fill(message);
  await page.getByLabel(label, { exact: true }).press("Enter");
  expect((await turn).status()).toBe(200);
  expect((await analysis).status()).toBe(503);
  await expect(page.getByRole("button", { name: "Send question", exact: true })).toBeEnabled();
}

test("Composer handles text-only questions, Enter, newline and IME", async ({ page }) => {
  await signIn(page);
  const question = page.getByLabel("What do you want to achieve?", { exact: true });
  await question.fill(`Synthetic Eve keyboard proof ${Date.now()}`);
  let turnPosts = 0;
  page.on("request", (request) => { if (request.method() === "POST" && request.url().endsWith("/turns")) turnPosts++; });
  await question.focus();
  await question.dispatchEvent("keydown", { key: "Enter", code: "Enter", isComposing: true, keyCode: 229 });
  await expect(question).toBeFocused();
  expect(turnPosts).toBe(0);
  await question.press("Shift+Enter");
  await question.press("End");
  await question.press("A");
  await expect(question).toHaveValue(/\nA$/);
  const message = await question.inputValue();
  await sendWithEnter(page, "What do you want to achieve?", message);
  await expect(page).toHaveURL(/\/workspace\/chat\/[0-9a-f-]+$/);
  await expect(page.getByRole("region", { name: "Turn 1", exact: true })).toContainText(message);
  expect(turnPosts).toBe(1);
  const id = new URL(page.url()).pathname.split("/").pop();
  const detail = conversationDetailSchema.parse(await (await page.request.get(`/api/conversations/${id}`)).json());
  expect(detail.turns).toHaveLength(1);
  expect(detail.turns[0]?.message).toBe(message.trim());
  expect(detail.turns[0]?.request).toEqual({ version: 2, message, history: [] });
  expect(detail.turns[0]?.runs).toHaveLength(0);
  await test.info().attach("saved-conversation", { body: JSON.stringify({ id, turnCount: detail.turns.length }), contentType: "application/json" });
  await page.screenshot({ path: "test-results/eve-composer.png", fullPage: true });
});

test("long conversations scroll independently, jump to latest and retain mobile intake", async ({ page }) => {
  test.setTimeout(90000);
  await signIn(page);
  await page.getByLabel("What do you want to achieve?", { exact: true }).fill(`Synthetic Eve scrolling proof ${Date.now()}`);
  const title = await page.getByLabel("What do you want to achieve?", { exact: true }).inputValue();
  await sendWithEnter(page, "What do you want to achieve?", title);
  for (let position = 2; position <= 8; position++) {
    const message = `Synthetic follow-up ${position}\nOwner\nScope\nRollout\nMonitoring\nRollback\nReview\nNext step`;
    await sendWithEnter(page, "Follow-up question", message);
    await expect(page.getByRole("region", { name: `Turn ${position}`, exact: true })).toBeVisible();
  }
  const transcript = page.getByRole("log", { name: "Conversation messages", exact: true });
  await expect(transcript).toBeVisible();
  await transcript.hover();
  await page.mouse.wheel(0, -10000);
  const latest = page.getByRole("button", { name: "Scroll to latest message", exact: true });
  await expect(latest).toBeVisible();
  await expect(page.getByRole("region", { name: "Turn 1", exact: true })).toBeInViewport();
  await page.screenshot({ path: "test-results/eve-chat-reading-history.png", fullPage: true });
  await latest.click();
  await expect(page.getByRole("region", { name: "Turn 8", exact: true })).toBeInViewport();
  await expect(latest).toHaveAttribute("data-active", "false");
  const id = new URL(page.url()).pathname.split("/").pop();
  const detail = conversationDetailSchema.parse(await (await page.request.get(`/api/conversations/${id}`)).json());
  expect(detail.turns).toHaveLength(8);
  const finalRequest = detail.turns[7]?.request;
  expect(finalRequest?.version).toBe(2);
  if (finalRequest?.version === 2) expect(finalRequest.history).toHaveLength(7);
  await page.reload();
  await expect(page.getByRole("region", { name: "Turn 8", exact: true })).toBeInViewport();
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByLabel("Follow-up question", { exact: true })).toBeInViewport();
  await page.screenshot({ path: "test-results/eve-chat-mobile.png", fullPage: true });
  await expect(page.getByRole("button", { name: "Send question", exact: true })).toBeInViewport();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: "test-results/eve-chat-mobile-details.png", fullPage: true });
  await test.info().attach("saved-conversation", { body: JSON.stringify({ id, turnCount: detail.turns.length }), contentType: "application/json" });
  await test.info().attach("mobile-chat-aria", { body: await page.locator("body").ariaSnapshot(), contentType: "text/plain" });
});

test("suggested prompt fills the composer", async ({ page }) => {
  const first = z.object({ label: z.string(), message: z.string() }).parse(demoPrompts[0]);
  await signIn(page);
  await page.getByRole("button", { name: first.label, exact: true }).click();
  await expect(page.getByLabel("What do you want to achieve?", { exact: true })).toHaveValue(first.message);
  await expect(page).toHaveURL(/\/workspace\/chat$/);
});
