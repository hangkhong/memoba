import { test, expect } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { z } from 'zod';
import { caseRecordSchema, revisionSchema } from '../../../../src/modules/cases/repository.ts';
import { relationTypeSchema } from '../../../../src/modules/cases/schema.ts';
import { conversationDetailSchema } from '../../../../src/modules/conversations/view-schema.ts';
import { storedRunSchema } from '../../../../src/modules/analysis/repository.ts';
import { storedBriefRecordSchema } from '../../../../src/modules/briefs/repository.ts';
const caseDetailSchema = caseRecordSchema.extend({ revisions: z.array(revisionSchema), links: z.array(z.object({ source_id: z.uuid(), target_id: z.uuid(), relation_type: relationTypeSchema, reason: z.string() })) });
const savedRunSchema = storedRunSchema.extend({ briefId: z.uuid().nullable() });
const credentials = z.object({ DEMO_EMAIL: z.email(), DEMO_PASSWORD: z.string().min(12) });
async function read(page, url, schema) { const response = await page.request.get(url); expect(response.status()).toBe(200); return schema.parse(await response.json()); }
const conversation = (page, id) => read(page, `/api/conversations/${id}`, conversationDetailSchema);
const savedRun = (page, id) => read(page, `/api/analyses/${id}`, savedRunSchema);
const savedBrief = (page, id) => read(page, `/api/briefs/${id}`, storedBriefRecordSchema);
const live = process.env.MEMOBA_VERIFY_LIVE === '1';
const root = process.env.MEMOBA_VERIFY_EVIDENCE;
const stamp = Date.now();
async function signIn(page) {
    const env = credentials.parse(process.env);
    await page.goto('/login');
    await page.getByLabel('Email', { exact: true }).fill(env.DEMO_EMAIL);
    await page.getByLabel('Password', { exact: true }).fill(env.DEMO_PASSWORD);
    await page.getByRole('button', { name: 'Sign in', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'What are you working on?', exact: true })).toBeVisible({ timeout: 15000 });
    const r = await page.request.get('/api/workspace');
    expect(r.status()).toBe(200);
    expect(r.headers()['cache-control']).toContain('no-store');
    expect(z.object({ workspaceId: z.uuid() }).parse(await r.json()).workspaceId).toBe('20000000-0000-4000-8000-000000000010');
}
async function select(page, label, option) {
    await page.getByRole('combobox', { name: label, exact: true }).click();
    await page.getByRole('option', { name: option, exact: true }).click();
}
function evidence(name) {
    const dir = path.join(root, name);
    mkdirSync(dir, { recursive: true });
    const actions = [];
    return {
        record(action, result = {}) { actions.push({ action, result, at: new Date().toISOString() }); writeFileSync(path.join(dir, 'actions.json'), JSON.stringify(actions, null, 2) + '\n'); },
        async capture(page, label) { await page.screenshot({ path: path.join(dir, `${label}.png`), fullPage: true }); writeFileSync(path.join(dir, `${label}.aria.txt`), await page.locator('body').ariaSnapshot()); },
    };
}
const detail = (page, id) => read(page, `/api/cases/${id}`, caseDetailSchema);
async function archive(page, id) {
    await page.goto(`/workspace/knowledge/${id}`);
    const d = await detail(page, id);
    if (d.lifecycle === 'archived')
        return;
    await page.getByRole('button', { name: 'Archive', exact: true }).click();
    const response = page.waitForResponse(r => r.request().method() === 'POST' && r.url().endsWith('/archive'), { timeout: 15000 });
    await page.getByRole('button', { name: 'Archive case', exact: true }).click();
    expect((await response).status()).toBe(200);
    expect((await detail(page, id)).lifecycle).toBe('archived');
    await page.reload();
    await expect(page.getByText('Archived', { exact: true })).toBeVisible({ timeout: 15000 });
}
async function create(page, title, cs = false) {
    await page.goto('/workspace/cases/new');
    await expect(page.getByRole('dialog', { name: 'Record a case', exact: true })).toBeVisible();
    if (cs)
        await select(page, 'Template', 'CS / Operations');
    for (const [label, text] of [['Title', title], ['Problem / objective', `Synthetic ${title} rollout risk`], ['Context', 'Synthetic team of two operators with no planned downtime.'], ['Approach and reasoning', 'Use a controlled pilot, a named rollback owner, and review payment errors before expansion.']])
        await page.getByLabel(label, { exact: true }).fill(text);
    await page.getByLabel(cs ? 'Customer impact' : 'Deliverable', { exact: true }).fill('Synthetic verification field');
    await page.getByRole('button', { name: 'Add source', exact: true }).click();
    await page.getByLabel('Source 1 label', { exact: true }).fill('Synthetic reference');
    await page.getByLabel('Source 1 URL', { exact: true }).fill('https://example.com/memoba-verification');
    await page.getByRole('button', { name: 'Save case', exact: true }).click();
    await expect(page).toHaveURL(/\/workspace\/knowledge\/[0-9a-f-]+$/, { timeout: 90000 });
    return new URL(page.url()).pathname.split('/').pop();
}
test.afterEach(async ({ page }, info) => {
    for (const label of ['Email', 'Password']) {
        const input = page.getByLabel(label, { exact: true });
        if (await input.count())
            await input.fill('');
    }
    if (info.status !== info.expectedStatus) {
        const output = execFileSync('npm', ['run', 'doctor'], { encoding: 'utf8', timeout: 30000 });
        writeFileSync(path.join(root, `doctor-after-${info.title.replaceAll(/[^a-z0-9]/gi, '-')}.txt`), output);
    }
    const stop = page.getByRole('button', { name: 'Stop analysis', exact: true });
    if (await stop.isVisible().catch(() => false)) {
        const conversationId = new URL(page.url()).pathname.split('/').pop();
        await stop.click();
        await expect.poll(async () => {
            const response = await page.request.get(`/api/conversations/${conversationId}`);
            if (response.status() !== 200)
                return true;
            return conversationDetailSchema.parse(await response.json()).turns.some(turn => turn.runs.some(run => run.status === 'running'));
        }, { timeout: 20000 }).toBe(false);
    }
});
test('maintenance: text chat, dialogs, revisions, links, import failure and hub', async ({ page }) => {
    test.skip(live, 'Offline profile requires both provider keys disabled.');
    const proof = evidence('maintenance');
    const ids = [];
    let failed = false;
    try {
        await signIn(page);
        proof.record('Authenticated doctor passed.');
        const recovery = z.array(z.uuid()).parse((process.env.MEMOBA_VERIFY_ARCHIVE_IDS ?? '').split(',').filter(Boolean));
        for (const id of recovery) {
            const prior = await detail(page, id);
            expect(prior.revisions.some(revision => revision.content.title.startsWith('Synthetic maintenance'))).toBe(true);
            await archive(page, id);
            proof.record('Recovered owned synthetic case from a failed iteration.', { caseId: id });
        }
        await page.goto('/workspace/requests/new');
        await expect(page).toHaveURL(/\/workspace\/chat$/);
        await page.getByRole('button', { name: 'Launch to all customers', exact: true }).click();
        await expect(page.getByLabel('What do you want to achieve?', { exact: true })).toHaveValue(/bulk payment-matching/);
        const message = `Synthetic maintenance ${stamp}. Release safely. No planned downtime.`;
        const question = page.getByLabel('What do you want to achieve?', { exact: true });
        await question.fill(message);
        await question.dispatchEvent('keydown', { key: 'Enter', code: 'Enter', isComposing: true, keyCode: 229 });
        await expect(page).toHaveURL(/\/workspace\/chat$/);
        await question.press('Shift+Enter');
        await expect(question).toHaveValue(message + '\n');
        await question.fill(message);
        let a = page.waitForResponse(r => r.request().method() === 'POST' && r.url().endsWith('/analyses'));
        await question.press('Enter');
        expect((await a).status()).toBe(503);
        await expect(page).toHaveURL(/\/workspace\/chat\/[0-9a-f-]+$/);
        const conversationId = new URL(page.url()).pathname.split('/').pop();
        const first = await conversation(page, conversationId);
        expect(first.turns[0].request).toEqual({ version: 2, message, history: [] });
        expect(first.turns[0].runs).toHaveLength(0);
        a = page.waitForResponse(r => r.request().method() === 'POST' && r.url().endsWith('/analyses'));
        await page.getByLabel('Follow-up question', { exact: true }).fill('Only one operator is available.');
        await page.getByRole('button', { name: 'Send question', exact: true }).click();
        expect((await a).status()).toBe(503);
        await expect(page.getByRole('region', { name: 'Turn 2', exact: true })).toBeVisible();
        const second = await conversation(page, conversationId);
        expect(second.turns[0].request).toEqual(first.turns[0].request);
        expect(second.turns[1].request.history).toEqual([{ role: 'user', text: message }]);
        let posts = 0;
        page.on('request', r => {
            if (r.method() === 'POST' && r.url().endsWith('/analyses'))
                posts++;
        });
        await page.reload();
        await expect(page.getByRole('region', { name: 'Turn 2', exact: true })).toBeVisible();
        expect(posts).toBe(0);
        proof.record('Text-only prompt, suggestion, IME, newline, Enter, two saved snapshots, unavailable analysis and refresh.', { conversationId });
        await proof.capture(page, 'chat');
        await page.setViewportSize({ width: 390, height: 844 });
        await page.getByRole('button', { name: 'Toggle Sidebar', exact: true }).click();
        await page.getByRole('link', { name: 'Knowledge Hub', exact: true }).click();
        await expect(page.getByRole('dialog')).toHaveCount(0, { timeout: 15000 });
        await page.setViewportSize({ width: 1440, height: 1000 });
        const oneTitle = `Synthetic maintenance Product ${stamp}`, twoTitle = `Synthetic maintenance CS ${stamp}`;
        const one = await create(page, oneTitle);
        ids.push(one);
        proof.record('Created Product fixture.', { caseId: one });
        const initial = await detail(page, one);
        expect(initial.published_revision_id).toBeNull();
        expect(initial.revisions[0].index_state).toBe('failed');
        await expect(page.getByText("Couldn't prepare this case for questions.", { exact: true })).toBeVisible();
        await page.goto(`/workspace/cases/${one}/edit`);
        await expect(page.getByRole('dialog', { name: 'Edit case', exact: true })).toBeVisible();
        await select(page, 'Template', 'CS / Operations');
        await page.getByRole('button', { name: 'Switch and clear', exact: true }).click();
        await expect(page.getByLabel('Title', { exact: true })).toHaveValue(oneTitle);
        await expect(page.getByLabel('Customer impact', { exact: true })).toHaveValue('');
        await select(page, 'Template', 'Product / Delivery');
        await page.getByLabel('Approach and reasoning', { exact: true }).fill('Second revision with a reviewed pilot.');
        await page.getByRole('button', { name: 'Save case', exact: true }).click();
        await expect(page.getByRole('dialog')).toHaveCount(0, { timeout: 15000 });
        const revised = await detail(page, one);
        expect(revised.revisions).toHaveLength(2);
        expect(revised.revisions.find(r => r.id === initial.revisions[0].id).content).toEqual(initial.revisions[0].content);
        await expect(page.getByRole('heading', { name: 'Version history', exact: true })).toBeVisible();
        await page.getByRole('button', { name: 'Try again', exact: true }).click();
        await expect(page.getByRole('status')).toContainText("Still couldn't prepare this case");
        const two = await create(page, twoTitle, true);
        ids.push(two);
        proof.record('Created CS fixture.', { caseId: two });
        expect((await detail(page, two)).revisions[0].content.template).toBe('cs_operations');
        let linkFailure;
        try {
            await page.goto(`/workspace/knowledge/${one}`);
            await page.getByRole('button', { name: 'Add case', exact: true }).click();
            await select(page, 'Case', twoTitle);
            await page.getByLabel('Reason', { exact: true }).fill('Synthetic comparison');
            await proof.capture(page, 'before-link-submit');
            const linked = page.waitForResponse(r => r.request().method() === 'POST' && r.url().endsWith('/links'), { timeout: 15000 });
            await page.getByRole('dialog', { name: 'Add related case', exact: true }).getByRole('button', { name: 'Add case', exact: true }).click();
            const linkResponse = await linked;
            proof.record('Real link creation response.', { status: linkResponse.status(), contentType: linkResponse.headers()['content-type'] });
            await proof.capture(page, 'link-result');
            expect(linkResponse.status()).toBe(200);
            await expect(page.getByRole('dialog')).toHaveCount(0, { timeout: 15000 });
            for (const relation of ['Contrasts with', 'Supersedes']) {
                await page.getByRole('link', { name: twoTitle, exact: true }).hover();
                await page.getByRole('button', { name: `Edit link to ${twoTitle}`, exact: true }).click();
                await expect(page.getByRole('combobox', { name: 'Case', exact: true })).toBeDisabled();
                await select(page, 'Relation', relation);
                const changed = page.waitForResponse(r => r.request().method() === 'PATCH' && r.url().endsWith('/links'), { timeout: 15000 });
                await page.getByRole('button', { name: 'Save changes', exact: true }).click();
                const changedResponse = await changed;
                proof.record('Edit relation response.', { relation, status: changedResponse.status() });
                expect(changedResponse.status()).toBe(200);
                await expect(page.getByRole('dialog')).toHaveCount(0, { timeout: 15000 });
            }
            expect((await detail(page, one)).links[0].relation_type).toBe('supersedes');
            await page.getByRole('link', { name: twoTitle, exact: true }).click();
            await expect(page.getByText(/Superseded by · Synthetic comparison/)).toBeVisible();
            await page.goto(`/workspace/knowledge/${one}`);
            await page.getByRole('link', { name: twoTitle, exact: true }).hover();
            await page.getByRole('button', { name: `Remove link to ${twoTitle}`, exact: true }).click();
            await page.getByRole('button', { name: 'Remove link', exact: true }).click();
            await expect(page.getByRole('dialog')).toHaveCount(0, { timeout: 15000 });
            expect((await detail(page, one)).links).toHaveLength(0);
            proof.record('Both templates, source metadata, immutable edit, template confirmation, index retry, link add/edit/inverse/remove.', { caseIds: ids });
            await proof.capture(page, 'case');
        }
        catch (error) {
            linkFailure = error;
            proof.record('Link journey failed; remaining offline features will still be exercised.', { message: error.message });
            await proof.capture(page, 'link-failure');
            writeFileSync(path.join(root, 'doctor-after-link.txt'), execFileSync('npm', ['run', 'doctor'], { encoding: 'utf8', timeout: 30000 }));
            await page.goto(`/workspace/knowledge/${one}`);
            if ((await detail(page, one)).links.length) {
                await page.getByRole('link', { name: twoTitle, exact: true }).hover();
                await page.getByRole('button', { name: `Remove link to ${twoTitle}`, exact: true }).click();
                await page.getByRole('button', { name: 'Remove link', exact: true }).click();
                await expect(page.getByRole('dialog')).toHaveCount(0, { timeout: 15000 });
                expect((await detail(page, one)).links).toHaveLength(0);
                proof.record('Removed owned link after failed relation edit.');
            }
        }
        await page.goto('/workspace/knowledge');
        await page.getByRole('button', { name: 'Import from notes', exact: true }).click();
        await page.getByLabel('Choose documents', { exact: true }).setInputFiles({ name: 'synthetic.txt', mimeType: 'text/plain', buffer: Buffer.from('Not uploaded') });
        await expect(page.getByText('synthetic.txt', { exact: true })).toBeVisible();
        await expect(page.getByText('Coming soon. Files are not read or uploaded.', { exact: true })).toBeVisible();
        await page.getByLabel('Paste your notes', { exact: true }).fill('Synthetic notes with no stated outcome.');
        await page.getByRole('button', { name: 'Draft case', exact: true }).click();
        await expect(page.getByText('AI drafting is unavailable.', { exact: true })).toBeVisible();
        await expect(page.getByLabel('Paste your notes', { exact: true })).toHaveValue('Synthetic notes with no stated outcome.');
        await proof.capture(page, 'import-unavailable');
        await page.getByRole('button', { name: 'Cancel', exact: true }).click();
        await expect(page.getByRole('region', { name: 'Cases', exact: true })).toBeVisible();
        await page.getByLabel('Search cases', { exact: true }).fill(oneTitle);
        await expect(page.getByRole('link', { name: oneTitle, exact: true })).toBeVisible();
        await select(page, 'Template', 'Product / Delivery');
        await select(page, 'Outcome', 'Unknown');
        await expect(page.getByRole('link', { name: oneTitle, exact: true })).toBeVisible();
        await select(page, 'Template', 'CS / Operations');
        await expect(page.getByText('No cases match these filters.', { exact: true })).toBeVisible();
        await page.getByLabel('Search cases', { exact: true }).fill(twoTitle);
        await expect(page.getByRole('link', { name: twoTitle, exact: true })).toBeVisible();
        await select(page, 'Template', 'All templates');
        await select(page, 'Outcome', 'All outcomes');
        await page.getByLabel('Search cases', { exact: true }).fill(`Synthetic maintenance`);
        await page.getByRole('button', { name: 'Case', exact: true }).click();
        await expect(page.getByRole('columnheader', { name: 'Case', exact: true })).toHaveAttribute('aria-sort', 'ascending');
        await page.getByRole('button', { name: 'Case', exact: true }).click();
        await expect(page.getByRole('columnheader', { name: 'Case', exact: true })).toHaveAttribute('aria-sort', 'descending');
        await page.getByRole('button', { name: 'Updated', exact: true }).click();
        await expect(page.getByRole('columnheader', { name: 'Updated', exact: true })).toHaveAttribute('aria-sort', 'descending');
        proof.record('Unavailable import retained notes; Hub search, template/outcome filters, empty state and sorting verified.');
        await proof.capture(page, 'hub-filters');
        await archive(page, two);
        await page.getByRole('link', { name: 'Back to Knowledge Hub', exact: true }).click();
        await page.getByLabel('Search cases', { exact: true }).fill(twoTitle);
        await expect(page.getByRole('link', { name: twoTitle, exact: true })).toHaveCount(0);
        await page.getByRole('checkbox', { name: 'Include archived', exact: true }).check();
        await page.getByRole('link', { name: twoTitle, exact: true }).click();
        await expect(page).toHaveURL(new RegExp(`/workspace/knowledge/${two}$`));
        await expect(page.getByRole('heading', { name: twoTitle, exact: true })).toBeVisible();
        await expect(page.getByRole('button', { name: 'Edit case', exact: true })).toHaveCount(0);
        await page.reload();
        await expect(page.getByText('Archived', { exact: true })).toBeVisible();
        proof.record('Hub search, compound filters, empty state, sorting, archived history and read-only detail.');
        await proof.capture(page, 'archived');
        if (linkFailure)
            throw linkFailure;
    }
    catch (error) {
        failed = true;
        proof.record('Journey failed', { message: error.message });
        if (!page.url().includes('/login'))
            await proof.capture(page, 'failure');
        throw error;
    }
    finally {
        if (failed) {
            const output = execFileSync('npm', ['run', 'doctor'], { encoding: 'utf8', timeout: 30000 });
            writeFileSync(path.join(root, 'doctor-before-cleanup.txt'), output);
        }
        for (const id of ids) {
            try {
                await archive(page, id);
                proof.record('Archived owned synthetic case.', { id });
            }
            catch {
                proof.record('Cleanup blocked; synthetic case retained.', { id });
            }
        }
    }
});
test('maintenance live: reviewed import, publication, saved answer and pinned citations', async ({ page }) => {
    test.skip(!live, 'Requires explicit real-provider profile.');
    test.setTimeout(650000);
    const proof = evidence('live');
    const ids = [];
    let failed = false;
    try {
        await signIn(page);
        await page.setViewportSize({ width: 1440, height: 1000 });
        await page.goto('/workspace/knowledge');
        await page.getByRole('button', { name: 'Import from notes', exact: true }).click();
        const title = `Synthetic maintenance pilot ${stamp}`;
        await page.getByLabel('Paste your notes', { exact: true }).fill(`Synthetic Product Delivery case. Title: ${title}. Problem: release a payment matching update safely. Context: two engineers with no planned downtime. Approach: release to a ten customer pilot with a named rollback owner, watch payment errors for one day, then decide whether to expand. No outcome was measured or reported.`);
        const draftResponse = page.waitForResponse(r => r.request().method() === 'POST' && r.url().endsWith('/api/cases/drafts'));
        await page.getByRole('button', { name: 'Draft case', exact: true }).click();
        expect((await draftResponse).status()).toBe(200);
        await expect(page.getByRole('dialog', { name: 'Review the draft', exact: true })).toBeVisible({ timeout: 45000 });
        await expect(page.getByRole('combobox', { name: 'Outcome', exact: true })).toContainText('Unknown');
        await expect(page.getByLabel('Observed outcome', { exact: true })).toHaveValue('');
        await page.getByLabel('Title', { exact: true }).fill(title);
        await proof.capture(page, 'review-draft');
        proof.record('Real notes drafted; outcome remains unknown; review shown before save.');
        await page.getByRole('button', { name: 'Save case', exact: true }).click();
        await expect(page).toHaveURL(/\/workspace\/knowledge\/[0-9a-f-]+$/, { timeout: 90000 });
        const id = new URL(page.url()).pathname.split('/').pop();
        ids.push(id);
        const saved = await detail(page, id);
        expect(saved.revisions[0].index_state).toBe('ready');
        expect(saved.published_revision_id).toBe(saved.revisions[0].id);
        await expect(page.getByText('Available', { exact: true })).toBeVisible();
        proof.record('Reviewed draft saved and published with real embeddings.', { caseId: id, revisionId: saved.published_revision_id });
        await page.goto('/workspace/chat');
        await page.getByLabel('What do you want to achieve?', { exact: true }).fill(`Find the recorded case titled "${title}". Read its approach, context and outcome. Explain how that approach applies to a two-engineer payment update with no planned downtime, and cite the recorded sections. Do not treat the unknown result as success.`);
        const responsePromise = page.waitForResponse(r => r.request().method() === 'POST' && r.url().endsWith('/analyses'));
        await page.getByRole('button', { name: 'Send question', exact: true }).click();
        const response = await responsePromise;
        expect(response.status()).toBe(200);
        const runId = response.headers()['x-run-id'];
        expect(runId).toMatch(/^[0-9a-f-]{36}$/);
        await expect(page.locator('.answer-markdown')).toBeVisible({ timeout: 300000 });
        await expect.poll(async () => (await savedRun(page, runId)).status, { timeout: 300000 }).toBe('complete');
        const run = await savedRun(page, runId);
        const briefResponse = await page.request.get(`/api/briefs/${run.briefId}`);
        expect(briefResponse.status()).toBe(200);
        const brief = storedBriefRecordSchema.parse(await briefResponse.json());
        expect(brief.generated.version).toBe(2);
        expect(brief.evidence.length).toBeGreaterThan(0);
        const conversationId = new URL(page.url()).pathname.split('/').pop();
        proof.record('Real analysis completed with persisted evidence.', { conversationId, runId, briefId: run.briefId, coverage: brief.generated.coverage, events: run.events });
        await expect(page.locator('.answer-markdown')).toContainText('How similar cases went');
        await expect(page.locator('.answer-markdown')).toContainText("What's different this time");
        await expect(page.locator('.answer-markdown')).toContainText('Suggested next step');
        const citation = page.getByRole('button', { name: /^Open source/ }).first();
        await citation.click();
        const panel = page.getByRole('complementary', { name: 'Source evidence', exact: true });
        await expect(panel.locator('blockquote')).toBeVisible();
        const excerpt = await panel.locator('blockquote').innerText();
        const item = brief.evidence.find(e => e.excerpt === excerpt);
        expect(item).toBeTruthy();
        await panel.getByText('Details', { exact: true }).click();
        await expect(panel).toContainText(item.revisionId);
        await expect(panel).toContainText(item.sectionId);
        const source = await detail(page, item.caseId);
        expect(source.revisions.some(r => r.id === item.revisionId)).toBe(true);
        await proof.capture(page, 'desktop-source');
        await page.getByRole('button', { name: 'Close source', exact: true }).click();
        await page.setViewportSize({ width: 390, height: 844 });
        await citation.click();
        await expect(page.getByRole('dialog', { name: 'Source evidence', exact: true })).toBeVisible();
        await proof.capture(page, 'mobile-source');
        await page.keyboard.press('Escape');
        await page.setViewportSize({ width: 1440, height: 1000 });
        await page.goto(`/workspace/analyses/${runId}`);
        await page.getByRole('link', { name: 'Open answer', exact: true }).click();
        await expect(page.getByRole('heading', { name: 'Answer', exact: true })).toBeVisible();
        await expect(page.locator('.answer-markdown')).toContainText('Suggested next step');
        await expect(page.getByLabel('Your edited version', { exact: true })).toHaveCount(0);
        let posts = 0;
        page.on('request', r => {
            if (r.method() === 'POST' && r.url().endsWith('/analyses'))
                posts++;
        });
        await page.reload();
        await expect(page.locator('.answer-markdown')).toBeVisible();
        expect(posts).toBe(0);
        await proof.capture(page, 'saved-answer');
        proof.record('Saved answer, responsive citations and authorized pinned excerpts verified. No v2 edit controls.');
        // Inspect legacy preconditions through an authorized conversation read, without synthesizing records.
        await page.goto(`/workspace/chat/${conversationId}`);
        const conv = await conversation(page, conversationId);
        expect(conv.turns[0].runs[0].brief.generated.version).toBe(2);
        proof.record('Legacy edit entry attempted through saved brief; current fixture is v2 and cannot exercise legacy edits.', { briefId: run.briefId });
    }
    catch (error) {
        failed = true;
        proof.record('Live journey failed', { message: error.message });
        if (!page.url().includes('/login'))
            await proof.capture(page, 'failure');
        throw error;
    }
    finally {
        if (failed) {
            const output = execFileSync('npm', ['run', 'doctor'], { encoding: 'utf8', timeout: 30000 });
            writeFileSync(path.join(root, 'doctor-before-live-cleanup.txt'), output);
        }
        for (const id of ids) {
            try {
                await archive(page, id);
                proof.record('Archived owned live case.', { id });
            }
            catch {
                proof.record('Cleanup blocked; live case retained.', { id });
            }
        }
    }
});
test('maintenance live: Stop and Retry persist separate cancelled attempts', async ({ page }) => {
    test.skip(!live, 'Requires real-provider admission.');
    test.setTimeout(120000);
    const proof = evidence('live-cancel');
    await signIn(page);
    const request = page.getByLabel('What do you want to achieve?', { exact: true });
    await request.fill(`Synthetic maintenance cancellation ${stamp}. Compare the recorded rollout approaches and outcomes in detail before recommending a staged launch.`);
    let pending = page.waitForResponse(r => r.request().method() === 'POST' && r.url().endsWith('/analyses'));
    await page.getByRole('button', { name: 'Send question', exact: true }).click();
    let response = await pending;
    expect(response.status()).toBe(200);
    const first = response.headers()['x-run-id'];
    await page.getByRole('button', { name: 'Stop analysis', exact: true }).click();
    await expect.poll(async () => (await savedRun(page, first)).status, { timeout: 20000 }).toBe('cancelled');
    await expect(page.getByRole('button', { name: 'Retry analysis', exact: true })).toBeVisible({ timeout: 15000 });
    pending = page.waitForResponse(r => r.request().method() === 'POST' && r.url().endsWith('/analyses'));
    await page.getByRole('button', { name: 'Retry analysis', exact: true }).click();
    response = await pending;
    expect(response.status()).toBe(200);
    const second = response.headers()['x-run-id'];
    expect(second).not.toBe(first);
    await page.getByRole('button', { name: 'Stop analysis', exact: true }).click();
    await expect.poll(async () => (await savedRun(page, second)).status, { timeout: 20000 }).toBe('cancelled');
    await page.reload();
    await expect(page.getByRole('button', { name: 'Retry analysis', exact: true })).toBeVisible();
    proof.record('Stop and retry each persisted cancellation.', { runIds: [first, second], conversationId: new URL(page.url()).pathname.split('/').pop() });
    await proof.capture(page, 'cancelled');
});
test('maintenance live: successful search without relevant precedent', async ({ page }) => {
    test.skip(!live, 'Requires real search and reasoning.');
    test.setTimeout(400000);
    const proof = evidence('live-no-precedent');
    await signIn(page);
    await page.getByLabel('What do you want to achieve?', { exact: true }).fill('Synthetic maintenance question: We are considering a Singapore data center to meet local data residency rules for two prospects. Search our recorded cases. Have we done anything like this before? Distinguish relevant recorded experience from general advice.');
    const started = page.waitForResponse(r => r.request().method() === 'POST' && r.url().endsWith('/analyses'));
    await page.getByRole('button', { name: 'Send question', exact: true }).click();
    const response = await started;
    expect(response.status()).toBe(200);
    const runId = response.headers()['x-run-id'];
    await expect.poll(async () => (await savedRun(page, runId)).status, { timeout: 300000 }).toBe('complete');
    const run = await savedRun(page, runId);
    const brief = await savedBrief(page, run.briefId);
    expect(brief.generated.coverage.searched).toBe(true);
    expect(brief.generated.coverage.searchFailed).toBe(false);
    await expect(page.locator('.answer-markdown')).toBeVisible();
    expect(brief.generated.text).not.toMatch(/How similar cases went/i);
    expect(brief.generated.text).toMatch(/no (?:recorded|relevant|direct)|(?:didn.t|did not|couldn.t|could not) find|haven.t|have not|nothing/i);
    proof.record('Search succeeded and answer distinguishes missing precedent from advice.', { conversationId: new URL(page.url()).pathname.split('/').pop(), runId, briefId: run.briefId, coverage: brief.generated.coverage, answer: brief.generated.text });
    await proof.capture(page, 'no-precedent');
});
