import { readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { describe, expect, test } from "bun:test";

import { parseIdolList } from "../idol-list.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));
const fixture = (file: string) => readFileSync(join(__dirname, "../__fixtures__", file), "utf-8");

describe("parseIdolList", () => {
  test("アイドルID・URLを重複なく抽出できる", () => {
    const result = parseIdolList(fixture("idol-list.html"));

    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({
      naviIdolId: "abc12345",
      url: "https://navi-idol.com/idol/abc12345",
    });
    expect(result[1]).toEqual({
      naviIdolId: "def67890",
      url: "https://navi-idol.com/idol/def67890",
    });
  });

  test("同じIDが複数 a タグに現れても1件にまとまる", () => {
    const html = `
      <a href="/idol/xyz99999">card</a>
      <a href="/idol/xyz99999">name</a>
    `;
    const result = parseIdolList(html);
    expect(result).toHaveLength(1);
    expect(result[0]?.naviIdolId).toBe("xyz99999");
  });

  test("ハイフンを含むIDを正しく抽出できる", () => {
    const html = `
      <a href="/idol/hananoi-kaho">card</a>
      <a href="/idol/hananoi-kaho">name</a>
      <a href="/idol/namae-nemu">card</a>
    `;
    const result = parseIdolList(html);
    expect(result).toHaveLength(2);
    expect(result[0]?.naviIdolId).toBe("hananoi-kaho");
    expect(result[1]?.naviIdolId).toBe("namae-nemu");
  });

  test("アイドルリンクが存在しないページでは空配列を返す", () => {
    const result = parseIdolList("<html><body><p>nothing here</p></body></html>");
    expect(result).toHaveLength(0);
  });
});
