import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Play, Trophy } from "lucide-react";
import { useMemo } from "react";

import { getVoteHistory, type VoteHistoryEntry } from "@/lib/vote-history";

export const Route = createFileRoute("/history")({
  component: HistoryComponent,
});

export function HistoryComponent() {
  const navigate = useNavigate();
  const history = useMemo(() => getVoteHistory(), []);

  return (
    <div className="absolute inset-0 overflow-y-auto bg-[#0a0418] text-white">
      <div
        className="relative px-6 pb-7 pt-6"
        style={{
          background:
            "radial-gradient(ellipse at 50% 0%, #fff20022 0%, transparent 58%), linear-gradient(180deg, #1a0830 0%, #0a0418 100%)",
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
        <h1
          aria-label="MY HISTORY"
          className="m-0 leading-none"
          style={{
            fontFamily: '"Bungee", monospace',
            fontSize: "clamp(42px, 12vw, 56px)",
            color: "#fff",
            textShadow: "0 0 16px #9d4dff, 4px 4px 0 #ff2e88",
          }}
        >
          MY
          <br />
          HISTORY
        </h1>
        <p
          className="mt-3"
          style={{
            fontFamily: '"Noto Sans JP", sans-serif',
            fontSize: 12,
            color: "rgba(255,255,255,0.62)",
            letterSpacing: "0.06em",
          }}
        >
          このブラウザに保存された投票履歴
        </p>
      </div>

      <div className="px-4 py-5">
        {history.length === 0 ? (
          <EmptyHistory onStart={() => navigate({ to: "/battle" })} />
        ) : (
          <div className="flex flex-col gap-2.5" aria-label="自分の過去の投票履歴">
            {history.map((entry, index) => (
              <HistoryRow
                key={`${entry.votedAt}-${entry.winner.id}-${entry.loser.id}`}
                entry={entry}
                index={index}
              />
            ))}
          </div>
        )}
      </div>

      <div className="arcade-scanlines" style={{ opacity: 0.06 }} />
    </div>
  );
}

function EmptyHistory({ onStart }: { onStart: () => void }) {
  return (
    <div
      className="flex min-h-[300px] flex-col items-center justify-center px-5 text-center"
      style={{
        border: "1px dashed #9d4dff88",
        borderRadius: 4,
        background: "rgba(255,255,255,0.03)",
        boxShadow: "inset 0 0 24px #9d4dff22",
      }}
    >
      <Trophy aria-hidden="true" size={34} color="#fff200" />
      <div
        className="mt-4"
        style={{
          fontFamily: '"Bungee", monospace',
          fontSize: 20,
          color: "#fff",
          textShadow: "0 0 10px #ff2e88",
        }}
      >
        まだ投票履歴がありません
      </div>
      <p
        className="mt-2"
        style={{
          fontFamily: '"Noto Sans JP", sans-serif',
          fontSize: 12,
          color: "rgba(255,255,255,0.58)",
          lineHeight: 1.7,
        }}
      >
        10ラウンドのバトルで選んだ結果が、ここに新しい順で残ります。
      </p>
      <button
        type="button"
        onClick={onStart}
        className="mt-5 inline-flex h-12 items-center gap-2 px-5"
        style={{
          border: "none",
          borderRadius: 4,
          background: "linear-gradient(180deg, #ff2e88 0%, #9d4dff 100%)",
          color: "#0a0418",
          cursor: "pointer",
          fontFamily: '"Bungee", monospace',
          fontSize: 13,
          letterSpacing: "0.12em",
          boxShadow: "0 0 18px #ff2e8899, 0 4px 0 #000",
        }}
      >
        <Play aria-hidden="true" size={15} fill="currentColor" />
        PLAY BATTLE
      </button>
    </div>
  );
}

function HistoryRow({ entry, index }: { entry: VoteHistoryEntry; index: number }) {
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
        <div
          className="truncate"
          style={{
            fontFamily: '"Bungee", monospace',
            fontSize: 18,
            color: "#fff",
            letterSpacing: "0.02em",
          }}
        >
          {entry.winner.name}
        </div>
        <div
          className="mt-1 truncate"
          style={{
            fontFamily: '"Noto Sans JP", sans-serif',
            fontSize: 12,
            color: "rgba(255,255,255,0.7)",
          }}
        >
          {entry.loser.name} に勝利
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
