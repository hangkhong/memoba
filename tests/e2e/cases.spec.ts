import { expect, test } from "@playwright/test";
import { z } from "zod";
test.use({ screenshot: "off" });

test("@live save and index a real case, then preserve it as a revision", async ({ page }) => {
  const env = z.object({ DEMO_EMAIL: z.string(), DEMO_PASSWORD: z.string() }).parse(process.env);
  await page.goto("/login");
  await page.getByLabel("Email", { exact: true }).fill(env.DEMO_EMAIL);
  await page.getByLabel("Password", { exact: true }).fill(env.DEMO_PASSWORD);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  try { await page.waitForURL(/\/workspace/, { timeout: 15000 }); }
  catch { if (page.url().includes("/login")) { await page.getByLabel("Password", { exact: true }).fill(""); await page.getByLabel("Email", { exact: true }).fill(""); } throw new Error("Sign-in did not complete."); }
  await page.goto("/workspace/knowledge/new");
  await page.getByLabel("Title", { exact: true }).fill(`Controlled release ${Date.now()}`);
  for (const label of ["Problem / objective", "Context", "Constraints", "Approach and reasoning", "Observed outcome", "Lessons and applicability", "Deliverable", "Change scope", "Deployment conditions"]) await page.getByLabel(label, { exact: true }).fill(`Synthetic demo: ${label}. Use a controlled canary rollout and keep rollback ready.`);
  await page.getByRole("button", { name: "Save case", exact: true }).click();
  await expect(page).toHaveURL(/\/workspace\/knowledge\/[0-9a-f-]+$/, { timeout: 90000 });
  await expect(page.getByText("Saved · Available to ask", { exact: true })).toBeVisible();
  await page.screenshot({ path: "test-results/case-ready.png", fullPage: true });
  const id = new URL(page.url()).pathname.split("/").pop();
  const detail = await page.request.get(`/api/cases/${id}`);
  expect(detail.status()).toBe(200);
  const saved = z.object({ published_revision_id: z.uuid(), revisions: z.array(z.object({ id: z.uuid(), index_state: z.literal("ready") })) }).parse(await detail.json());
  expect(saved.published_revision_id).toBe(saved.revisions[0]?.id);
});


test("minimal case stays saved when indexing is unavailable", async ({ page }) => {
  const env = z.object({ DEMO_EMAIL: z.string(), DEMO_PASSWORD: z.string() }).parse(process.env);
  expect((await page.request.post("/api/auth/login", { headers: { origin: "http://localhost:3100" }, data: { email: env.DEMO_EMAIL, password: env.DEMO_PASSWORD } })).status()).toBe(200);
  await page.goto("/workspace/knowledge/new");
  await page.getByLabel("Title", { exact: true }).fill(`Minimal case ${Date.now()}`);
  await page.getByLabel("Problem / objective", { exact: true }).fill("Release risk");
  await page.getByLabel("Context", { exact: true }).fill("Small team");
  await page.getByLabel("Approach and reasoning", { exact: true }).fill("Canary rollout");
  await page.getByRole("button", { name: "Save case", exact: true }).click();
  await expect(page).toHaveURL(/\/workspace\/knowledge\/[0-9a-f-]+$/);
  await expect(page.getByText("Saved · Preparation failed", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Retry indexing", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("indexing did not complete");
  await page.getByRole("button", { name: "Archive case", exact: true }).click();
  await expect(page.getByText(/Saved · Archived/)).toBeVisible();
});

test("CS template validates fields locally and retains input after a failed save", async ({ page }) => {
  const env = z.object({ DEMO_EMAIL: z.string(), DEMO_PASSWORD: z.string() }).parse(process.env);
  expect((await page.request.post('/api/auth/login', { headers: { origin: 'http://localhost:3100' }, data: { email: env.DEMO_EMAIL, password: env.DEMO_PASSWORD } })).status()).toBe(200);
  await page.goto('/workspace/knowledge/new');
  await page.getByLabel('Template', { exact: true }).selectOption('cs_operations');
  await expect(page.getByLabel('Customer impact', { exact: true })).toBeVisible();
  await expect(page.getByLabel('Deliverable', { exact: true })).toHaveCount(0);
  await page.getByLabel('Title', { exact: true }).fill('Customer handoff validation');
  await page.getByRole('button', { name: 'Save case', exact: true }).click();
  await expect(page.getByLabel('Problem / objective', { exact: true })).toHaveAttribute('aria-invalid', 'true');
  await expect(page.getByLabel('Title', { exact: true })).toHaveValue('Customer handoff validation');
  await page.getByLabel('Outcome', { exact: true }).selectOption('achieved');
  for (const label of ['Problem / objective', 'Context', 'Approach and reasoning']) await page.getByLabel(label, { exact: true }).fill('A documented customer handoff.');
  await page.getByRole('button', { name: 'Save case', exact: true }).click();
  await expect(page.getByLabel('Observed outcome', { exact: true })).toHaveAttribute('aria-invalid', 'true');
  await expect(page.getByRole('alert').filter({hasText:'Describe the known outcome.'})).toContainText('Describe the known outcome.');
  await page.getByLabel('Observed outcome', { exact: true }).fill('The next owner continued from the recorded queue.');
  await page.route('**/api/cases', route => route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ error: 'Save unavailable for this test.' }) }));
  await page.getByRole('button', { name: 'Save case', exact: true }).click();
  await expect(page.getByRole('alert').filter({hasText:'Save unavailable for this test.'})).toContainText('Save unavailable for this test.');
  await expect(page.getByLabel('Observed outcome', { exact: true })).toHaveValue('The next owner continued from the recorded queue.');
});
