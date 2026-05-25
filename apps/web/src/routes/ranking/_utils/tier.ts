export interface RankIdol {
  id: string;
  rank: number;
  name: string;
  group: string;
  eloRating: number;
  winRate: number;
  wins: number;
  losses: number;
  photo: { id: string; imageUrl: string } | { id: null; imageUrl: null } | null;
}

export const TIER_CONFIG: { label: string; minElo: number; color: string }[] = [
  { label: "S", minElo: 1700, color: "#ff2e88" },
  { label: "A", minElo: 1600, color: "#fff200" },
  { label: "B", minElo: 1500, color: "#9d4dff" },
  { label: "C", minElo: 1400, color: "#00f0ff" },
  { label: "D", minElo: 0, color: "#475569" },
];

export function getTier(elo: number) {
  return TIER_CONFIG.find((t) => elo >= t.minElo) ?? TIER_CONFIG[TIER_CONFIG.length - 1];
}
