import { Link } from "@tanstack/react-router";

import { VoteHistoryEntry } from "@/lib/vote-history";

function formatVoteTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat("ja-JP", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function HistoryRow({ entry, index }: { entry: VoteHistoryEntry; index: number }) {
  return (
    <article
      className="relative flex items-center gap-3 p-3"
      style={{
        background:
          index === 0
            ? "linear-gradient(90deg, #fff2001f 0%, rgba(255,255,255,0.03) 72%)"
            : "rgba(255,255,255,0.03)",
        border: index === 0 ? "1px solid #fff20066" : "1px solid rgba(255,255,255,0.07)",
        borderRadius: 4,
        boxShadow: index === 0 ? "0 0 16px #fff2002f" : "none",
      }}
    >
      <div
        className="flex h-12 w-12 flex-shrink-0 items-center justify-center"
        style={{
          border: "1px solid #ff2e8888",
          borderRadius: 4,
          background: "linear-gradient(135deg, #ff2e88 0%, #0a0418 100%)",
          color: "#fff",
          fontFamily: '"Bungee", monospace',
          fontSize: 18,
          textShadow: "0 0 8px #ff2e88",
        }}
      >
        {String(index + 1).padStart(2, "0")}
      </div>
      <div className="min-w-0 flex-1">
        <Link
          to="/idol/$idolId"
          params={{ idolId: entry.winner.id }}
          className="block truncate"
          style={{
            fontFamily: '"Bungee", monospace',
            fontSize: 18,
            color: "#fff",
            letterSpacing: "0.02em",
            textDecoration: "none",
          }}
        >
          {entry.winner.name}
        </Link>
        <div
          className="mt-1 truncate"
          style={{
            fontFamily: '"Noto Sans JP", sans-serif',
            fontSize: 12,
            color: "rgba(255,255,255,0.7)",
          }}
        >
          <Link
            to="/idol/$idolId"
            params={{ idolId: entry.loser.id }}
            style={{ color: "inherit", textDecoration: "none" }}
          >
            {entry.loser.name}
          </Link>
          {" に勝利"}
        </div>
        <div
          className="mt-1 truncate"
          style={{
            fontFamily: '"JetBrains Mono", monospace',
            fontSize: 9,
            color: "rgba(255,255,255,0.38)",
            letterSpacing: "0.08em",
          }}
        >
          {entry.winner.group} / {formatVoteTime(entry.votedAt)}
        </div>
      </div>
    </article>
  );
}
