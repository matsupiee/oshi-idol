import { describe, expect, test, vi, beforeEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
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

vi.mock("@/lib/session", () => ({
  getSessionId: () => "test-session-id",
}));

interface BattleIdol {
  id: string;
  name: string;
  group: string;
  photo: { id: string; imageUrl: string } | null;
}

interface BattlePair {
  idolA: BattleIdol;
  idolB: BattleIdol;
}

const battlePairFn = vi.fn<() => Promise<BattlePair>>();
const submitVoteFn = vi.fn<(input: unknown) => Promise<{ success: true }>>();

interface BattlePairInput {
  sessionId: string;
  excludeIdolIds?: string[];
}

const battlePairCalls: BattlePairInput[] = [];

vi.mock("@/utils/trpc", () => {
  return {
    useTRPC: () => ({
      idols: {
        battlePair: {
          queryKey: (input: BattlePairInput) => ["idols", "battlePair", input],
          queryOptions: (input: BattlePairInput) => ({
            queryKey: ["idols", "battlePair", input],
            queryFn: () => {
              battlePairCalls.push(input);
              return battlePairFn();
            },
          }),
        },
      },
      votes: {
        submit: {
          mutationOptions: () => ({
            mutationFn: (input: unknown) => submitVoteFn(input),
          }),
        },
      },
    }),
  };
});

import { renderWithProviders } from "../../test/helpers";
import { BattleComponent } from "../battle";

describe("BattleComponent (投票画面)", () => {
  beforeEach(() => {
    mockNavigate.mockReset();
    battlePairFn.mockReset();
    submitVoteFn.mockReset();
    battlePairCalls.length = 0;
    window.localStorage.clear();
  });

  test("データ取得中は LOADING... を表示する", () => {
    battlePairFn.mockImplementation(() => new Promise(() => {}));

    renderWithProviders(<BattleComponent />);

    expect(screen.getByText("LOADING...")).toBeInTheDocument();
  });

  test("取得失敗時はエラーメッセージを表示する", async () => {
    battlePairFn.mockRejectedValueOnce(new Error("network down"));

    renderWithProviders(<BattleComponent />);

    expect(await screen.findByText(/エラーが発生しました/)).toBeInTheDocument();
  });

  test("ペア取得後に両アイドルの写真と ROUND 表示が出る (写真を覆わないようアイドル名は非表示)", async () => {
    battlePairFn.mockResolvedValue({
      idolA: {
        id: "idol-a",
        name: "アイドルA",
        group: "グループA",
        photo: { id: "photo-a", imageUrl: "https://example.com/a.jpg" },
      },
      idolB: {
        id: "idol-b",
        name: "アイドルB",
        group: "グループB",
        photo: { id: "photo-b", imageUrl: "https://example.com/b.jpg" },
      },
    });

    renderWithProviders(<BattleComponent />);

    expect(
      await screen.findByRole("button", { name: /グループA アイドルA に投票/ }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /グループB アイドルB に投票/ })).toBeInTheDocument();
    expect(screen.getByText(/ROUND 01\/10/)).toBeInTheDocument();
    // 写真を覆わないために、画面上にはアイドル名・グループ名のテキストは表示しない
    expect(screen.queryByText("アイドルA")).not.toBeInTheDocument();
    expect(screen.queryByText("グループA")).not.toBeInTheDocument();
  });

  test("パネルをタップすると勝者・敗者・セッションIDを渡して投票が送信される", async () => {
    battlePairFn.mockResolvedValue({
      idolA: {
        id: "idol-a",
        name: "アイドルA",
        group: "グループA",
        photo: { id: "photo-a", imageUrl: "https://example.com/a.jpg" },
      },
      idolB: {
        id: "idol-b",
        name: "アイドルB",
        group: "グループB",
        photo: { id: "photo-b", imageUrl: "https://example.com/b.jpg" },
      },
    });
    submitVoteFn.mockResolvedValue({ success: true });

    const user = userEvent.setup();
    renderWithProviders(<BattleComponent />);

    const panelA = await screen.findByRole("button", { name: /グループA アイドルA に投票/ });
    await user.click(panelA);

    await waitFor(() => {
      expect(submitVoteFn).toHaveBeenCalledTimes(1);
    });
    expect(submitVoteFn).toHaveBeenCalledWith({
      winnerId: "idol-a",
      loserId: "idol-b",
      winnerPhotoId: "photo-a",
      loserPhotoId: "photo-b",
      sessionId: "test-session-id",
    });
  });

  test("10 票投じると /ranking に自動遷移する", async () => {
    battlePairFn.mockResolvedValue({
      idolA: {
        id: "idol-a",
        name: "アイドルA",
        group: "グループA",
        photo: { id: "photo-a", imageUrl: "https://example.com/a.jpg" },
      },
      idolB: {
        id: "idol-b",
        name: "アイドルB",
        group: "グループB",
        photo: { id: "photo-b", imageUrl: "https://example.com/b.jpg" },
      },
    });
    submitVoteFn.mockResolvedValue({ success: true });

    const user = userEvent.setup();
    renderWithProviders(<BattleComponent />);

    for (let i = 0; i < 10; i++) {
      const panelA = await screen.findByRole("button", { name: /グループA アイドルA に投票/ });
      // パネルが disabled の場合は次フレームを待つ
      await waitFor(() => expect(panelA).not.toBeDisabled());
      await user.click(panelA);
      await waitFor(() => {
        expect(submitVoteFn).toHaveBeenCalledTimes(i + 1);
      });
    }

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith({ to: "/ranking" });
    });
  });

  test("投票がネットワークエラーになっても画面が壊れず再投票できる", async () => {
    battlePairFn.mockResolvedValue({
      idolA: {
        id: "idol-a",
        name: "アイドルA",
        group: "グループA",
        photo: { id: "photo-a", imageUrl: "https://example.com/a.jpg" },
      },
      idolB: {
        id: "idol-b",
        name: "アイドルB",
        group: "グループB",
        photo: { id: "photo-b", imageUrl: "https://example.com/b.jpg" },
      },
    });
    submitVoteFn.mockRejectedValueOnce(new Error("offline"));

    const user = userEvent.setup();
    renderWithProviders(<BattleComponent />);

    const panel = await screen.findByRole("button", { name: /グループA アイドルA に投票/ });
    await user.click(panel);

    await waitFor(() => {
      expect(submitVoteFn).toHaveBeenCalledTimes(1);
    });

    // 1 回目が失敗した後でも、ボタンが有効に戻り、ラウンド表示は 01 のまま
    await waitFor(() => {
      const restored = screen.getByRole("button", { name: /グループA アイドルA に投票/ });
      expect(restored).not.toBeDisabled();
    });
    expect(screen.getByText(/ROUND 01\/10/)).toBeInTheDocument();
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  test("各パネルの画像は object-position: center 25% で表示される", async () => {
    battlePairFn.mockResolvedValue({
      idolA: {
        id: "idol-a",
        name: "アイドルA",
        group: "グループA",
        photo: { id: "photo-a", imageUrl: "https://example.com/a.jpg" },
      },
      idolB: {
        id: "idol-b",
        name: "アイドルB",
        group: "グループB",
        photo: { id: "photo-b", imageUrl: "https://example.com/b.jpg" },
      },
    });

    renderWithProviders(<BattleComponent />);

    await screen.findByRole("button", { name: /グループA アイドルA に投票/ });

    const images = document.querySelectorAll("img");
    expect(images).toHaveLength(2);
    for (const img of images) {
      expect(img.style.objectPosition).toBe("center 25%");
    }
  });

  test("投票後の再取得では表示済みアイドルを excludeIdolIds で渡す", async () => {
    battlePairFn
      .mockResolvedValueOnce({
        idolA: {
          id: "idol-a",
          name: "アイドルA",
          group: "グループA",
          photo: { id: "photo-a", imageUrl: "https://example.com/a.jpg" },
        },
        idolB: {
          id: "idol-b",
          name: "アイドルB",
          group: "グループB",
          photo: { id: "photo-b", imageUrl: "https://example.com/b.jpg" },
        },
      })
      .mockResolvedValue({
        idolA: {
          id: "idol-c",
          name: "アイドルC",
          group: "グループC",
          photo: { id: "photo-c", imageUrl: "https://example.com/c.jpg" },
        },
        idolB: {
          id: "idol-d",
          name: "アイドルD",
          group: "グループD",
          photo: { id: "photo-d", imageUrl: "https://example.com/d.jpg" },
        },
      });
    submitVoteFn.mockResolvedValue({ success: true });

    const user = userEvent.setup();
    renderWithProviders(<BattleComponent />);

    const panelA = await screen.findByRole("button", { name: /グループA アイドルA に投票/ });
    await user.click(panelA);

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /グループC アイドルC に投票/ }),
      ).toBeInTheDocument();
    });

    expect(battlePairCalls[0]).toEqual({
      sessionId: "test-session-id",
      excludeIdolIds: [],
    });

    const secondCall = battlePairCalls.at(-1);
    expect(secondCall?.excludeIdolIds).toEqual(["idol-a", "idol-b"]);
  });

  test("localStorage に保存済みの seen IDs があればマウント時に除外リストに使う", async () => {
    window.localStorage.setItem(
      "oshi-seen-idol-ids",
      JSON.stringify(["idol-prev-a", "idol-prev-b"]),
    );

    battlePairFn.mockResolvedValue({
      idolA: {
        id: "idol-a",
        name: "アイドルA",
        group: "グループA",
        photo: { id: "photo-a", imageUrl: "https://example.com/a.jpg" },
      },
      idolB: {
        id: "idol-b",
        name: "アイドルB",
        group: "グループB",
        photo: { id: "photo-b", imageUrl: "https://example.com/b.jpg" },
      },
    });

    renderWithProviders(<BattleComponent />);

    await screen.findByRole("button", { name: /グループA アイドルA に投票/ });

    expect(battlePairCalls[0]).toEqual({
      sessionId: "test-session-id",
      excludeIdolIds: ["idol-prev-a", "idol-prev-b"],
    });
  });

  test("投票後に seen IDs を localStorage に保存する", async () => {
    battlePairFn
      .mockResolvedValueOnce({
        idolA: {
          id: "idol-a",
          name: "アイドルA",
          group: "グループA",
          photo: { id: "photo-a", imageUrl: "https://example.com/a.jpg" },
        },
        idolB: {
          id: "idol-b",
          name: "アイドルB",
          group: "グループB",
          photo: { id: "photo-b", imageUrl: "https://example.com/b.jpg" },
        },
      })
      .mockResolvedValue({
        idolA: {
          id: "idol-c",
          name: "アイドルC",
          group: "グループC",
          photo: { id: "photo-c", imageUrl: "https://example.com/c.jpg" },
        },
        idolB: {
          id: "idol-d",
          name: "アイドルD",
          group: "グループD",
          photo: { id: "photo-d", imageUrl: "https://example.com/d.jpg" },
        },
      });
    submitVoteFn.mockResolvedValue({ success: true });

    const user = userEvent.setup();
    renderWithProviders(<BattleComponent />);

    const panelA = await screen.findByRole("button", { name: /グループA アイドルA に投票/ });
    await user.click(panelA);

    await waitFor(() => {
      const stored = JSON.parse(window.localStorage.getItem("oshi-seen-idol-ids") ?? "[]");
      expect(stored).toEqual(["idol-a", "idol-b"]);
    });
  });

  test("seen IDs は最大 200 件に保たれ古い分から削除される", async () => {
    const existingIds = Array.from({ length: 200 }, (_, i) => `idol-existing-${i}`);
    window.localStorage.setItem("oshi-seen-idol-ids", JSON.stringify(existingIds));

    battlePairFn
      .mockResolvedValueOnce({
        idolA: {
          id: "idol-new-a",
          name: "新A",
          group: "グループG",
          photo: { id: "p-a", imageUrl: "https://example.com/a.jpg" },
        },
        idolB: {
          id: "idol-new-b",
          name: "新B",
          group: "グループG",
          photo: { id: "p-b", imageUrl: "https://example.com/b.jpg" },
        },
      })
      .mockResolvedValue({
        idolA: {
          id: "idol-c",
          name: "アイドルC",
          group: "グループC",
          photo: null,
        },
        idolB: {
          id: "idol-d",
          name: "アイドルD",
          group: "グループD",
          photo: null,
        },
      });
    submitVoteFn.mockResolvedValue({ success: true });

    const user = userEvent.setup();
    renderWithProviders(<BattleComponent />);

    await screen.findByRole("button", { name: /グループG 新A に投票/ });
    const panelA = screen.getByRole("button", { name: /グループG 新A に投票/ });
    await user.click(panelA);

    await waitFor(() => {
      const stored = JSON.parse(window.localStorage.getItem("oshi-seen-idol-ids") ?? "[]");
      expect(stored).toHaveLength(200);
      expect(stored.slice(-2)).toEqual(["idol-new-a", "idol-new-b"]);
      expect(stored).not.toContain("idol-existing-0");
      expect(stored).not.toContain("idol-existing-1");
      expect(stored[0]).toBe("idol-existing-2");
    });
  });

  test("成功した投票は画面に表示せず localStorage にのみ保存する (写真を覆わないため)", async () => {
    battlePairFn.mockResolvedValue({
      idolA: {
        id: "idol-a",
        name: "アイドルA",
        group: "グループA",
        photo: { id: "photo-a", imageUrl: "https://example.com/a.jpg" },
      },
      idolB: {
        id: "idol-b",
        name: "アイドルB",
        group: "グループB",
        photo: { id: "photo-b", imageUrl: "https://example.com/b.jpg" },
      },
    });
    submitVoteFn.mockResolvedValue({ success: true });

    const user = userEvent.setup();
    renderWithProviders(<BattleComponent />);

    const panelA = await screen.findByRole("button", { name: /グループA アイドルA に投票/ });
    await user.click(panelA);

    await waitFor(() => {
      expect(JSON.parse(window.localStorage.getItem("oshi-vote-history") ?? "[]")).toMatchObject([
        {
          winner: { id: "idol-a", name: "アイドルA", group: "グループA", photoId: "photo-a" },
          loser: { id: "idol-b", name: "アイドルB", group: "グループB", photoId: "photo-b" },
        },
      ]);
    });

    // 投票履歴・勝敗結果は画面に出さない
    expect(screen.queryByText("投票履歴")).not.toBeInTheDocument();
    expect(screen.queryByRole("region", { name: "過去の投票結果" })).not.toBeInTheDocument();
    expect(screen.queryByText("アイドルB に勝利")).not.toBeInTheDocument();
  });
});
