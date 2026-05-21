import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useRef, useState } from "react";

import { getSessionId } from "@/lib/session";
import { addVoteHistoryEntry, getVoteHistory, type VoteHistoryEntry } from "@/lib/vote-history";
import { useTRPC } from "@/utils/trpc";

export const Route = createFileRoute("/battle")({
  component: BattleComponent,
});

const MAX_VOTES = 10;

interface Burst {
  id: number;
  x: number;
  y: number;
}

export function BattleComponent() {
  const navigate = useNavigate();
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [voteCount, setVoteCount] = useState(0);
  const [voting, setVoting] = useState<string | null>(null);
  const [winnerIdx, setWinnerIdx] = useState<0 | 1 | null>(null);
  const [phase, setPhase] = useState<"idle" | "locked" | "exit">("idle");
  const [bursts, setBursts] = useState<Burst[]>([]);
  const [voteHistory, setVoteHistory] = useState<VoteHistoryEntry[]>(() => getVoteHistory());
  const burstIdRef = useRef(0);
  const exitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sessionId = getSessionId();

  const battlePair = useQuery(trpc.idols.battlePair.queryOptions({ sessionId }));
  const submitVote = useMutation(trpc.votes.submit.mutationOptions());

  const handleTap = useCallback(
    async (
      e: React.MouseEvent<HTMLButtonElement>,
      idx: 0 | 1,
      winner: IdolData,
      loser: IdolData,
    ) => {
      if (phase !== "idle" || voting) return;

      const winnerPhotoId = winner.photo?.id ?? null;
      const loserPhotoId = loser.photo?.id ?? null;
      const x = (e.clientX / window.innerWidth) * 100;
      const y = (e.clientY / window.innerHeight) * 100;
      const id = ++burstIdRef.current;
      setBursts((b) => [...b, { id, x, y }]);
      setWinnerIdx(idx);
      setPhase("locked");
      setVoting(winner.id);

      exitTimerRef.current = setTimeout(() => setPhase("exit"), 380);

      try {
        await submitVote.mutateAsync({
          winnerId: winner.id,
          loserId: loser.id,
          winnerPhotoId: winnerPhotoId ?? "",
          loserPhotoId: loserPhotoId ?? "",
          sessionId,
        });
        setVoteHistory(
          addVoteHistoryEntry({
            winner: {
              id: winner.id,
              name: winner.name,
              group: winner.group,
              photoId: winnerPhotoId,
            },
            loser: {
              id: loser.id,
              name: loser.name,
              group: loser.group,
              photoId: loserPhotoId,
            },
          }),
        );

        const newCount = voteCount + 1;
        setVoteCount(newCount);

        if (newCount >= MAX_VOTES) {
          navigate({ to: "/ranking" });
          return;
        }

        await queryClient.invalidateQueries({
          queryKey: trpc.idols.battlePair.queryKey({ sessionId }),
        });
      } catch {
        // ネットワークエラー時は idle に戻す
      } finally {
        if (exitTimerRef.current !== null) {
          clearTimeout(exitTimerRef.current);
          exitTimerRef.current = null;
        }
        setVoting(null);
        setWinnerIdx(null);
        setPhase("idle");
        setBursts([]);
      }
    },
    [phase, voting, voteCount, sessionId, submitVote, queryClient, navigate, trpc],
  );

  if (battlePair.isLoading) {
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

  if (battlePair.isError || !battlePair.data) {
    return (
      <div className="absolute inset-0 flex items-center justify-center bg-[#0a0418]">
        <span style={{ color: "#ff4444", fontFamily: '"Noto Sans JP", sans-serif' }}>
          エラーが発生しました。再読み込みしてください。
        </span>
      </div>
    );
  }

  const { idolA, idolB } = battlePair.data;

  return (
    <div className="absolute inset-0 overflow-hidden bg-[#0a0418] text-white">
      {/* HUD top */}
      <div className="absolute left-0 right-0 top-6 z-30 flex items-center gap-2 px-4">
        <span className="arcade-chip">
          ROUND {String(voteCount + 1).padStart(2, "0")}/{MAX_VOTES}
        </span>
        <div
          className="flex-1 overflow-hidden"
          style={{
            height: 4,
            borderRadius: 2,
            background: "rgba(255,255,255,0.1)",
            border: "1px solid #9d4dff66",
          }}
        >
          <div
            style={{
              height: "100%",
              width: `${(voteCount / MAX_VOTES) * 100}%`,
              background: "linear-gradient(90deg, #ff2e88, #9d4dff)",
              boxShadow: "0 0 8px #ff2e88",
              transition: "width 250ms ease",
            }}
          />
        </div>
      </div>

      {/* Panel A (top-left diagonal) */}
      <BattlePanel
        idol={idolA}
        position="top"
        state={phase === "idle" ? "idle" : winnerIdx === 0 ? "win" : "lose"}
        onTap={(e) => handleTap(e, 0, idolA, idolB)}
        disabled={phase !== "idle"}
      />

      {/* Panel B (bottom-right diagonal) */}
      <BattlePanel
        idol={idolB}
        position="bottom"
        state={phase === "idle" ? "idle" : winnerIdx === 1 ? "win" : "lose"}
        onTap={(e) => handleTap(e, 1, idolB, idolA)}
        disabled={phase !== "idle"}
      />

      {/* VS overlay — diagonal lightning bolt */}
      <div className="pointer-events-none absolute inset-0 z-[4]">
        <div
          style={{
            position: "absolute",
            left: "-10%",
            right: "-10%",
            top: "50%",
            height: 8,
            background: "linear-gradient(90deg, transparent, #ff2e88, #fff, #9d4dff, transparent)",
            transform: "translateY(-50%) rotate(-22deg)",
            boxShadow: "0 0 20px #ff2e88, 0 0 40px #9d4dff",
            opacity: 0.9,
          }}
        />
      </div>
      <div
        className="pointer-events-none absolute left-1/2 top-1/2 z-[6]"
        style={{
          transform: "translate(-50%, -50%) rotate(-22deg)",
          padding: "8px 20px",
          background: "#0a0418",
          border: "2px solid #ff2e88",
          boxShadow: "0 0 24px #ff2e88, inset 0 0 8px #9d4dff",
          fontFamily: '"Bungee", monospace',
          fontSize: 32,
          color: "#fff",
          letterSpacing: "0.06em",
          textShadow: "0 0 8px #ff2e88",
        }}
      >
        VS
      </div>

      {/* FX bursts */}
      {bursts.map((b) => (
        <HeartBurst
          key={b.id}
          x={b.x}
          y={b.y}
          onDone={() => setBursts((prev) => prev.filter((p) => p.id !== b.id))}
        />
      ))}

      {/* CRT scanlines */}
      <div className="arcade-scanlines" />

      <VoteHistoryPanel history={voteHistory} />

      {/* HUD bottom */}
      <div
        className="absolute bottom-6 left-0 right-0 z-30 text-center"
        style={{
          fontFamily: '"JetBrains Mono", monospace',
          fontSize: 10,
          letterSpacing: "0.2em",
          color: "rgba(255,255,255,0.4)",
        }}
      >
        TAP TO VOTE · 推しを選べ
      </div>
    </div>
  );
}

function VoteHistoryPanel({ history }: { history: VoteHistoryEntry[] }) {
  const recentHistory = history.slice(0, 3);

  if (recentHistory.length === 0) return null;

  return (
    <section
      aria-label="過去の投票結果"
      className="absolute bottom-14 left-4 z-30 w-[min(320px,calc(100%-2rem))]"
      style={{
        border: "1px solid rgba(255,255,255,0.18)",
        background: "rgba(10,4,24,0.72)",
        boxShadow: "0 0 18px rgba(255,46,136,0.26)",
        backdropFilter: "blur(10px)",
        padding: 10,
      }}
    >
      <h2
        style={{
          fontFamily: '"JetBrains Mono", monospace',
          fontSize: 10,
          letterSpacing: "0.12em",
          color: "#ff2e88",
          marginBottom: 8,
        }}
      >
        投票履歴
      </h2>
      <ol className="space-y-2">
        {recentHistory.map((entry) => (
          <li
            key={`${entry.votedAt}-${entry.winner.id}-${entry.loser.id}`}
            className="grid grid-cols-[1fr_auto] gap-2"
          >
            <div className="min-w-0">
              <div
                className="truncate"
                style={{
                  fontFamily: '"Noto Sans JP", sans-serif',
                  fontSize: 13,
                  fontWeight: 700,
                  color: "#fff",
                }}
              >
                {entry.winner.name}
              </div>
              <div
                className="truncate"
                style={{
                  fontFamily: '"Noto Sans JP", sans-serif',
                  fontSize: 11,
                  color: "rgba(255,255,255,0.64)",
                }}
              >
                {entry.loser.name} に勝利
              </div>
            </div>
            <span
              className="truncate"
              style={{
                fontFamily: '"JetBrains Mono", monospace',
                fontSize: 10,
                color: "rgba(255,255,255,0.48)",
                alignSelf: "center",
              }}
            >
              {entry.winner.group}
            </span>
          </li>
        ))}
      </ol>
    </section>
  );
}

// ── BattlePanel ──────────────────────────────────────────────────

interface IdolData {
  id: string;
  name: string;
  group: string;
  photo: { id: string; imageUrl: string } | { id: null; imageUrl: null } | null;
}

interface BattlePanelProps {
  idol: IdolData;
  position: "top" | "bottom";
  state: "idle" | "win" | "lose";
  onTap: (e: React.MouseEvent<HTMLButtonElement>) => void;
  disabled: boolean;
}

function BattlePanel({ idol, position, state, onTap, disabled }: BattlePanelProps) {
  const animClass =
    state === "win" ? "animate-panel-win" : state === "lose" ? "animate-panel-lose" : "";

  const clipPath =
    position === "top"
      ? "polygon(0 0, 100% 0, 100% 63%, 0 100%)"
      : "polygon(0 37%, 100% 0, 100% 100%, 0 100%)";

  const positionClass =
    position === "top"
      ? "absolute top-0 left-0 right-0 h-[60%]"
      : "absolute bottom-0 left-0 right-0 h-[60%]";

  return (
    <button
      type="button"
      onClick={onTap}
      disabled={disabled}
      className={`${positionClass} cursor-pointer overflow-hidden border-none bg-transparent p-0 ${animClass}`}
      style={{
        clipPath,
        transformOrigin: position === "top" ? "50% 30%" : "50% 70%",
      }}
    >
      {/* Portrait */}
      <div className="absolute inset-0">
        {idol.photo?.imageUrl ? (
          <img
            src={idol.photo.imageUrl}
            alt={idol.name}
            className="h-full w-full object-cover"
            style={{ objectPosition: "center 25%" }}
          />
        ) : (
          <div
            className="flex h-full w-full items-center justify-center"
            style={{
              background:
                position === "top"
                  ? "linear-gradient(135deg, #ff2e88 0%, #9d4dff 100%)"
                  : "linear-gradient(135deg, #9d4dff 0%, #00f0ff 100%)",
            }}
          >
            <span style={{ fontSize: 80, opacity: 0.2, color: "#fff" }}>♪</span>
          </div>
        )}
      </div>

      {/* Dark fade from cut edge */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            position === "top"
              ? "linear-gradient(180deg, transparent 40%, rgba(10,4,24,0.85) 100%)"
              : "linear-gradient(0deg, transparent 40%, rgba(10,4,24,0.85) 100%)",
        }}
      />

      {/* Inner glow from cut */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          boxShadow: position === "top" ? "inset 0 0 60px #ff2e8844" : "inset 0 0 60px #9d4dff44",
        }}
      />

      {/* Nameplate */}
      <div
        className="pointer-events-none absolute left-6 right-6"
        style={position === "top" ? { top: 90 } : { bottom: 60 }}
      >
        <div
          style={{
            fontFamily: '"JetBrains Mono", monospace',
            fontSize: 10,
            letterSpacing: "0.2em",
            color: "rgba(255,255,255,0.6)",
            marginBottom: 4,
          }}
        >
          {idol.group}
        </div>
        <div
          style={{
            fontFamily: '"Bungee", monospace',
            fontSize: "clamp(28px, 8vw, 44px)",
            lineHeight: 0.95,
            color: "#fff",
            textShadow: "0 0 12px #ff2e88, 0 0 24px #9d4dff",
          }}
        >
          {idol.name}
        </div>
      </div>
    </button>
  );
}

// ── HeartBurst ──────────────────────────────────────────────────

interface HeartBurstProps {
  x: number;
  y: number;
  onDone: () => void;
}

function HeartBurst({ x, y, onDone }: HeartBurstProps) {
  const [alive, setAlive] = useState(true);
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;

  useEffect(() => {
    const t = setTimeout(() => {
      setAlive(false);
      onDoneRef.current();
    }, 900);
    return () => clearTimeout(t);
  }, []); // マウント時のみ — onDoneRef 経由で最新コールバックを呼ぶ

  if (!alive) return null;

  const N = 12;
  const particles = Array.from({ length: N }, (_, i) => {
    const ang = (i / N) * Math.PI * 2;
    const dist = 80 + Math.random() * 80;
    const rot = Math.random() * 360;
    const delay = Math.random() * 0.05;
    return {
      i,
      dx: Math.cos(ang) * dist,
      dy: Math.sin(ang) * dist - 20,
      rot,
      delay,
    };
  });

  return (
    <div
      className="pointer-events-none absolute z-[90]"
      style={{
        left: `${x}%`,
        top: `${y}%`,
        transform: "translate(-50%, -50%)",
      }}
    >
      {particles.map((p) => (
        <div
          key={p.i}
          className="absolute left-0 top-0"
          style={{
            fontSize: 24,
            color: "#ff2e88",
            textShadow: "0 0 8px #ff2e88, 0 0 16px #ff2e88aa",
            animation: `fx-heart-${p.i} 0.9s cubic-bezier(.16,.84,.34,1.01) ${p.delay}s forwards`,
          }}
        >
          ♥
          <style>{`
            @keyframes fx-heart-${p.i} {
              0% { transform: translate(0,0) scale(0.4) rotate(${p.rot}deg); opacity: 0; }
              15% { opacity: 1; }
              100% { transform: translate(${p.dx}px, ${p.dy}px) scale(1.2) rotate(${p.rot + 180}deg); opacity: 0; }
            }
          `}</style>
        </div>
      ))}
    </div>
  );
}
