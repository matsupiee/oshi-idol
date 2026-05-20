import * as cheerio from "cheerio";

export interface IdolListItem {
  naviIdolId: string;
  url: string;
}

export function parseIdolList(html: string): IdolListItem[] {
  const $ = cheerio.load(html);
  const items: IdolListItem[] = [];
  const seen = new Set<string>();

  $("a[href]").each((_, el) => {
    const href = $(el).attr("href") ?? "";
    const match = href.match(/\/idol\/([a-z0-9-]+)$/);
    if (match?.[1] && !seen.has(match[1])) {
      seen.add(match[1]);
      items.push({
        naviIdolId: match[1],
        url: `https://navi-idol.com/idol/${match[1]}`,
      });
    }
  });

  return items;
}
