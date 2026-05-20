import { chromium } from "playwright";
import dotenv from "dotenv";

import { uploadBuffer, uploadJson } from "../r2";
import { fetchRenderedHtml } from "./browser";
import { parsePageRange } from "./parse-page-range";
import { parseIdolDetail } from "./parsers/idol-detail";
import { parseIdolList } from "./parsers/idol-list";

dotenv.config();

const BASE_URL = "https://navi-idol.com";
const DELAY_MS = 1500;

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function downloadImageBuffer(url: string): Promise<Buffer | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    return Buffer.from(await res.arrayBuffer());
  } catch {
    return null;
  }
}

async function processIdol(
  browser: Awaited<ReturnType<typeof chromium.launch>>,
  item: { naviIdolId: string; url: string },
  index: number,
  total: number,
): Promise<void> {
  console.log(`\n[${index + 1}/${total}] ${item.url}`);

  try {
    const html = await fetchRenderedHtml(browser, item.url);
    const detail = parseIdolDetail(html);

    const savedImages: Array<{ key: string; originalUrl: string }> = [];

    for (const [imgIdx, imgUrl] of detail.imageUrls.entries()) {
      const buffer = await downloadImageBuffer(imgUrl);
      if (!buffer) {
        console.warn(`  Skipped image: ${imgUrl}`);
        continue;
      }

      const ext = imgUrl.endsWith(".webp") ? "webp" : "jpg";
      const key = `idols/${item.naviIdolId}/images/${imgIdx}.${ext}`;
      await uploadBuffer(key, buffer, `image/${ext}`);
      savedImages.push({ key, originalUrl: imgUrl });
      console.log(`  Uploaded image[${imgIdx}]`);
    }

    const profileKey = `idols/${item.naviIdolId}/profile.json`;
    await uploadJson(profileKey, {
      naviIdolId: item.naviIdolId,
      name: detail.name,
      group: detail.group,
      sourceUrl: item.url,
      scrapedAt: new Date().toISOString(),
      images: savedImages,
    });

    console.log(`  Saved: ${detail.name} (${detail.group}), ${savedImages.length} images`);
  } catch (err) {
    console.warn(`  Failed: ${item.url}`, err);
  }

  await sleep(DELAY_MS);
}

async function main(): Promise<void> {
  const { pageFrom, pageTo } = parsePageRange(process.argv.slice(2));
  console.log(`Page range: ${pageFrom} to ${pageTo === Infinity ? "end" : pageTo}`);

  const browser = await chromium.launch({ headless: true });

  try {
    for (let page = pageFrom; page <= pageTo; page++) {
      console.log(`\nFetching list page ${page}...`);
      const html = await fetchRenderedHtml(browser, `${BASE_URL}/idol?page=${page}`);
      const items = parseIdolList(html);

      if (items.length === 0) {
        console.log(`Page ${page}: empty, stopping.`);
        break;
      }

      console.log(`  Found ${items.length} idols on page ${page}`);

      for (const [i, item] of items.entries()) {
        await processIdol(browser, item, i, items.length);
      }

      await sleep(DELAY_MS);
    }

    console.log("\nDone!");
  } finally {
    await browser.close();
  }
}

main().catch(console.error);
