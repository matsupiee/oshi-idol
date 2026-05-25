import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useCallback, useEffect, useRef, useState } from "react";

import { addVoteHistoryEntry } from "@/lib/vote-history";
import { useTRPC } from "@/utils/trpc";

export const Route = createFileRoute("/battle")({
  component: BattleComponent,
});

const MAX_VOTES = 10;
const QUEUE_SIZE = 20;

interface Burst {
  id: number;
  x: number;
  y: number;
}

interface IdolData {
  id: string;
  name: string;
  group: string;
  photo: { id: string; imageUrl: string } | { id: null; imageUrl: null } | null;
}

interface BattlePair {
  idolA: IdolData;
  idolB: IdolData;
}

export function BattleComponent() {
  const navigate = useNavigate();
  const trpc = useTRPC();
  const [voteCount, setVoteCount] = useState(0);
  const [voting, setVoting] = useState<string | null>(null);
  const [winnerIdx, setWinnerIdx] = useState<0 | 1 | null>(null);
  const [phase, setPhase] = useState<"idle" | "locked" | "exit">("idle");
  const [bursts, setBursts] = useState<Burst[]>([]);
  const [queue, setQueue] = useState<BattlePair[]>([]);
  const burstIdRef = useRef(0);
  const exitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const battleQueue = useQuery(trpc.idols.battleQueue.queryOptions({ count: QUEUE_SIZE }));
  const submitVote = useMutation(trpc.votes.submit.mutationOptions());

  // 取得したキューをローカルstateに展開し、2番目以降の画像をプリロード
  useEffect(() => {
    if (!battleQueue.data || queue.length > 0) return;
    setQueue(battleQueue.data);
    for (const pair of battleQueue.data.slice(1)) {
      if (pair.idolA.photo?.imageUrl) new Image().src = pair.idolA.photo.imageUrl;
      if (pair.idolB.photo?.imageUrl) new Image().src = pair.idolB.photo.imageUrl;
    }
  }, [battleQueue.data, queue.length]);

  const currentPair = queue[0] ?? null;

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
        });
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
        });

        const newCount = voteCount + 1;
        setVoteCount(newCount);

        if (newCount >= MAX_VOTES) {
          navigate({ to: "/ranking" });
          return;
        }

        // キューから現在のペアを取り除いて次へ（API 再フェッチなし）
        setQueue((prev) => prev.slice(1));
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
    [phase, voting, voteCount, submitVote, navigate],
  );

  if (battleQueue.isLoading) {
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

  if (battleQueue.isError || !currentPair) {
    return (
      <div className="absolute inset-0 flex items-center justify-center bg-[#0a0418]">
        <span style={{ color: "#ff4444", fontFamily: '"Noto Sans JP", sans-serif' }}>
          エラーが発生しました。再読み込みしてください。
        </span>
      </div>
    );
  }

  const { idolA, idolB } = currentPair;

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
            transform: "translateY(-50%) rotate(-2deg)",
            boxShadow: "0 0 20px #ff2e88, 0 0 40px #9d4dff",
            opacity: 0.9,
          }}
        />
      </div>
      <div
        className="pointer-events-none absolute left-1/2 top-1/2 z-[6]"
        style={{
          transform: "translate(-50%, -50%) rotate(-2deg)",
          padding: "2px 10px",
          background: "#0a0418",
          border: "2px solid #ff2e88",
          boxShadow: "0 0 16px #ff2e88, inset 0 0 8px #9d4dff",
          fontFamily: '"Bungee", monospace',
          fontSize: 24,
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
    </div>
  );
}

// ── BattlePanel ──────────────────────────────────────────────────

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
      ? "polygon(0 0, 100% 0, 100% 88%, 0 100%)"
      : "polygon(0 12%, 100% 0, 100% 100%, 0 100%)";

  const positionClass =
    position === "top"
      ? "absolute top-0 left-0 right-0 h-[52%]"
      : "absolute bottom-0 left-0 right-0 h-[52%]";

  return (
    <button
      type="button"
      onClick={onTap}
      disabled={disabled}
      aria-label={`${idol.group} ${idol.name} に投票`}
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
            className="h-[120%] w-[120%] object-cover"
            style={{ objectPosition: "center 30%" }}
            fetchPriority="high"
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
              ? "linear-gradient(180deg, transparent 40%, rgba(10,4,24,0.2) 100%)"
              : "linear-gradient(0deg, transparent 40%, rgba(10,4,24,0.2) 100%)",
        }}
      />

      {/* Inner glow from cut */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          boxShadow: position === "top" ? "inset 0 0 60px #ff2e8844" : "inset 0 0 60px #9d4dff44",
        }}
      />
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
