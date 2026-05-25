import { Trophy, Play } from "lucide-react";

export function EmptyHistory({ onStart }: { onStart: () => void }) {
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
