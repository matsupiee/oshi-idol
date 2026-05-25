export function SectionLabel({ n, label }: { n: string; label: string }) {
  return (
    <div
      className="mb-4 flex items-center gap-2.5 px-4 py-3"
      style={{
        borderTop: "1px solid #9d4dff33",
        borderBottom: "1px solid #9d4dff33",
        background: "linear-gradient(90deg, #9d4dff1a 0%, transparent 100%)",
      }}
    >
      <span
        style={{
          fontFamily: '"JetBrains Mono", monospace',
          fontSize: 10,
          letterSpacing: "0.2em",
          color: "#ff2e88",
        }}
      >
        // {n}
      </span>
      <span
        style={{
          fontFamily: '"Bungee", monospace',
          fontSize: 18,
          letterSpacing: "0.08em",
          color: "#fff",
          textShadow: "0 0 8px #ff2e88",
        }}
      >
        {label}
      </span>
    </div>
  );
}
