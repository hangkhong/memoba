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
  await expect(page.getByRole("dialog", { name: "Record a case" })).toBeVisible();
  await page.getByLabel("Title", { exact: true }).fill(`Controlled release ${Date.now()}`);
  for (const label of ["Problem / objective", "Context", "Constraints", "Approach and reasoning", "Observed outcome", "Lessons and applicability", "Deliverable", "Change scope", "Deployment conditions"]) await page.getByLabel(label, { exact: true }).fill(`Synthetic demo: ${label}. Use a controlled canary rollout and keep rollback ready.`);
  await page.getByRole("button", { name: "Save case", exact: true }).click();
  await expect(page).toHaveURL(/\/workspace\/knowledge\/[0-9a-f-]+$/, { timeout: 90000 });
  await expect(page.getByText("Available", { exact: true })).toBeVisible();
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
  await expect(page.getByRole("dialog", { name: "Record a case" })).toBeVisible();
  await page.getByLabel("Title", { exact: true }).fill(`Minimal case ${Date.now()}`);
  await page.getByLabel("Problem / objective", { exact: true }).fill("Release risk");
  await page.getByLabel("Context", { exact: true }).fill("Small team");
  await page.getByLabel("Approach and reasoning", { exact: true }).fill("Canary rollout");
  await page.getByRole("button", { name: "Save case", exact: true }).click();
  await expect(page).toHaveURL(/\/workspace\/knowledge\/[0-9a-f-]+$/);
  await expect(page.getByText("Couldn't prepare this case for questions.", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Try again", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("Still couldn't prepare this case");
  await page.getByRole("button", { name: "Archive", exact: true }).click();
  await page.getByRole("button", { name: "Archive case", exact: true }).click();
  await expect(page.getByText("Archived", { exact: true })).toBeVisible();
});

test("CS template validates fields locally and retains input after a failed save", async ({ page }) => {
  const env = z.object({ DEMO_EMAIL: z.string(), DEMO_PASSWORD: z.string() }).parse(process.env);
  expect((await page.request.post('/api/auth/login', { headers: { origin: 'http://localhost:3100' }, data: { email: env.DEMO_EMAIL, password: env.DEMO_PASSWORD } })).status()).toBe(200);
  await page.goto('/workspace/knowledge/new');
  await expect(page.getByRole('dialog', { name: 'Record a case' })).toBeVisible();
  await page.getByRole('combobox', { name: 'Template', exact: true }).click();
  await page.getByRole('option', { name: 'CS / Operations', exact: true }).click();
  await expect(page.getByLabel('Customer impact', { exact: true })).toBeVisible();
  await expect(page.getByLabel('Deliverable', { exact: true })).toHaveCount(0);
  await page.getByLabel('Title', { exact: true }).fill('Customer handoff validation');
  await page.getByRole('button', { name: 'Save case', exact: true }).click();
  await expect(page.getByLabel('Problem / objective', { exact: true })).toHaveAttribute('aria-invalid', 'true');
  await expect(page.getByLabel('Title', { exact: true })).toHaveValue('Customer handoff validation');
  await page.getByRole('combobox', { name: 'Outcome', exact: true }).click();
  await page.getByRole('option', { name: 'Achieved', exact: true }).click();
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

test("import shows its own dialog, keeps documents unread, and records by hand without AI", async ({ page }) => {
  const env = z.object({ DEMO_EMAIL: z.string(), DEMO_PASSWORD: z.string() }).parse(process.env);
  expect((await page.request.post("/api/auth/login", { headers: { origin: "http://localhost:3100" }, data: { email: env.DEMO_EMAIL, password: env.DEMO_PASSWORD } })).status()).toBe(200);
  await page.goto("/workspace/knowledge");
  await page.getByRole("button", { name: "Import from notes", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Import from notes" });
  await dialog.getByLabel("Choose documents", { exact: true }).setInputFiles({ name: "postmortem.pdf", mimeType: "application/pdf", buffer: Buffer.from("not parsed") });
  await expect(dialog.getByText("Files are not read or uploaded", { exact: false })).toBeVisible();
  await expect(dialog.getByText("postmortem.pdf", { exact: true })).toBeVisible();
  await dialog.getByLabel("Paste your notes", { exact: true }).fill("We moved invoice sending to a queue and watched failures for a week.");
  await dialog.getByRole("button", { name: "Draft case", exact: true }).click();
  await expect(dialog.getByRole("alert").filter({ hasText: "AI drafting is unavailable." })).toBeVisible();
  await expect(dialog.getByLabel("Paste your notes", { exact: true })).toHaveValue(/invoice sending/);
  await dialog.getByRole("button", { name: "Cancel", exact: true }).click();
  await page.getByRole("button", { name: "Record a case", exact: true }).click();
  await page.getByLabel("Title", { exact: true }).fill(`Manual after import ${Date.now()}`);
  await page.getByLabel("Problem / objective", { exact: true }).fill("Invoice sending was slow.");
  await page.getByLabel("Context", { exact: true }).fill("Small team");
  await page.getByLabel("Approach and reasoning", { exact: true }).fill("Move sending to a queue.");
  await page.getByRole("button", { name: "Save case", exact: true }).click();
  await expect(page).toHaveURL(/\/workspace\/knowledge\/[0-9a-f-]+$/);
});
