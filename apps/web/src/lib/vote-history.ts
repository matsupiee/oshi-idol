const VOTE_HISTORY_KEY = "oshi-vote-history";
const MAX_HISTORY_ENTRIES = 50;

export interface VoteHistoryIdol {
  id: string;
  name: string;
  group: string;
  photoId: string | null;
}

export interface VoteHistoryEntry {
  winner: VoteHistoryIdol;
  loser: VoteHistoryIdol;
  votedAt: string;
}

interface AddVoteHistoryEntryInput {
  winner: VoteHistoryIdol;
  loser: VoteHistoryIdol;
  votedAt?: string;
}

export function getVoteHistory(): VoteHistoryEntry[] {
  if (typeof window === "undefined") return [];

  const raw = window.localStorage.getItem(VOTE_HISTORY_KEY);
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    return parsed.filter(isVoteHistoryEntry);
  } catch {
    return [];
  }
}

export function addVoteHistoryEntry(input: AddVoteHistoryEntryInput): VoteHistoryEntry[] {
  const entry: VoteHistoryEntry = {
    winner: input.winner,
    loser: input.loser,
    votedAt: input.votedAt ?? new Date().toISOString(),
  };
  const nextHistory = [entry, ...getVoteHistory()].slice(0, MAX_HISTORY_ENTRIES);

  if (typeof window !== "undefined") {
    window.localStorage.setItem(VOTE_HISTORY_KEY, JSON.stringify(nextHistory));
  }

  return nextHistory;
}

function isVoteHistoryEntry(value: unknown): value is VoteHistoryEntry {
  if (!value || typeof value !== "object") return false;

  const maybeEntry = value as Partial<VoteHistoryEntry>;
  return (
    isVoteHistoryIdol(maybeEntry.winner) &&
    isVoteHistoryIdol(maybeEntry.loser) &&
    typeof maybeEntry.votedAt === "string"
  );
}

function isVoteHistoryIdol(value: unknown): value is VoteHistoryIdol {
  if (!value || typeof value !== "object") return false;

  const maybeIdol = value as Partial<VoteHistoryIdol>;
  return (
    typeof maybeIdol.id === "string" &&
    typeof maybeIdol.name === "string" &&
    typeof maybeIdol.group === "string" &&
    (typeof maybeIdol.photoId === "string" || maybeIdol.photoId === null)
  );
}
