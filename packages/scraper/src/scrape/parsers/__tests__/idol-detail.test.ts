import { readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { describe, expect, test } from "bun:test";

import { parseIdolDetail } from "../idol-detail.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));
const fixture = (file: string) => readFileSync(join(__dirname, "../__fixtures__", file), "utf-8");

describe("parseIdolDetail", () => {
  test("名前・グループを抽出できる", () => {
    const result = parseIdolDetail(fixture("idol-detail.html"));

    expect(result.name).toBe("テストアイドルA");
    expect(result.group).toBe("テストグループA");
  });

  test("idol 画像URLを抽出できる（agent画像は含まない）", () => {
    const result = parseIdolDetail(fixture("idol-detail.html"));

    expect(result.imageUrls).toHaveLength(2);
    expect(result.imageUrls[0]).toBe(
      "https://vbtjlshykdswgsmmoclj.supabase.co/storage/v1/object/public/images/idol/test-uuid-0001.webp",
    );
    expect(result.imageUrls[1]).toBe(
      "https://vbtjlshykdswgsmmoclj.supabase.co/storage/v1/object/public/images/idol/test-uuid-0002.webp",
    );
  });

  test("画像URLが重複しない", () => {
    const html = `
      <h1 class="font-bold text-xl md:text-3xl text-left">重複テスト | グループ</h1>
      <img class="z-[2] object-contain" srcset="/_next/image?url=https%3A%2F%2Fvbtjlshykdswgsmmoclj.supabase.co%2Fstorage%2Fv1%2Fobject%2Fpublic%2Fimages%2Fidol%2Fdupe.webp&amp;w=640 640w, /_next/image?url=https%3A%2F%2Fvbtjlshykdswgsmmoclj.supabase.co%2Fstorage%2Fv1%2Fobject%2Fpublic%2Fimages%2Fidol%2Fdupe.webp&amp;w=1080 1080w"/>
    `;
    const result = parseIdolDetail(html);
    expect(result.imageUrls).toHaveLength(1);
  });

  test("| 区切りのないH1でも name に全文が入り group は空文字になる", () => {
    const html = `<h1 class="font-bold text-xl md:text-3xl text-left">ソロアイドル</h1>`;
    const result = parseIdolDetail(html);
    expect(result.name).toBe("ソロアイドル");
    expect(result.group).toBe("");
  });
});
