import * as cheerio from "cheerio";

export interface IdolDetail {
  name: string;
  group: string;
  imageUrls: string[];
}

export function parseIdolDetail(html: string): IdolDetail {
  const $ = cheerio.load(html);

  const h1Text = $("h1").first().text().trim();
  const separatorIdx = h1Text.indexOf(" | ");
  const name = separatorIdx >= 0 ? h1Text.slice(0, separatorIdx).trim() : h1Text;
  const group = separatorIdx >= 0 ? h1Text.slice(separatorIdx + 3).trim() : "";

  const imageUrls: string[] = [];

  $("img[srcset]").each((_, el) => {
    const srcset = $(el).attr("srcset") ?? "";
    // Next.js image URL pattern: /_next/image?url=ENCODED_URL&w=...
    // srcset に複数解像度が含まれるため最初の url= のみ取得
    const match = srcset.match(/url=([^&\s,]+)/);
    if (!match?.[1]) return;

    const decoded = decodeURIComponent(match[1]);
    // /images/idol/ のみ対象（/images/agent/, /images/footer/ は除外）
    if (decoded.includes("/images/idol/")) {
      imageUrls.push(decoded);
    }
  });

  return {
    name,
    group,
    imageUrls: [...new Set(imageUrls)],
  };
}
