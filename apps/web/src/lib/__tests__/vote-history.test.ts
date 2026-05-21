import { beforeEach, describe, expect, test } from "vitest";

import { addVoteHistoryEntry, getVoteHistory } from "../vote-history";

describe("vote-history", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  test("投票履歴を localStorage に最新順で保存して読み出せる", () => {
    addVoteHistoryEntry({
      winner: { id: "idol-a", name: "アイドルA", group: "グループA", photoId: "photo-a" },
      loser: { id: "idol-b", name: "アイドルB", group: "グループB", photoId: "photo-b" },
      votedAt: "2026-05-22T10:00:00.000Z",
    });
    addVoteHistoryEntry({
      winner: { id: "idol-c", name: "アイドルC", group: "グループC", photoId: null },
      loser: { id: "idol-d", name: "アイドルD", group: "グループD", photoId: null },
      votedAt: "2026-05-22T10:01:00.000Z",
    });

    expect(getVoteHistory()).toEqual([
      {
        winner: { id: "idol-c", name: "アイドルC", group: "グループC", photoId: null },
        loser: { id: "idol-d", name: "アイドルD", group: "グループD", photoId: null },
        votedAt: "2026-05-22T10:01:00.000Z",
      },
      {
        winner: { id: "idol-a", name: "アイドルA", group: "グループA", photoId: "photo-a" },
        loser: { id: "idol-b", name: "アイドルB", group: "グループB", photoId: "photo-b" },
        votedAt: "2026-05-22T10:00:00.000Z",
      },
    ]);
  });

  test("壊れた保存値があっても空の履歴として扱う", () => {
    window.localStorage.setItem("oshi-vote-history", "{broken");

    expect(getVoteHistory()).toEqual([]);
  });
});
