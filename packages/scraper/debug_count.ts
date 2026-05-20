import { chromium } from "playwright";
import { fetchRenderedHtml } from "./src/scrape/browser";
import { parseIdolList } from "./src/scrape/parsers/idol-list";

const browser = await chromium.launch({ headless: true });
try {
  let page = 0;
  let total = 0;
  while (true) {
    const html = await fetchRenderedHtml(browser, `https://navi-idol.com/idol?page=${page}`);
    const items = parseIdolList(html);
    if (items.length === 0) {
      console.log(`page ${page}: empty → 終了`);
      break;
    }
    total += items.length;
    console.log(`page ${page}: ${items.length}件 (累計 ${total})`);
    page++;
  }
  console.log(`\n合計: ${total}件`);
} finally {
  await browser.close();
}
