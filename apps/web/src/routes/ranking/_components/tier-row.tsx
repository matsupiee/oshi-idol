import { type RankIdol } from "../_utils/tier";

export function TierRow({
  label,
  color,
  idols,
}: {
  label: string;
  color: string;
  idols: RankIdol[];
}) {
  return (
    <div className="flex items-stretch gap-2">
      <div
        className="flex w-14 flex-shrink-0 items-center justify-center rounded"
        style={{
          background: color,
          fontFamily: '"Bungee", monospace',
          fontSize: 28,
          color: "#0a0418",
          boxShadow: `0 0 12px ${color}80`,
        }}
      >
        {label}
      </div>
      <div
        className="flex flex-1 flex-wrap items-start gap-1.5 rounded p-1.5"
        style={{
          background: "rgba(255,255,255,0.03)",
          border: `1px solid ${color}55`,
        }}
      >
        {idols.map((idol) => (
          <div
            key={idol.id}
            className="relative overflow-hidden"
            style={{
              width: 44,
              height: 44,
              borderRadius: 3,
              border: `1px solid ${color}aa`,
            }}
          >
            {idol.photo?.imageUrl ? (
              <img
                src={idol.photo.imageUrl}
                alt={idol.name}
                className="h-full w-full object-cover"
              />
            ) : (
              <div
                className="flex h-full w-full items-center justify-center"
                style={{ background: `linear-gradient(135deg, ${color} 0%, #0a0418 100%)` }}
              >
                <span style={{ fontSize: 16, opacity: 0.5, color: "#fff" }}>♪</span>
              </div>
            )}
            <div
              className="absolute bottom-0 left-0 right-0 text-center"
              style={{
                padding: "1px 2px",
                fontFamily: '"JetBrains Mono", monospace',
                fontSize: 7,
                letterSpacing: "0.05em",
                color: "#fff",
                background: "rgba(0,0,0,0.6)",
              }}
            >
              {idol.name.slice(0, 4)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
