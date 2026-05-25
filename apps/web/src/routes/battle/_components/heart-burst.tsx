import { useEffect, useRef, useState } from "react";

interface HeartBurstProps {
  x: number;
  y: number;
  onDone: () => void;
}

export function HeartBurst({ x, y, onDone }: HeartBurstProps) {
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
