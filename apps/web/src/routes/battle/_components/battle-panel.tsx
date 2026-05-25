export interface IdolData {
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

export function BattlePanel({ idol, position, state, onTap, disabled }: BattlePanelProps) {
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
