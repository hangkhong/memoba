import { expect, test } from "@playwright/test";
import { z } from "zod";
const credentials = z.object({ DEMO_EMAIL: z.email(), DEMO_PASSWORD: z.string().min(12) });

test("anonymous visitors to the dashboard go to sign-in", async ({ page }) => {
  await page.goto("/workspace/dashboard");
  await expect(page).toHaveURL(/\/login$/);
});

test("a member opens the dashboard from the sidebar, sees it is sample data, and follows queue actions", async ({ page }) => {
  const env = credentials.parse(process.env);
  await page.goto("/login");
  await page.getByLabel("Email", { exact: true }).fill(env.DEMO_EMAIL);
  await page.getByLabel("Password", { exact: true }).fill(env.DEMO_PASSWORD);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL(/\/workspace/, { timeout: 15000 });

  await page.getByRole("link", { name: "Dashboard", exact: true }).click();
  await expect(page).toHaveURL(/\/workspace\/dashboard$/);
  await expect(page.getByText("Sample data", { exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { level: 1 })).toContainText("of answers cite evidence");
  await expect(page.getByRole("heading", { name: "Needs attention" })).toBeVisible();

  // A document row resolves to the seeded document and opens it.
  await page.getByRole("link", { name: "Open document" }).first().click();
  await expect(page).toHaveURL(/\/workspace\/knowledge\/documents\/[0-9a-f-]{36}$/);

  // A gap row opens the record dialog on the Knowledge Hub.
  await page.goBack();
  await page.getByRole("link", { name: "Record case" }).first().click();
  await expect(page).toHaveURL(/\/workspace\/knowledge\?record=1$/);
  await expect(page.getByRole("dialog", { name: "Record a case" })).toBeVisible();
});
