export interface PageRange {
  pageFrom: number;
  pageTo: number;
}

export function parsePageRange(argv: string[]): PageRange {
  let pageFrom = 0;
  let pageTo = Infinity;

  for (const arg of argv) {
    const fromMatch = arg.match(/^--page-from=(\d+)$/);
    if (fromMatch) {
      pageFrom = parseInt(fromMatch[1]!, 10);
      continue;
    }
    const toMatch = arg.match(/^--page-to=(\d+)$/);
    if (toMatch) {
      pageTo = parseInt(toMatch[1]!, 10);
    }
  }

  return { pageFrom, pageTo };
}
