import { expect, test, type Page } from "@playwright/test";
import { z } from "zod";
const credentials = z.object({ DEMO_EMAIL: z.email(), DEMO_PASSWORD: z.string().min(12) });

test("anonymous visitors to the dashboard go to sign-in", async ({ page }) => {
  await page.goto("/workspace/dashboard");
  await expect(page).toHaveURL(/\/login$/);
});

async function openDashboard(page: Page) {
  const env = credentials.parse(process.env);
  await page.goto("/login");
  await page.getByLabel("Email", { exact: true }).fill(env.DEMO_EMAIL);
  await page.getByLabel("Password", { exact: true }).fill(env.DEMO_PASSWORD);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL(/\/workspace/, { timeout: 15000 });

  await page.getByRole("link", { name: "Dashboard", exact: true }).click();
  await expect(page).toHaveURL(/\/workspace\/dashboard$/);
  await expect(page.getByRole("heading", { name: "Needs attention" })).toBeVisible();
}

test("a member opens the dashboard from the sidebar, sees it is sample data, and records a missing case", async ({ page }) => {
  await openDashboard(page);
  await expect(page.getByText("Sample data", { exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { level: 1 })).toContainText("of answers cite evidence");

  await page.getByRole("link", { name: "Record case" }).first().click();
  await expect(page).toHaveURL(/\/workspace\/knowledge\?record=1$/);
  await expect(page.getByRole("dialog", { name: "Record a case" })).toBeVisible();
});

test("a document row opens its seeded document", async ({ page }) => {
  await openDashboard(page);
  const link = page.getByRole("link", { name: "Open document" }).first();
  test.skip(await link.count() === 0, "needs the demo documents (npm run db:seed -- --demo)");
  await link.click();
  await expect(page).toHaveURL(/\/workspace\/knowledge\/documents\/[0-9a-f-]{36}$/);
});
