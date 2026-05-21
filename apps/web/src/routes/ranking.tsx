import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { toPng } from "html-to-image";
import { useRef } from "react";

import { useTRPC } from "@/utils/trpc";

export const Route = createFileRoute("/ranking")({
  component: RankingComponent,
});

const TIER_CONFIG: { label: string; minElo: number; color: string }[] = [
  { label: "S", minElo: 1700, color: "#ff2e88" },
  { label: "A", minElo: 1600, color: "#fff200" },
  { label: "B", minElo: 1500, color: "#9d4dff" },
  { label: "C", minElo: 1400, color: "#00f0ff" },
  { label: "D", minElo: 0, color: "#475569" },
];

function getTier(elo: number) {
  return TIER_CONFIG.find((t) => elo >= t.minElo) ?? TIER_CONFIG[TIER_CONFIG.length - 1];
}

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
    const tier = getTier(idol.eloRating);
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
        className="relative px-6 pb-8 pt-16"
        style={{
          background:
            "radial-gradient(ellipse at 50% 0%, #ff2e8833 0%, transparent 60%), linear-gradient(180deg, #1a0830 0%, #0a0418 100%)",
          borderBottom: "1px solid #9d4dff44",
        }}
      >
        <div className="mb-4 flex items-center justify-between">
          <span className="arcade-chip">OVERALL</span>
          <span className="arcade-chip">{top10.length} IDOLS</span>
        </div>
        <div
          style={{
            fontFamily: '"Bungee", monospace',
            fontSize: "clamp(36px, 10vw, 48px)",
            lineHeight: 0.9,
            textShadow: "0 0 16px #9d4dff, 4px 4px 0 #ff2e88",
          }}
        >
          OVERALL
          <br />
          OSHI RANK
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

// ── SectionLabel ─────────────────────────────────────────────────

function SectionLabel({ n, label }: { n: string; label: string }) {
  return (
    <div
      className="mb-4 flex items-center gap-2.5 px-4 py-3"
      style={{
        borderTop: "1px solid #9d4dff33",
        borderBottom: "1px solid #9d4dff33",
        background: "linear-gradient(90deg, #9d4dff1a 0%, transparent 100%)",
      }}
    >
      <span
        style={{
          fontFamily: '"JetBrains Mono", monospace',
          fontSize: 10,
          letterSpacing: "0.2em",
          color: "#ff2e88",
        }}
      >
        // {n}
      </span>
      <span
        style={{
          fontFamily: '"Bungee", monospace',
          fontSize: 18,
          letterSpacing: "0.08em",
          color: "#fff",
          textShadow: "0 0 8px #ff2e88",
        }}
      >
        {label}
      </span>
    </div>
  );
}

// ── RankRow ──────────────────────────────────────────────────────

interface RankIdol {
  id: string;
  rank: number;
  name: string;
  group: string;
  eloRating: number;
  winRate: number;
  wins: number;
  losses: number;
  photo: { id: string; imageUrl: string } | { id: null; imageUrl: null } | null;
}

function RankRow({ idol }: { idol: RankIdol }) {
  const isTop3 = idol.rank <= 3;
  const tier = getTier(idol.eloRating);

  return (
    <div
      className="relative flex items-center gap-3"
      style={{
        padding: isTop3 ? 10 : 8,
        background: isTop3
          ? `linear-gradient(90deg, ${tier.color}22 0%, transparent 70%)`
          : "rgba(255,255,255,0.03)",
        border: isTop3 ? `1px solid ${tier.color}66` : "1px solid rgba(255,255,255,0.06)",
        borderRadius: 4,
        boxShadow: isTop3 ? `0 0 16px ${tier.color}33` : "none",
      }}
    >
      {/* Rank number */}
      <div
        className="w-12 flex-shrink-0 text-center"
        style={{
          fontFamily: '"Bungee", monospace',
          fontSize: isTop3 ? 30 : 22,
          color: isTop3 ? tier.color : "rgba(255,255,255,0.4)",
          textShadow: isTop3 ? `0 0 10px ${tier.color}` : "none",
        }}
      >
        {String(idol.rank).padStart(2, "0")}
      </div>

      {/* Portrait thumb */}
      <div
        className="relative flex-shrink-0 overflow-hidden"
        style={{
          width: isTop3 ? 72 : 56,
          height: isTop3 ? 72 : 56,
          borderRadius: 4,
          border: `1px solid ${tier.color}88`,
        }}
      >
        {idol.photo?.imageUrl ? (
          <img src={idol.photo.imageUrl} alt={idol.name} className="h-full w-full object-cover" />
        ) : (
          <div
            className="flex h-full w-full items-center justify-center"
            style={{
              background: `linear-gradient(135deg, ${tier.color} 0%, #0a0418 100%)`,
            }}
          >
            <span style={{ fontSize: 20, opacity: 0.6, color: "#fff" }}>♪</span>
          </div>
        )}
      </div>

      {/* Name block */}
      <div className="min-w-0 flex-1">
        <div
          className="overflow-hidden text-ellipsis whitespace-nowrap"
          style={{
            fontFamily: '"Bungee", monospace',
            fontSize: isTop3 ? 22 : 17,
            color: "#fff",
            letterSpacing: "0.02em",
          }}
        >
          {idol.name.toUpperCase()}
        </div>
        <div className="mt-0.5 flex items-center gap-2">
          <span
            style={{
              fontFamily: '"Noto Sans JP", sans-serif',
              fontSize: 12,
              fontWeight: 700,
              color: "rgba(255,255,255,0.85)",
            }}
          >
            {idol.name}
          </span>
          <span
            style={{
              fontFamily: '"JetBrains Mono", monospace',
              fontSize: 9,
              letterSpacing: "0.1em",
              color: "rgba(255,255,255,0.4)",
            }}
          >
            {idol.group}
          </span>
        </div>
      </div>

      {/* ELO + tier */}
      <div className="flex flex-shrink-0 flex-col items-end gap-1">
        <div
          style={{
            fontFamily: '"JetBrains Mono", monospace',
            fontSize: 13,
            fontWeight: 700,
            color: tier.color,
            textShadow: `0 0 6px ${tier.color}66`,
          }}
        >
          {idol.eloRating}
        </div>
        <span
          style={{
            fontFamily: '"JetBrains Mono", monospace',
            fontSize: 10,
            fontWeight: 600,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            color: tier.color,
            border: `1px solid ${tier.color}`,
            borderRadius: 2,
            padding: "1px 4px",
          }}
        >
          {tier.label}
        </span>
        <div
          style={{
            fontFamily: '"JetBrains Mono", monospace',
            fontSize: 9,
            color: "rgba(255,255,255,0.4)",
          }}
        >
          {Math.round(idol.winRate * 100)}%
        </div>
      </div>
    </div>
  );
}

// ── TierRow ──────────────────────────────────────────────────────

function TierRow({ label, color, idols }: { label: string; color: string; idols: RankIdol[] }) {
  return (
    <div className="flex items-stretch gap-2">
      <div
        className="flex w-14 flex-shrink-0 items-center justify-center rounded"
        style={{
          background: color,
          fontFamily: '"Bungee", monospace',
          fontSize: 28,
          color: "#0a0418",
          boxShadow: `0 0 12px ${color}80`,
        }}
      >
        {label}
      </div>
      <div
        className="flex flex-1 flex-wrap items-start gap-1.5 rounded p-1.5"
        style={{
          background: "rgba(255,255,255,0.03)",
          border: `1px solid ${color}55`,
        }}
      >
        {idols.map((idol) => (
          <div
            key={idol.id}
            className="relative overflow-hidden"
            style={{
              width: 44,
              height: 44,
              borderRadius: 3,
              border: `1px solid ${color}aa`,
            }}
          >
            {idol.photo?.imageUrl ? (
              <img
                src={idol.photo.imageUrl}
                alt={idol.name}
                className="h-full w-full object-cover"
              />
            ) : (
              <div
                className="flex h-full w-full items-center justify-center"
                style={{ background: `linear-gradient(135deg, ${color} 0%, #0a0418 100%)` }}
              >
                <span style={{ fontSize: 16, opacity: 0.5, color: "#fff" }}>♪</span>
              </div>
            )}
            <div
              className="absolute bottom-0 left-0 right-0 text-center"
              style={{
                padding: "1px 2px",
                fontFamily: '"JetBrains Mono", monospace',
                fontSize: 7,
                letterSpacing: "0.05em",
                color: "#fff",
                background: "rgba(0,0,0,0.6)",
              }}
            >
              {idol.name.slice(0, 4)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── StatsGrid ────────────────────────────────────────────────────

function StatsGrid({ top10 }: { top10: RankIdol[] }) {
  const groupCounts: Record<string, number> = {};
  for (const idol of top10) {
    groupCounts[idol.group] = (groupCounts[idol.group] ?? 0) + 1;
  }
  const topGroupEntry = Object.entries(groupCounts).sort((a, b) => b[1] - a[1])[0];
  const topGroup = topGroupEntry ? topGroupEntry[0] : "—";
  const topGroupCount = topGroupEntry ? topGroupEntry[1] : 0;

  const avgWinRate =
    top10.length > 0
      ? Math.round((top10.reduce((s, i) => s + i.winRate, 0) / top10.length) * 100)
      : 0;

  const cells = [
    { l: "TOP GROUP", v: topGroup, sub: `${topGroupCount}人がランクイン`, color: "#ff2e88" },
    { l: "RANKED", v: String(top10.length).padStart(2, "0"), sub: "idols", color: "#9d4dff" },
    { l: "AVG WIN RATE", v: `${avgWinRate}%`, sub: "top 10 average", color: "#fff200" },
    {
      l: "TOP ELO",
      v: String(top10[0]?.eloRating ?? 0),
      sub: top10[0]?.name ?? "—",
      color: "#00f0ff",
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-2">
      {cells.map((c) => (
        <div
          key={c.l}
          className="min-h-[88px] rounded p-3"
          style={{
            background: "rgba(255,255,255,0.03)",
            border: `1px solid ${c.color}55`,
          }}
        >
          <div
            style={{
              fontFamily: '"JetBrains Mono", monospace',
              fontSize: 9,
              letterSpacing: "0.2em",
              color: "rgba(255,255,255,0.5)",
            }}
          >
            {c.l}
          </div>
          <div
            className="mt-1.5 leading-tight"
            style={{
              fontFamily: '"Bungee", monospace',
              fontSize: 22,
              fontWeight: 700,
              color: c.color,
              textShadow: `0 0 8px ${c.color}66`,
            }}
          >
            {c.v}
          </div>
          <div
            className="mt-1.5"
            style={{
              fontFamily: '"JetBrains Mono", monospace',
              fontSize: 9,
              color: "rgba(255,255,255,0.4)",
            }}
          >
            {c.sub}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── SharePoster ──────────────────────────────────────────────────

function SharePoster({
  top10,
  posterRef,
}: {
  top10: RankIdol[];
  posterRef: React.RefObject<HTMLDivElement | null>;
}) {
  const top3 = top10.slice(0, 3);
  const rest = top10.slice(3, 10);

  return (
    <div
      ref={posterRef}
      className="relative overflow-hidden rounded"
      style={{
        aspectRatio: "9 / 16",
        background: "radial-gradient(ellipse at 50% 0%, #ff2e8855 0%, transparent 50%), #0a0418",
        border: "2px solid #ff2e88",
        boxShadow: "0 0 24px #ff2e8888, inset 0 0 40px #9d4dff44",
        padding: "14px",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Poster header */}
      <div className="mb-2 text-center">
        <div
          style={{
            fontFamily: '"JetBrains Mono", monospace',
            fontSize: 8,
            letterSpacing: "0.3em",
            color: "#ff2e88",
          }}
        >
          OVERALL TOP 10 · OSHI BATTLE
        </div>
        <div
          className="mt-1"
          style={{
            fontFamily: '"Bungee", monospace',
            fontSize: 22,
            lineHeight: 0.9,
            color: "#fff",
            textShadow: "0 0 8px #ff2e88, 2px 2px 0 #9d4dff",
          }}
        >
          全体推しランキング
        </div>
      </div>

      {/* TOP 3 podium */}
      <div className="mb-1.5 grid gap-1" style={{ gridTemplateColumns: "1fr 1.2fr 1fr" }}>
        {[top3[1], top3[0], top3[2]].map((idol, i) => {
          if (!idol) return <div key={i} />;
          const realRank = idol === top3[0] ? 1 : idol === top3[1] ? 2 : 3;
          const big = realRank === 1;
          const tier = getTier(idol.eloRating);
          return (
            <div
              key={idol.id}
              className="relative overflow-hidden"
              style={{
                aspectRatio: big ? "3/4" : "2.5/4",
                marginTop: big ? 0 : 16,
                border: `1.5px solid ${tier.color}`,
                boxShadow: `0 0 12px ${tier.color}88`,
              }}
            >
              {idol.photo?.imageUrl ? (
                <img
                  src={idol.photo.imageUrl}
                  alt={idol.name}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div
                  className="h-full w-full"
                  style={{
                    background: `linear-gradient(135deg, ${tier.color} 0%, #0a0418 100%)`,
                  }}
                />
              )}
              <div
                className="absolute left-0.5 top-0.5"
                style={{
                  fontFamily: '"Bungee", monospace',
                  fontSize: big ? 28 : 18,
                  color: tier.color,
                  textShadow: `0 0 8px ${tier.color}, 1px 1px 0 #000`,
                }}
              >
                {String(realRank).padStart(2, "0")}
              </div>
              <div
                className="absolute bottom-0 left-0 right-0 text-center"
                style={{
                  background: "linear-gradient(0deg, rgba(0,0,0,0.8), transparent)",
                  padding: "12px 4px 3px",
                  fontFamily: '"Bungee", monospace',
                  fontSize: big ? 12 : 10,
                  color: "#fff",
                  textShadow: `0 0 6px ${tier.color}`,
                }}
              >
                {idol.name.slice(0, 6).toUpperCase()}
              </div>
            </div>
          );
        })}
      </div>

      {/* 4–10 grid */}
      <div className="grid flex-1 grid-cols-4 content-start gap-0.5">
        {rest.map((idol, i) => {
          const tier = getTier(idol.eloRating);
          return (
            <div
              key={idol.id}
              className="relative overflow-hidden"
              style={{
                aspectRatio: "1/1",
                border: `1px solid ${tier.color}88`,
              }}
            >
              {idol.photo?.imageUrl ? (
                <img
                  src={idol.photo.imageUrl}
                  alt={idol.name}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div
                  className="h-full w-full"
                  style={{
                    background: `linear-gradient(135deg, ${tier.color} 0%, #0a0418 100%)`,
                  }}
                />
              )}
              <div
                className="absolute left-0.5 top-0.5"
                style={{
                  fontFamily: '"Bungee", monospace',
                  fontSize: 11,
                  color: "#fff",
                  textShadow: `0 0 4px ${tier.color}`,
                }}
              >
                {i + 4}
              </div>
              <div
                className="absolute bottom-0 left-0 right-0 text-center"
                style={{
                  padding: "1px 2px",
                  fontFamily: '"JetBrains Mono", monospace',
                  fontSize: 6,
                  letterSpacing: "0.05em",
                  color: "#fff",
                  background: "rgba(0,0,0,0.7)",
                }}
              >
                {idol.name.slice(0, 4)}
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div
        className="mt-1.5 text-center"
        style={{
          fontFamily: '"JetBrains Mono", monospace',
          fontSize: 7,
          letterSpacing: "0.25em",
          color: "rgba(255,255,255,0.5)",
        }}
      >
        OSHI-BATTLE / #推し選手権
      </div>
    </div>
  );
}
