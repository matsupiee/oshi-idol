import { describe, expect, test, vi, beforeEach } from "vitest";
import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const mockNavigate = vi.fn();

vi.mock("@tanstack/react-router", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@tanstack/react-router")>();
  return {
    ...actual,
    createFileRoute: () => () => ({}),
    useNavigate: () => mockNavigate,
  };
});

import { addVoteHistoryEntry } from "@/lib/vote-history";
import { renderWithProviders } from "../../test/helpers";
import { HistoryComponent } from "../history";

describe("HistoryComponent (投票履歴画面)", () => {
  beforeEach(() => {
    mockNavigate.mockReset();
    window.localStorage.clear();
  });

  test("履歴がない場合は空状態と戻る導線を表示する", async () => {
    const user = userEvent.setup();
    renderWithProviders(<HistoryComponent />);

    expect(screen.getByRole("heading", { name: /MY HISTORY/ })).toBeInTheDocument();
    expect(screen.getByText("まだ投票履歴がありません")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /PLAY BATTLE/ }));
    expect(mockNavigate).toHaveBeenCalledWith({ to: "/battle" });
  });

  test("localStorage の投票履歴を新しい順で表示する", () => {
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

    renderWithProviders(<HistoryComponent />);

    const rows = screen.getAllByRole("article");
    expect(rows).toHaveLength(2);
    expect(within(rows[0]!).getByText("アイドルC")).toBeInTheDocument();
    expect(within(rows[0]!).getByText("アイドルD に勝利")).toBeInTheDocument();
    expect(within(rows[1]!).getByText("アイドルA")).toBeInTheDocument();
    expect(within(rows[1]!).getByText("アイドルB に勝利")).toBeInTheDocument();
  });
});
