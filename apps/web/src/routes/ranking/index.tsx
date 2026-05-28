import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { toPng } from "html-to-image";
import { ArrowLeft } from "lucide-react";
import { useRef } from "react";

import { useTRPC } from "@/utils/trpc";
import { TIER_CONFIG } from "./_utils/tier";
import { RankRow } from "./_components/rank-row";
import { SectionLabel } from "./_components/section-label";
import { SharePoster } from "./_components/share-poster";
import { StatsGrid } from "./_components/stats-grid";
import { TierRow } from "./_components/tier-row";

export const Route = createFileRoute("/ranking/")({
  component: RankingComponent,
});

export function RankingComponent() {
  const navigate = useNavigate();
  const trpc = useTRPC();
  const posterRef = useRef<HTMLDivElement>(null);

  const ranking = useQuery(trpc.ranking.top10.queryOptions());

  if (ranking.isLoading) {
    return (
      <div className="absolute inset-0 flex items-center justify-center bg-[#0a0418]">
        <span
          style={{
            fontFamily: '"JetBrains Mono", monospace',
            color: "#ff2e88",
            fontSize: 14,
            letterSpacing: "0.2em",
          }}
        >
          LOADING...
        </span>
      </div>
    );
  }

  if (ranking.isError || !ranking.data) {
    return (
      <div className="absolute inset-0 flex items-center justify-center bg-[#0a0418]">
        <span style={{ color: "#ff4444", fontFamily: '"Noto Sans JP", sans-serif' }}>
          エラーが発生しました。再読み込みしてください。
        </span>
      </div>
    );
  }

  const top10 = ranking.data;

  const tierGroups: Record<string, typeof top10> = { S: [], A: [], B: [], C: [], D: [] };
  for (const idol of top10) {
    const tier =
      TIER_CONFIG.find((t) => idol.eloRating >= t.minElo) ?? TIER_CONFIG[TIER_CONFIG.length - 1];
    tierGroups[tier.label].push(idol);
  }

  async function handleSaveImage() {
    if (!posterRef.current) return;
    const dataUrl = await toPng(posterRef.current);
    const link = document.createElement("a");
    link.download = "oshi-ranking.png";
    link.href = dataUrl;
    link.click();
  }

  function handleShareX() {
    const text =
      "全体推しランキング TOP5\n" +
      top10
        .slice(0, 5)
        .map((idol) => `${idol.rank}位: ${idol.name} (${idol.group})`)
        .join("\n");
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&hashtags=推し活バトル`;
    window.open(url, "_blank");
  }

  return (
    <div
      className="absolute inset-0 overflow-y-auto bg-[#0a0418] text-white"
      style={{ scrollbarWidth: "none" }}
    >
      {/* Hero header */}
      <div
        className="relative px-6 pb-8 pt-6"
        style={{
          background:
            "radial-gradient(ellipse at 50% 0%, #ff2e8833 0%, transparent 60%), linear-gradient(180deg, #1a0830 0%, #0a0418 100%)",
          borderBottom: "1px solid #9d4dff44",
        }}
      >
        <button
          type="button"
          onClick={() => navigate({ to: "/" })}
          className="mb-7 inline-flex items-center gap-2 arcade-chip"
        >
          <ArrowLeft aria-hidden="true" size={13} />
          BACK
        </button>
        <div
          style={{
            fontFamily: '"Bungee", monospace',
            fontSize: "clamp(36px, 10vw, 48px)",
            lineHeight: 0.9,
            textShadow: "0 0 16px #9d4dff, 4px 4px 0 #ff2e88",
          }}
        >
          GLOBAL RANK
        </div>
        <p
          className="mt-2"
          style={{
            fontFamily: '"Noto Sans JP", sans-serif',
            fontSize: 12,
            color: "rgba(255,255,255,0.6)",
          }}
        >
          みんなの投票で決まる全体ランキング
        </p>
      </div>

      {/* 01 TOP 10 */}
      <SectionLabel n="01" label="TOP 10" />
      <div className="flex flex-col gap-2.5 px-4 pb-6">
        {top10.map((idol) => (
          <RankRow key={idol.id} idol={idol} />
        ))}
      </div>

      {/* 02 TIER LIST */}
      <SectionLabel n="02" label="TIER LIST" />
      <div className="flex flex-col gap-2 px-4 pb-6">
        {TIER_CONFIG.map(({ label, color }) => {
          const idols = tierGroups[label];
          if (!idols || idols.length === 0) return null;
          return <TierRow key={label} label={label} color={color} idols={idols} />;
        })}
      </div>

      {/* 03 STATS */}
      <SectionLabel n="03" label="STATS" />
      <div className="px-4 pb-6">
        <StatsGrid top10={top10} />
      </div>

      {/* 04 SHARE CARD */}
      <SectionLabel n="04" label="SHARE CARD" />
      <div className="px-6 pb-6">
        <SharePoster top10={top10} posterRef={posterRef} />
      </div>

      {/* CTAs */}
      <div className="flex flex-col gap-3 px-4 pb-10">
        <button
          type="button"
          onClick={handleShareX}
          style={{
            height: 56,
            border: "none",
            cursor: "pointer",
            background: "linear-gradient(180deg, #ff2e88 0%, #9d4dff 100%)",
            color: "#0a0418",
            fontFamily: '"Bungee", monospace',
            fontSize: 16,
            letterSpacing: "0.12em",
            borderRadius: 4,
            boxShadow: "0 0 20px #ff2e8899, 0 4px 0 #000",
          }}
        >
          ↗ X でシェア
        </button>
        <button
          type="button"
          onClick={handleSaveImage}
          style={{
            height: 48,
            cursor: "pointer",
            background: "transparent",
            color: "#fff",
            border: "1px solid #9d4dff",
            fontFamily: '"Bungee", monospace',
            fontSize: 13,
            letterSpacing: "0.16em",
            borderRadius: 4,
            boxShadow: "inset 0 0 12px #9d4dff33",
          }}
        >
          ↓ 画像を保存
        </button>
        <button
          type="button"
          onClick={() => navigate({ to: "/" })}
          style={{
            height: 48,
            cursor: "pointer",
            background: "transparent",
            color: "rgba(255,255,255,0.5)",
            border: "1px solid rgba(255,255,255,0.2)",
            fontFamily: '"Bungee", monospace',
            fontSize: 13,
            letterSpacing: "0.16em",
            borderRadius: 4,
          }}
        >
          ↻ PLAY AGAIN
        </button>
      </div>

      <div
        className="pb-16 text-center"
        style={{
          fontFamily: '"JetBrains Mono", monospace',
          fontSize: 9,
          color: "rgba(255,255,255,0.3)",
          letterSpacing: "0.2em",
        }}
      >
        — GAME OVER —
      </div>

      <div className="arcade-scanlines" style={{ opacity: 0.06 }} />
    </div>
  );
}
