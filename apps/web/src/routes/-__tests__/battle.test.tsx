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

const battleQueueFn = vi.fn<() => Promise<BattlePair[]>>();
const submitVoteFn = vi.fn<(input: unknown) => Promise<{ success: true }>>();

vi.mock("@/utils/trpc", () => {
  return {
    useTRPC: () => ({
      idols: {
        battleQueue: {
          queryOptions: (input: unknown) => ({
            queryKey: ["idols", "battleQueue", input],
            queryFn: () => battleQueueFn(),
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

// テスト用ペアのファクトリ
function makePair(
  a: { id: string; name: string; group: string },
  b: { id: string; name: string; group: string },
): BattlePair {
  return {
    idolA: { ...a, photo: { id: `photo-${a.id}`, imageUrl: `https://example.com/${a.id}.jpg` } },
    idolB: { ...b, photo: { id: `photo-${b.id}`, imageUrl: `https://example.com/${b.id}.jpg` } },
  };
}

const PAIR_AB = makePair(
  { id: "idol-a", name: "アイドルA", group: "グループA" },
  { id: "idol-b", name: "アイドルB", group: "グループB" },
);

const PAIR_CD = makePair(
  { id: "idol-c", name: "アイドルC", group: "グループC" },
  { id: "idol-d", name: "アイドルD", group: "グループD" },
);

describe("BattleComponent (投票画面)", () => {
  beforeEach(() => {
    mockNavigate.mockReset();
    battleQueueFn.mockReset();
    submitVoteFn.mockReset();
    window.localStorage.clear();
  });

  test("データ取得中は LOADING... を表示する", () => {
    battleQueueFn.mockImplementation(() => new Promise(() => {}));

    renderWithProviders(<BattleComponent />);

    expect(screen.getByText("LOADING...")).toBeInTheDocument();
  });

  test("取得失敗時はエラーメッセージを表示する", async () => {
    battleQueueFn.mockRejectedValueOnce(new Error("network down"));

    renderWithProviders(<BattleComponent />);

    expect(await screen.findByText(/エラーが発生しました/)).toBeInTheDocument();
  });

  test("ペア取得後に両アイドルの写真と ROUND 表示が出る (写真を覆わないようアイドル名は非表示)", async () => {
    battleQueueFn.mockResolvedValue([PAIR_AB]);

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
    battleQueueFn.mockResolvedValue([PAIR_AB, PAIR_CD]);
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
      winnerPhotoId: "photo-idol-a",
      loserPhotoId: "photo-idol-b",
      sessionId: "test-session-id",
    });
  });

  test("10 票投じると /ranking に自動遷移する", async () => {
    // 10ペア分のキューを用意
    battleQueueFn.mockResolvedValue(
      Array.from({ length: 10 }, (_, i) =>
        makePair(
          { id: `idol-a-${i}`, name: "アイドルA", group: "グループA" },
          { id: `idol-b-${i}`, name: "アイドルB", group: "グループB" },
        ),
      ),
    );
    submitVoteFn.mockResolvedValue({ success: true });

    const user = userEvent.setup();
    renderWithProviders(<BattleComponent />);

    for (let i = 0; i < 10; i++) {
      const panelA = await screen.findByRole("button", { name: /グループA アイドルA に投票/ });
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
    battleQueueFn.mockResolvedValue([PAIR_AB]);
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

  test("各パネルの画像は object-position: center 30% で表示される", async () => {
    battleQueueFn.mockResolvedValue([PAIR_AB]);

    renderWithProviders(<BattleComponent />);

    await screen.findByRole("button", { name: /グループA アイドルA に投票/ });

    const images = document.querySelectorAll("img");
    expect(images).toHaveLength(2);
    for (const img of images) {
      expect(img.style.objectPosition).toBe("center 30%");
    }
  });

  test("投票後はキューの次のペアが表示される（API 再フェッチなし）", async () => {
    battleQueueFn.mockResolvedValue([PAIR_AB, PAIR_CD]);
    submitVoteFn.mockResolvedValue({ success: true });

    const user = userEvent.setup();
    renderWithProviders(<BattleComponent />);

    const panelA = await screen.findByRole("button", { name: /グループA アイドルA に投票/ });
    await user.click(panelA);

    // 投票後に次のペア (C/D) が表示される
    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /グループC アイドルC に投票/ }),
      ).toBeInTheDocument();
    });

    // battleQueue は最初の 1 回しか呼ばれていない
    expect(battleQueueFn).toHaveBeenCalledTimes(1);
  });

  test("成功した投票は画面に表示せず localStorage にのみ保存する (写真を覆わないため)", async () => {
    battleQueueFn.mockResolvedValue([PAIR_AB, PAIR_CD]);
    submitVoteFn.mockResolvedValue({ success: true });

    const user = userEvent.setup();
    renderWithProviders(<BattleComponent />);

    const panelA = await screen.findByRole("button", { name: /グループA アイドルA に投票/ });
    await user.click(panelA);

    await waitFor(() => {
      expect(JSON.parse(window.localStorage.getItem("oshi-vote-history") ?? "[]")).toMatchObject([
        {
          winner: { id: "idol-a", name: "アイドルA", group: "グループA", photoId: "photo-idol-a" },
          loser: { id: "idol-b", name: "アイドルB", group: "グループB", photoId: "photo-idol-b" },
        },
      ]);
    });

    // 投票履歴・勝敗結果は画面に出さない
    expect(screen.queryByText("投票履歴")).not.toBeInTheDocument();
    expect(screen.queryByRole("region", { name: "過去の投票結果" })).not.toBeInTheDocument();
    expect(screen.queryByText("アイドルB に勝利")).not.toBeInTheDocument();
  });
});
