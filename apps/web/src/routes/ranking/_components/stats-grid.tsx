import { type RankIdol } from "../_utils/tier";

export function StatsGrid({ top10 }: { top10: RankIdol[] }) {
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
