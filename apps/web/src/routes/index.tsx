import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";

export const Route = createFileRoute("/")({
  component: HomeComponent,
});

function HomeComponent() {
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
        <span className="arcade-chip">v0.1 · DEMO</span>
        <span className="arcade-chip">10 ROUNDS</span>
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
      <div className="relative z-10 px-7 pb-12">
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
        <div
          className="mt-4 flex justify-between"
          style={{
            fontFamily: '"JetBrains Mono", monospace',
            fontSize: 10,
            color: "rgba(255,255,255,0.4)",
            letterSpacing: "0.15em",
          }}
        >
          <span>ARCADE · SEASON 01</span>
          <span>INSERT COIN ∞</span>
        </div>
      </div>

      {/* CRT scanlines */}
      <div className="arcade-scanlines" />
    </div>
  );
}
