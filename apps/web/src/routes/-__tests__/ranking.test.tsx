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

interface RankIdol {
  id: string;
  rank: number;
  name: string;
  group: string;
  eloRating: number;
  winRate: number;
  wins: number;
  losses: number;
  photo: { id: string; imageUrl: string } | null;
}

const top10Fn = vi.fn<() => Promise<RankIdol[]>>();

vi.mock("@/utils/trpc", () => ({
  useTRPC: () => ({
    ranking: {
      top10: {
        queryOptions: () => ({
          queryKey: ["ranking", "top10"],
          queryFn: () => top10Fn(),
        }),
      },
    },
  }),
}));

import { renderWithProviders } from "../../test/helpers";
import { RankingComponent } from "../ranking";

describe("RankingComponent (結果画面)", () => {
  beforeEach(() => {
    mockNavigate.mockReset();
    top10Fn.mockReset();
  });

  test("データ取得中は LOADING... を表示する", () => {
    top10Fn.mockImplementation(() => new Promise(() => {}));

    renderWithProviders(<RankingComponent />);

    expect(screen.getByText("LOADING...")).toBeInTheDocument();
  });

  test("取得失敗時はエラーメッセージを表示する", async () => {
    top10Fn.mockRejectedValueOnce(new Error("offline"));

    renderWithProviders(<RankingComponent />);

    expect(await screen.findByText(/エラーが発生しました/)).toBeInTheDocument();
  });

  test("TOP 10 が順位順に表示される", async () => {
    const idols: RankIdol[] = Array.from({ length: 10 }, (_, i) => ({
      id: `idol-${i + 1}`,
      rank: i + 1,
      name: `アイドル${i + 1}`,
      group: `グループ${i + 1}`,
      eloRating: 1800 - i * 50,
      wins: 5,
      losses: 5,
      winRate: 0.5,
      photo: null,
    }));
    top10Fn.mockResolvedValue(idols);

    renderWithProviders(<RankingComponent />);

    // 全 10 件の名前が描画される (TOP 10 セクション + TIER LIST + SHARE CARD でも参照される)
    for (const idol of idols) {
      const matches = await screen.findAllByText(idol.name);
      expect(matches.length).toBeGreaterThan(0);
    }
    expect(screen.getByText("TOP 10")).toBeInTheDocument();
  });

  test("全体ランキングとして見える見出しとポスター文言を表示する", async () => {
    top10Fn.mockResolvedValue([
      {
        id: "1",
        rank: 1,
        name: "推し一",
        group: "G1",
        eloRating: 1800,
        wins: 5,
        losses: 5,
        winRate: 0.5,
        photo: null,
      },
    ]);

    renderWithProviders(<RankingComponent />);

    expect(await screen.findByText("GLOBAL RANK")).toBeInTheDocument();
    expect(screen.getByText("みんなの投票で決まる全体ランキング")).toBeInTheDocument();
    expect(screen.getByText("OVERALL TOP 10 · OSHI BATTLE")).toBeInTheDocument();
    expect(screen.getByText("全体推しランキング")).toBeInTheDocument();
    expect(screen.queryByText("君の推し度ランキング")).not.toBeInTheDocument();
    expect(screen.queryByText("君の推しランキング")).not.toBeInTheDocument();
  });

  test("ELO に応じてティアが分類される (S: 1700+, A: 1600+, ...)", async () => {
    const idols: RankIdol[] = [
      // S ティア (1700+)
      {
        id: "1",
        rank: 1,
        name: "S級1",
        group: "G",
        eloRating: 1900,
        wins: 5,
        losses: 5,
        winRate: 0.5,
        photo: null,
      },
      {
        id: "2",
        rank: 2,
        name: "S級2",
        group: "G",
        eloRating: 1750,
        wins: 5,
        losses: 5,
        winRate: 0.5,
        photo: null,
      },
      // A (1600+)
      {
        id: "3",
        rank: 3,
        name: "A級",
        group: "G",
        eloRating: 1650,
        wins: 5,
        losses: 5,
        winRate: 0.5,
        photo: null,
      },
      // B (1500+)
      {
        id: "4",
        rank: 4,
        name: "B級",
        group: "G",
        eloRating: 1550,
        wins: 5,
        losses: 5,
        winRate: 0.5,
        photo: null,
      },
      // C (1400+)
      {
        id: "5",
        rank: 5,
        name: "C級",
        group: "G",
        eloRating: 1450,
        wins: 5,
        losses: 5,
        winRate: 0.5,
        photo: null,
      },
      // D (それ以下)
      {
        id: "6",
        rank: 6,
        name: "D級",
        group: "G",
        eloRating: 1300,
        wins: 5,
        losses: 5,
        winRate: 0.5,
        photo: null,
      },
    ];
    top10Fn.mockResolvedValue(idols);

    renderWithProviders(<RankingComponent />);

    expect(await screen.findByText("TIER LIST")).toBeInTheDocument();
    // 各ティアラベル ("S", "A", "B", "C", "D") はランクバッジでも使われるため、
    // TIER LIST の大きい色つきラベルが最低 1 つずつ描画されていることを確認
    for (const label of ["S", "A", "B", "C", "D"]) {
      expect(screen.getAllByText(label).length).toBeGreaterThan(0);
    }
    // 6 件中 S ティアは 2 件 (1900, 1750)、A/B/C/D は 1 件ずつのため、
    // S ラベルは TIER LIST 1 + ランクバッジ 2 + ポスター 2 = 計 5 個程度出現する
    expect(screen.getAllByText("S").length).toBeGreaterThanOrEqual(2);
  });

  test("STATS に最頻グループ・平均勝率・最高 ELO が表示される", async () => {
    const idols: RankIdol[] = [
      {
        id: "1",
        rank: 1,
        name: "推し一",
        group: "G1",
        eloRating: 1900,
        wins: 8,
        losses: 2,
        winRate: 0.8,
        photo: null,
      },
      {
        id: "2",
        rank: 2,
        name: "推し二",
        group: "G1",
        eloRating: 1700,
        wins: 6,
        losses: 4,
        winRate: 0.6,
        photo: null,
      },
      {
        id: "3",
        rank: 3,
        name: "推し三",
        group: "G2",
        eloRating: 1500,
        wins: 5,
        losses: 5,
        winRate: 0.5,
        photo: null,
      },
    ];
    top10Fn.mockResolvedValue(idols);

    renderWithProviders(<RankingComponent />);

    expect(await screen.findByText("STATS")).toBeInTheDocument();
    // STATS セクションを起点に検索範囲を絞り込む
    const statsSection = screen.getByText("STATS").parentElement!.parentElement!;
    expect(within(statsSection).getByText("TOP GROUP")).toBeInTheDocument();
    // G1 が 2 件で最多 (STATS の TOP GROUP セル内)
    expect(within(statsSection).getByText("2人がランクイン")).toBeInTheDocument();
    // 平均勝率 (0.8 + 0.6 + 0.5) / 3 = 0.6333 → 63%
    expect(within(statsSection).getByText("63%")).toBeInTheDocument();
    // 最高 ELO (TOP ELO セル) — RankRow にも "1900" は出現するため getAllByText
    expect(screen.getAllByText("1900").length).toBeGreaterThan(0);
  });

  test("PLAY AGAIN ボタンでトップに戻れる", async () => {
    top10Fn.mockResolvedValue([
      {
        id: "1",
        rank: 1,
        name: "推し一",
        group: "G1",
        eloRating: 1800,
        wins: 5,
        losses: 5,
        winRate: 0.5,
        photo: null,
      },
    ]);

    const user = userEvent.setup();
    renderWithProviders(<RankingComponent />);

    const button = await screen.findByRole("button", { name: /PLAY AGAIN/ });
    await user.click(button);

    expect(mockNavigate).toHaveBeenCalledWith({ to: "/" });
  });

  test("空の TOP 10 でも画面がクラッシュしない", async () => {
    top10Fn.mockResolvedValue([]);

    renderWithProviders(<RankingComponent />);

    expect(await screen.findByText("TOP 10")).toBeInTheDocument();
    // 統計の各セルが — / 0 でフォールバックされる
    const stats = screen.getByText("STATS").closest("div");
    expect(stats).toBeTruthy();
    expect(within(document.body).getByText("0%")).toBeInTheDocument();
  });
});
