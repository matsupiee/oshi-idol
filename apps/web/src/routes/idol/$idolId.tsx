import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";

import { useTRPC } from "@/utils/trpc";
import { getTier } from "../ranking/_utils/tier";

export const Route = createFileRoute("/idol/$idolId")({
  component: IdolDetailComponent,
});

export function IdolDetailComponent() {
  const navigate = useNavigate();
  const { idolId } = Route.useParams();
  const trpc = useTRPC();

  const query = useQuery(trpc.idols.byId.queryOptions({ id: idolId }));

  if (query.isLoading) {
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

  if (query.isError || !query.data) {
    return (
      <div className="absolute inset-0 flex items-center justify-center bg-[#0a0418]">
        <span style={{ color: "#ff4444", fontFamily: '"Noto Sans JP", sans-serif' }}>
          アイドルが見つかりませんでした。
        </span>
      </div>
    );
  }

  const idol = query.data;
  const tier = getTier(idol.eloRating);
  const mainPhoto = idol.photos.find((p) => p.sortOrder === 0) ?? idol.photos[0] ?? null;

  return (
    <div
      className="absolute inset-0 overflow-y-auto bg-[#0a0418] text-white"
      style={{ scrollbarWidth: "none" }}
    >
      {/* Back button */}
      <div
        className="relative px-5 pt-5 pb-0"
        style={{
          background:
            "radial-gradient(ellipse at 50% 0%, #ff2e8822 0%, transparent 60%), linear-gradient(180deg, #1a0830 0%, #0a0418 100%)",
        }}
      >
        <button
          type="button"
          onClick={() => navigate({ to: -1 as unknown as string })}
          className="inline-flex items-center gap-2 arcade-chip"
        >
          <ArrowLeft aria-hidden="true" size={13} />
          BACK
        </button>
      </div>

      {/* Hero banner */}
      <div className="relative overflow-hidden" style={{ height: 280 }}>
        {mainPhoto ? (
          <img
            src={mainPhoto.imageUrl}
            alt={idol.name}
            className="absolute inset-0 h-full w-full object-cover"
          />
        ) : (
          <div
            className="absolute inset-0"
            style={{
              background: `linear-gradient(135deg, ${tier.color} 0%, #0a0418 100%)`,
            }}
          />
        )}
        {/* Gradient overlay */}
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(180deg, rgba(10,4,24,0.2) 0%, rgba(10,4,24,0.7) 60%, #0a0418 100%)",
          }}
        />
        {/* Name overlay */}
        <div className="absolute bottom-0 left-0 right-0 px-5 pb-5">
          <div
            style={{
              fontFamily: '"Bungee", monospace',
              fontSize: "clamp(28px, 8vw, 40px)",
              lineHeight: 0.95,
              color: "#fff",
              textShadow: `0 0 16px ${tier.color}, 3px 3px 0 rgba(0,0,0,0.6)`,
              letterSpacing: "0.02em",
            }}
          >
            {idol.name.toUpperCase()}
          </div>
          <div
            className="mt-1"
            style={{
              fontFamily: '"Noto Sans JP", sans-serif',
              fontSize: 13,
              color: "rgba(255,255,255,0.7)",
            }}
          >
            {idol.name}
          </div>
          <div
            style={{
              fontFamily: '"JetBrains Mono", monospace',
              fontSize: 11,
              letterSpacing: "0.1em",
              color: "rgba(255,255,255,0.45)",
            }}
          >
            {idol.group}
          </div>
        </div>
      </div>

      {/* ELO + Tier */}
      <div
        className="flex items-center justify-between px-5 py-4"
        style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}
      >
        <div className="flex items-baseline gap-2">
          <span
            style={{
              fontFamily: '"JetBrains Mono", monospace',
              fontSize: 32,
              fontWeight: 700,
              color: tier.color,
              textShadow: `0 0 10px ${tier.color}88`,
            }}
          >
            {idol.eloRating}
          </span>
          <span
            style={{
              fontFamily: '"JetBrains Mono", monospace',
              fontSize: 11,
              color: "rgba(255,255,255,0.4)",
              letterSpacing: "0.1em",
            }}
          >
            ELO
          </span>
        </div>
        <span
          style={{
            fontFamily: '"JetBrains Mono", monospace',
            fontSize: 13,
            fontWeight: 700,
            letterSpacing: "0.15em",
            color: tier.color,
            border: `1px solid ${tier.color}`,
            borderRadius: 3,
            padding: "3px 10px",
            boxShadow: `0 0 8px ${tier.color}44`,
          }}
        >
          {tier.label} TIER
        </span>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 px-5 py-5" style={{ gap: 10 }}>
        {(
          [
            { value: idol.wins, label: "WINS", color: "#9d4dff" },
            { value: idol.losses, label: "LOSSES", color: "#ff4444" },
            { value: `${Math.round(idol.winRate * 100)}%`, label: "WIN RATE", color: "#ff2e88" },
          ] as const
        ).map(({ value, label, color }) => (
          <div
            key={label}
            className="flex flex-col items-center justify-center py-4"
            style={{
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.09)",
              borderRadius: 4,
            }}
          >
            <div
              style={{
                fontFamily: '"JetBrains Mono", monospace',
                fontSize: 22,
                fontWeight: 700,
                color,
                textShadow: `0 0 8px ${color}66`,
              }}
            >
              {value}
            </div>
            <div
              style={{
                fontFamily: '"JetBrains Mono", monospace',
                fontSize: 9,
                letterSpacing: "0.12em",
                color: "rgba(255,255,255,0.4)",
                marginTop: 4,
              }}
            >
              {label}
            </div>
          </div>
        ))}
      </div>

      <div className="arcade-scanlines" style={{ opacity: 0.06 }} />
    </div>
  );
}
