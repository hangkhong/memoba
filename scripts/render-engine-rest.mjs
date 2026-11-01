// Renders the landing page's engine diagram at rest and saves it as public/landing/engine-rest-{wide,tall}.png.
// The page shows these stills before the canvas paints and when JavaScript is off, so run this again after any change to the scene.
// Usage: start the app, then `MEMOBA_URL=http://localhost:3000 npm run landing:rest-frames`.
// Set PLAYWRIGHT_CHANNEL=chrome to use an installed Chrome instead of the Playwright download.
import { chromium } from "@playwright/test";

const origin = process.env.MEMOBA_URL ?? "http://localhost:3000";
const frames = [
  { name: "wide", width: 1440, height: 900 },
  { name: "tall", width: 390, height: 844 },
];

const browser = await chromium.launch({ channel: process.env.PLAYWRIGHT_CHANNEL });
try {
  for (const { name, width, height } of frames) {
    const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1.5, reducedMotion: "reduce" });
    await page.goto(origin);
    const canvas = page.locator("#engine canvas");
    await canvas.scrollIntoViewIfNeeded();
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(500);
    const path = `public/landing/engine-rest-${name}.png`;
    await canvas.screenshot({ path });
    console.log(`wrote ${path}`);
    await page.close();
  }
} finally {
  await browser.close();
}
