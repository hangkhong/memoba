import { expect, test } from "@playwright/test";
import { z } from "zod";
test.use({ screenshot: "off" });

test("@live real case evidence becomes a saved answer with citations", async ({ page }) => {
 test.setTimeout(650000);
 const env=z.object({DEMO_EMAIL:z.string(),DEMO_PASSWORD:z.string()}).parse(process.env);
 await page.goto("/login");await page.getByLabel("Email",{exact:true}).fill(env.DEMO_EMAIL);await page.getByLabel("Password",{exact:true}).fill(env.DEMO_PASSWORD);await page.getByRole("button",{name:"Sign in",exact:true}).click();
 try { await page.waitForURL(/\/workspace/,{timeout:15000}); } catch { if(page.url().includes("/login")){await page.getByLabel("Password",{exact:true}).fill("");await page.getByLabel("Email",{exact:true}).fill("");} throw new Error("Sign-in did not complete."); }
 await page.goto("/workspace/chat");
 await page.getByLabel("What do you want to achieve?",{exact:true}).fill("Release a checkout change safely using a controlled rollout and tested rollback. A small team must preserve payments and the existing sign-in flow. No planned downtime. We can use a feature flag and payment error monitoring.");
 const responsePromise=page.waitForResponse((response)=>response.url().includes("/api/conversations/") && response.url().endsWith("/analyses") && response.request().method()==="POST");
 await page.getByRole("button",{name:"Send question",exact:true}).click();
 const response=await responsePromise;expect(response.status()).toBe(200);const runId=z.uuid().parse(response.headers()["x-run-id"]);
 await expect(page.getByRole("heading",{name:"Answer",exact:true})).toBeVisible({timeout:300000});
 const runResponse=await page.request.get(`/api/analyses/${runId}`);const run=z.object({status:z.string(),error_code:z.string().nullable(),briefId:z.string().nullable()}).parse(await runResponse.json());
 expect(run.status,JSON.stringify(run)).toBe("complete");
 await expect(page.getByRole("heading",{name:"Answer",exact:true})).toBeVisible();
 await expect(page.getByRole("complementary",{name:"Evidence sources"})).toBeVisible();
 const citation=page.getByRole("link",{name:/^\[S:/}).first();await expect(citation).toBeVisible();await citation.click();
 const evidence=page.getByRole("complementary",{name:"Evidence sources"}).locator("section").first();await expect(evidence.locator("blockquote")).toBeVisible();
 await page.screenshot({path:"test-results/reuse-brief.png",fullPage:true});
 await page.reload();await expect(page.getByRole("heading",{name:"Answer",exact:true})).toBeVisible();
 await page.getByLabel("Follow-up question",{exact:true}).fill("How would you adapt that rollout for a smaller team while keeping the no-downtime constraint?");
 const followup=page.waitForResponse((response)=>response.url().includes("/api/conversations/") && response.url().endsWith("/analyses") && response.request().method()==="POST");
 await page.getByRole("button",{name:"Send question",exact:true}).click();
 const followupResponse=await followup;expect(followupResponse.status()).toBe(200);const followupId=z.uuid().parse(followupResponse.headers()["x-run-id"]);
 await expect(page.getByRole("heading",{name:"Answer",exact:true})).toHaveCount(2,{timeout:300000});
 const savedFollowup=await page.request.get(`/api/analyses/${followupId}`);expect(z.object({status:z.string()}).parse(await savedFollowup.json()).status).toBe("complete");
});
