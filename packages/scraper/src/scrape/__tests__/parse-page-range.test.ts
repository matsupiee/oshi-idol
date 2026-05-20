import { expect, test } from "bun:test";

import { parsePageRange } from "../parse-page-range";

test("引数なしの場合はデフォルト値（0からInfinity）を返す", () => {
  const result = parsePageRange([]);
  expect(result).toEqual({ pageFrom: 0, pageTo: Infinity });
});

test("--page-from のみ指定した場合は page-to が Infinity になる", () => {
  const result = parsePageRange(["--page-from=3"]);
  expect(result).toEqual({ pageFrom: 3, pageTo: Infinity });
});

test("--page-to のみ指定した場合は page-from が 0 になる", () => {
  const result = parsePageRange(["--page-to=5"]);
  expect(result).toEqual({ pageFrom: 0, pageTo: 5 });
});

test("--page-from と --page-to を両方指定できる", () => {
  const result = parsePageRange(["--page-from=2", "--page-to=5"]);
  expect(result).toEqual({ pageFrom: 2, pageTo: 5 });
});

test("0ページ目から指定できる", () => {
  const result = parsePageRange(["--page-from=0", "--page-to=0"]);
  expect(result).toEqual({ pageFrom: 0, pageTo: 0 });
});
