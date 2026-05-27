import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { useMemo } from "react";

import { getVoteHistory } from "@/lib/vote-history";
import { EmptyHistory } from "./_components/empty-history";
import { HistoryRow } from "./_components/history-row";

export const Route = createFileRoute("/history/")({
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
