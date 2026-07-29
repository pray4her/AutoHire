import { chromium } from "playwright";
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
await page.goto("http://localhost:3000/forgot-password", { waitUntil: "networkidle" });
await page.waitForTimeout(1200);
await page.screenshot({ path: ".scratch/forgot-desktop.png" });
await browser.close();
