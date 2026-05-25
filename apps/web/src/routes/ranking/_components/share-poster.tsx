import { getTier, type RankIdol } from "../_utils/tier";

export function SharePoster({
  top10,
  posterRef,
}: {
  top10: RankIdol[];
  posterRef: React.RefObject<HTMLDivElement | null>;
}) {
  const top3 = top10.slice(0, 3);
  const rest = top10.slice(3, 10);

  return (
    <div
      ref={posterRef}
      className="relative overflow-hidden rounded"
      style={{
        aspectRatio: "9 / 16",
        background: "radial-gradient(ellipse at 50% 0%, #ff2e8855 0%, transparent 50%), #0a0418",
        border: "2px solid #ff2e88",
        boxShadow: "0 0 24px #ff2e8888, inset 0 0 40px #9d4dff44",
        padding: "14px",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Poster header */}
      <div className="mb-2 text-center">
        <div
          style={{
            fontFamily: '"JetBrains Mono", monospace',
            fontSize: 8,
            letterSpacing: "0.3em",
            color: "#ff2e88",
          }}
        >
          OVERALL TOP 10 · OSHI BATTLE
        </div>
        <div
          className="mt-1"
          style={{
            fontFamily: '"Bungee", monospace',
            fontSize: 22,
            lineHeight: 0.9,
            color: "#fff",
            textShadow: "0 0 8px #ff2e88, 2px 2px 0 #9d4dff",
          }}
        >
          全体推しランキング
        </div>
      </div>

      {/* TOP 3 podium */}
      <div className="mb-1.5 grid gap-1" style={{ gridTemplateColumns: "1fr 1.2fr 1fr" }}>
        {[top3[1], top3[0], top3[2]].map((idol, i) => {
          if (!idol) return <div key={i} />;
          const realRank = idol === top3[0] ? 1 : idol === top3[1] ? 2 : 3;
          const big = realRank === 1;
          const tier = getTier(idol.eloRating);
          return (
            <div
              key={idol.id}
              className="relative overflow-hidden"
              style={{
                aspectRatio: big ? "3/4" : "2.5/4",
                marginTop: big ? 0 : 16,
                border: `1.5px solid ${tier.color}`,
                boxShadow: `0 0 12px ${tier.color}88`,
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
                  className="h-full w-full"
                  style={{
                    background: `linear-gradient(135deg, ${tier.color} 0%, #0a0418 100%)`,
                  }}
                />
              )}
              <div
                className="absolute left-0.5 top-0.5"
                style={{
                  fontFamily: '"Bungee", monospace',
                  fontSize: big ? 28 : 18,
                  color: tier.color,
                  textShadow: `0 0 8px ${tier.color}, 1px 1px 0 #000`,
                }}
              >
                {String(realRank).padStart(2, "0")}
              </div>
              <div
                className="absolute bottom-0 left-0 right-0 text-center"
                style={{
                  background: "linear-gradient(0deg, rgba(0,0,0,0.8), transparent)",
                  padding: "12px 4px 3px",
                  fontFamily: '"Bungee", monospace',
                  fontSize: big ? 12 : 10,
                  color: "#fff",
                  textShadow: `0 0 6px ${tier.color}`,
                }}
              >
                {idol.name.slice(0, 6).toUpperCase()}
              </div>
            </div>
          );
        })}
      </div>

      {/* 4–10 grid */}
      <div className="grid flex-1 grid-cols-4 content-start gap-0.5">
        {rest.map((idol, i) => {
          const tier = getTier(idol.eloRating);
          return (
            <div
              key={idol.id}
              className="relative overflow-hidden"
              style={{
                aspectRatio: "1/1",
                border: `1px solid ${tier.color}88`,
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
                  className="h-full w-full"
                  style={{
                    background: `linear-gradient(135deg, ${tier.color} 0%, #0a0418 100%)`,
                  }}
                />
              )}
              <div
                className="absolute left-0.5 top-0.5"
                style={{
                  fontFamily: '"Bungee", monospace',
                  fontSize: 11,
                  color: "#fff",
                  textShadow: `0 0 4px ${tier.color}`,
                }}
              >
                {i + 4}
              </div>
              <div
                className="absolute bottom-0 left-0 right-0 text-center"
                style={{
                  padding: "1px 2px",
                  fontFamily: '"JetBrains Mono", monospace',
                  fontSize: 6,
                  letterSpacing: "0.05em",
                  color: "#fff",
                  background: "rgba(0,0,0,0.7)",
                }}
              >
                {idol.name.slice(0, 4)}
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div
        className="mt-1.5 text-center"
        style={{
          fontFamily: '"JetBrains Mono", monospace',
          fontSize: 7,
          letterSpacing: "0.25em",
          color: "rgba(255,255,255,0.5)",
        }}
      >
        OSHI-BATTLE / #推し選手権
      </div>
    </div>
  );
}
