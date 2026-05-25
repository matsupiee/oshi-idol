import { getTier, type RankIdol } from "../_utils/tier";

export function RankRow({ idol }: { idol: RankIdol }) {
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
