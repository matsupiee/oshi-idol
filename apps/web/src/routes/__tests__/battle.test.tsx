import { describe, expect, test, vi, beforeEach } from "vitest";
import { screen, waitFor, within } from "@testing-library/react";
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

vi.mock("@/utils/trpc", () => {
  return {
    useTRPC: () => ({
      idols: {
        battlePair: {
          queryKey: (input: { sessionId: string }) => ["idols", "battlePair", input],
          queryOptions: (input: { sessionId: string }) => ({
            queryKey: ["idols", "battlePair", input],
            queryFn: () => battlePairFn(),
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

  test("ペア取得後に両アイドルと ROUND 表示が出る", async () => {
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

    expect(await screen.findByText("アイドルA")).toBeInTheDocument();
    expect(screen.getByText("アイドルB")).toBeInTheDocument();
    expect(screen.getByText("グループA")).toBeInTheDocument();
    expect(screen.getByText("グループB")).toBeInTheDocument();
    expect(screen.getByText(/ROUND 01\/10/)).toBeInTheDocument();
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

    const panelA = (await screen.findByText("アイドルA")).closest("button");
    expect(panelA).not.toBeNull();
    await user.click(panelA!);

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
      const panelA = (await screen.findByText("アイドルA")).closest("button");
      // パネルが disabled の場合は次フレームを待つ
      await waitFor(() => expect(panelA).not.toBeDisabled());
      await user.click(panelA!);
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

    const panel = (await screen.findByText("アイドルA")).closest("button");
    await user.click(panel!);

    await waitFor(() => {
      expect(submitVoteFn).toHaveBeenCalledTimes(1);
    });

    // 1 回目が失敗した後でも、ボタンが有効に戻り、ラウンド表示は 01 のまま
    await waitFor(() => {
      const restored = within(document.body).getByText("アイドルA").closest("button");
      expect(restored).not.toBeDisabled();
    });
    expect(screen.getByText(/ROUND 01\/10/)).toBeInTheDocument();
    expect(mockNavigate).not.toHaveBeenCalled();
  });
});
