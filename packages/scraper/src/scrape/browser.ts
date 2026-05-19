import { type Browser } from "playwright";

export async function fetchRenderedHtml(browser: Browser, url: string): Promise<string> {
  const page = await browser.newPage();
  try {
    await page.goto(url, { waitUntil: "networkidle", timeout: 60_000 });
    // Vercel Security Checkpoint を通過するまで待機
    await page.waitForFunction(() => !document.title.includes("Checkpoint"), { timeout: 30_000 });
    await page.waitForLoadState("networkidle");
    return page.content();
  } finally {
    await page.close();
  }
}
