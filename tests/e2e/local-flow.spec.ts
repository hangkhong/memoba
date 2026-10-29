import { expect, test } from "@playwright/test";
import { z } from "zod";
test.use({ screenshot: "off" });

test("@live real case evidence becomes a saved answer with citations", async ({ page }) => {
 test.setTimeout(650000);
 await page.setViewportSize({width:1440,height:1000});
 const env=z.object({DEMO_EMAIL:z.string(),DEMO_PASSWORD:z.string()}).parse(process.env);
 await page.goto("/login");await page.getByLabel("Email",{exact:true}).fill(env.DEMO_EMAIL);await page.getByLabel("Password",{exact:true}).fill(env.DEMO_PASSWORD);await page.getByRole("button",{name:"Sign in",exact:true}).click();
 try { await page.waitForURL(/\/workspace/,{timeout:15000}); } catch { if(page.url().includes("/login")){await page.getByLabel("Password",{exact:true}).fill("");await page.getByLabel("Email",{exact:true}).fill("");} throw new Error("Sign-in did not complete."); }
 await page.goto("/workspace/chat");
 await page.getByLabel("What do you want to achieve?",{exact:true}).fill("Release a checkout change safely using a controlled rollout and tested rollback. A small team must preserve payments and the existing sign-in flow. No planned downtime. We can use a feature flag and payment error monitoring.");
 const responsePromise=page.waitForResponse((response)=>response.url().includes("/api/conversations/") && response.url().endsWith("/analyses") && response.request().method()==="POST");
 await page.getByRole("button",{name:"Send question",exact:true}).click();
 const response=await responsePromise;expect(response.status()).toBe(200);const runId=z.uuid().parse(response.headers()["x-run-id"]);
 await expect(page.locator(".answer-markdown")).toBeVisible({timeout:300000});
 const runResponse=await page.request.get(`/api/analyses/${runId}`);const run=z.object({status:z.string(),error_code:z.string().nullable(),briefId:z.string().nullable()}).parse(await runResponse.json());
 expect(run.status,JSON.stringify(run)).toBe("complete");
 await expect(page.locator(".answer-markdown")).toBeVisible();
 const citation=page.getByRole("button",{name:/^Open source/}).first();await expect(citation).toBeVisible();await citation.click();
 const evidence=page.getByRole("complementary",{name:"Source evidence"});await expect(evidence.locator("blockquote")).toBeVisible();
 await page.getByRole("button",{name:"Close source",exact:true}).click();
 await page.screenshot({path:"test-results/reuse-brief.png",fullPage:true});
 await page.reload();await expect(page.locator(".answer-markdown")).toBeVisible();
 await page.getByLabel("Follow-up question",{exact:true}).fill("How would you adapt that rollout for a smaller team while keeping the no-downtime constraint?");
 const followup=page.waitForResponse((response)=>response.url().includes("/api/conversations/") && response.url().endsWith("/analyses") && response.request().method()==="POST");
 await page.getByRole("button",{name:"Send question",exact:true}).click();
 const followupResponse=await followup;expect(followupResponse.status()).toBe(200);const followupId=z.uuid().parse(followupResponse.headers()["x-run-id"]);
 await expect(page.locator(".answer-markdown")).toHaveCount(2,{timeout:300000});
 const savedFollowup=await page.request.get(`/api/analyses/${followupId}`);expect(z.object({status:z.string()}).parse(await savedFollowup.json()).status).toBe("complete");
});

test("@live Stop persists cancellation and Retry starts a separate attempt", async ({ page }) => {
 test.setTimeout(90000);
 const env=z.object({DEMO_EMAIL:z.string(),DEMO_PASSWORD:z.string()}).parse(process.env);
 expect((await page.request.post('/api/auth/login',{headers:{origin:'http://localhost:3100'},data:{email:env.DEMO_EMAIL,password:env.DEMO_PASSWORD}})).status()).toBe(200);
 await page.goto('/workspace/chat');
 await page.getByLabel('What do you want to achieve?',{exact:true}).fill('Compare the recorded successful checkout rollout with failed releases. Read the conditions and outcomes before giving recommendations for a small team.');
 const started=page.waitForResponse(response=>response.request().method()==='POST'&&response.url().endsWith('/analyses'));
 await page.getByRole('button',{name:'Send question',exact:true}).click();
 const first=await started;expect(first.status()).toBe(200);const firstId=z.uuid().parse(first.headers()['x-run-id']);
 await page.getByRole('button',{name:'Stop analysis',exact:true}).click();
 await expect.poll(async()=>z.object({status:z.string()}).parse(await(await page.request.get(`/api/analyses/${firstId}`)).json()).status,{timeout:20000}).toBe('cancelled');
 await expect(page.getByRole('button',{name:'Retry analysis',exact:true})).toBeVisible({timeout:15000});
 const retried=page.waitForResponse(response=>response.request().method()==='POST'&&response.url().endsWith('/analyses'));
 await page.getByRole('button',{name:'Retry analysis',exact:true}).click();
 const second=await retried;expect(second.status()).toBe(200);const secondId=z.uuid().parse(second.headers()['x-run-id']);expect(secondId).not.toBe(firstId);
 await page.getByRole('button',{name:'Stop analysis',exact:true}).click();
 await expect.poll(async()=>z.object({status:z.string()}).parse(await(await page.request.get(`/api/analyses/${secondId}`)).json()).status,{timeout:20000}).toBe('cancelled');
 let restarted=0;page.on('request',request=>{if(request.method()==='POST'&&request.url().endsWith('/analyses'))restarted++;});
 await page.reload();await expect(page.getByRole('button',{name:'Retry analysis',exact:true})).toBeVisible();expect(restarted).toBe(0);
});
