import { type Browser } from "playwright";

const CHECKPOINT_TIMEOUT_MS = 60_000;

export async function fetchRenderedHtml(browser: Browser, url: string): Promise<string> {
  const page = await browser.newPage();
  try {
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60_000 });

    // Vercel Security Checkpoint を通過するまでポーリング
    // waitForFunction はナビゲーション中に実行コンテキストが破棄されると例外を投げるため、
    // title を 1 秒おきに取得する方式に変更
    const deadline = Date.now() + CHECKPOINT_TIMEOUT_MS;
    while (Date.now() < deadline) {
      try {
        const title = await page.title();
        if (!title.includes("Checkpoint")) break;
      } catch {
        // ナビゲーション中は title 取得が失敗することがあるので無視
      }
      await page.waitForTimeout(1_000);
    }

    await page.waitForLoadState("networkidle", { timeout: 30_000 });
    return await page.content();
  } finally {
    await page.close();
  }
}
