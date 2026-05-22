import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { History, Trophy } from "lucide-react";
import type { ReactNode } from "react";
import { useState } from "react";

export const Route = createFileRoute("/")({
  component: HomeComponent,
});

export function HomeComponent() {
  const navigate = useNavigate();
  const [pressing, setPressing] = useState(false);

  return (
    <div
      className="absolute inset-0 flex flex-col overflow-hidden text-white"
      style={{
        background: "radial-gradient(ellipse at 50% 30%, #ff2e8822 0%, transparent 60%), #0a0418",
      }}
    >
      {/* Grid floor */}
      <div
        className="absolute bottom-0 left-0 right-0"
        style={{
          height: "55%",
          background: `
            linear-gradient(180deg, transparent 0%, #9d4dff33 100%),
            repeating-linear-gradient(90deg, transparent 0, transparent 38px, #9d4dff55 38px, #9d4dff55 39px),
            repeating-linear-gradient(0deg, transparent 0, transparent 24px, #9d4dff44 24px, #9d4dff44 25px)
          `,
          transform: "perspective(420px) rotateX(58deg)",
          transformOrigin: "center top",
          opacity: 0.55,
          maskImage: "linear-gradient(180deg, #000 30%, transparent 95%)",
        }}
      />

      {/* Neon sun */}
      <div
        className="absolute left-1/2 rounded-full"
        style={{
          top: "38%",
          width: 280,
          height: 280,
          transform: "translate(-50%, -50%)",
          background: "radial-gradient(circle, #fff200cc 0%, #9d4dff88 50%, transparent 70%)",
          filter: "blur(2px)",
          opacity: 0.7,
        }}
      />

      {/* Top chips */}
      <div className="relative z-10 flex justify-between px-6 pt-10">
        {/* <span className="arcade-chip">v0.1 · DEMO</span>
        <span className="arcade-chip">10 ROUNDS</span> */}
      </div>

      {/* Logo block */}
      <div className="relative z-10 mt-10 px-6 text-center">
        <div
          style={{
            fontFamily: '"Bungee", monospace',
            fontSize: 14,
            letterSpacing: "0.4em",
            color: "#ff2e88",
            textShadow: "0 0 8px #ff2e88",
            marginBottom: 8,
          }}
        >
          WHO IS YOUR
        </div>
        <h1
          className="m-0 leading-none"
          style={{
            fontFamily: '"Bungee", monospace',
            fontSize: "clamp(64px, 18vw, 88px)",
            letterSpacing: "-0.01em",
            color: "#fff",
            textShadow: `
              0 0 12px #9d4dff,
              0 0 32px #9d4dffcc,
              4px 4px 0 #ff2e88,
              -2px -2px 0 #fff200
            `,
          }}
        >
          OSHI
          <br />
          BATTLE
        </h1>
        <p
          className="mt-3"
          style={{
            fontFamily: '"Noto Sans JP", sans-serif',
            fontSize: 13,
            color: "rgba(255,255,255,0.6)",
            letterSpacing: "0.08em",
          }}
        >
          2人のアイドル、選ぶのは君だ。
        </p>
      </div>

      <div className="flex-1" />

      {/* CTA */}
      <div className="relative z-10 px-7 pb-8">
        <button
          type="button"
          onPointerDown={() => setPressing(true)}
          onPointerUp={() => {
            setPressing(false);
            navigate({ to: "/battle" });
          }}
          onPointerLeave={() => setPressing(false)}
          style={{
            width: "100%",
            height: 76,
            border: "none",
            cursor: "pointer",
            background: "linear-gradient(180deg, #ff2e88 0%, #9d4dff 100%)",
            color: "#0a0418",
            fontFamily: '"Bungee", monospace',
            fontSize: 26,
            letterSpacing: "0.12em",
            borderRadius: 4,
            boxShadow: pressing
              ? "0 0 0 2px #ff2e88, inset 0 4px 12px rgba(0,0,0,0.4)"
              : "0 0 24px #ff2e88aa, 0 0 60px #9d4dff66, 0 6px 0 #000, inset 0 -4px 0 rgba(0,0,0,0.3)",
            transform: pressing ? "translateY(4px)" : "translateY(0)",
            transition: "transform 80ms, box-shadow 80ms",
          }}
        >
          ▶ PRESS START
        </button>
        <div className="mt-3 grid grid-cols-2 gap-2.5">
          <HomeNavButton
            color="#fff200"
            icon={<Trophy aria-hidden="true" size={16} />}
            label="GLOBAL RANK"
            sub="全体ランキング"
            onClick={() => navigate({ to: "/ranking" })}
          />
          <HomeNavButton
            color="#ff2e88"
            icon={<History aria-hidden="true" size={16} />}
            label="MY HISTORY"
            sub="投票履歴"
            onClick={() => navigate({ to: "/history" })}
          />
        </div>
      </div>

      {/* CRT scanlines */}
      <div className="arcade-scanlines" />
    </div>
  );
}

function HomeNavButton({
  color,
  icon,
  label,
  sub,
  onClick,
}: {
  color: string;
  icon: ReactNode;
  label: string;
  sub: string;
  onClick: () => void;
}) {
  const [pressed, setPressed] = useState(false);

  return (
    <button
      type="button"
      onClick={onClick}
      onPointerDown={() => setPressed(true)}
      onPointerUp={() => setPressed(false)}
      onPointerLeave={() => setPressed(false)}
      className="flex h-[60px] flex-col items-start justify-center gap-0.5 px-2.5 text-left"
      style={{
        background: "rgba(10,4,24,0.62)",
        color,
        border: `1.5px solid ${color}`,
        borderRadius: 4,
        cursor: "pointer",
        boxShadow: pressed
          ? `inset 0 2px 8px rgba(0,0,0,0.55), 0 0 0 1px ${color}66`
          : `0 0 14px ${color}55, inset 0 0 12px ${color}22, 0 3px 0 #000`,
        transform: pressed ? "translateY(3px)" : "translateY(0)",
        transition: "transform 80ms, box-shadow 80ms",
      }}
    >
      <span className="flex items-center gap-1.5">
        {icon}
        <span
          style={{
            fontFamily: '"Bungee", monospace',
            fontSize: 12,
            letterSpacing: "0.08em",
            textShadow: `0 0 8px ${color}aa`,
          }}
        >
          {label}
        </span>
      </span>
      <span
        style={{
          fontFamily: '"Noto Sans JP", sans-serif',
          fontSize: 10,
          color: "rgba(255,255,255,0.58)",
          letterSpacing: "0.06em",
        }}
      >
        {sub}
      </span>
    </button>
  );
}
