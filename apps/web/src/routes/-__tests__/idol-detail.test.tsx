import React from "react";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { screen } from "@testing-library/react";

const mockNavigate = vi.fn();

vi.mock("@tanstack/react-router", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@tanstack/react-router")>();
  return {
    ...actual,
    createFileRoute: () => () => ({
      useParams: () => ({ idolId: "idol-1" }),
    }),
    useNavigate: () => mockNavigate,
    Link: ({
      children,
      to: _to,
      params: _params,
      ...rest
    }: React.AnchorHTMLAttributes<HTMLAnchorElement> & {
      to?: string;
      params?: Record<string, string>;
    }) => <a {...rest}>{children}</a>,
  };
});

interface IdolDetail {
  id: string;
  name: string;
  group: string;
  eloRating: number;
  wins: number;
  losses: number;
  winRate: number;
  photos: { id: string; imageUrl: string; sortOrder: number }[];
}

const byIdFn = vi.fn<() => Promise<IdolDetail>>();

vi.mock("@/utils/trpc", () => ({
  useTRPC: () => ({
    idols: {
      byId: {
        queryOptions: () => ({
          queryKey: ["idols", "byId", "idol-1"],
          queryFn: () => byIdFn(),
        }),
      },
    },
  }),
}));

vi.mock("../ranking/_utils/tier", () => ({
  getTier: (elo: number) => {
    if (elo >= 1700) return { label: "S", color: "#ff2e88" };
    if (elo >= 1600) return { label: "A", color: "#fff200" };
    return { label: "B", color: "#9d4dff" };
  },
}));

import { IdolDetailComponent } from "../idol/$idolId";
import { renderWithProviders } from "../../test/helpers";

describe("IdolDetailComponent (アイドル詳細画面)", () => {
  beforeEach(() => {
    mockNavigate.mockReset();
    byIdFn.mockReset();
  });

  test("ロード中は LOADING... を表示する", () => {
    byIdFn.mockImplementation(() => new Promise(() => {}));

    renderWithProviders(<IdolDetailComponent />);

    expect(screen.getByText("LOADING...")).toBeInTheDocument();
  });

  test("取得失敗時はエラーメッセージを表示する", async () => {
    byIdFn.mockRejectedValueOnce(new Error("not found"));

    renderWithProviders(<IdolDetailComponent />);

    expect(await screen.findByText(/アイドルが見つかりませんでした/)).toBeInTheDocument();
  });

  test("アイドル情報が表示される", async () => {
    byIdFn.mockResolvedValueOnce({
      id: "idol-1",
      name: "Sakura",
      group: "LE SSERAFIM",
      eloRating: 1620,
      wins: 127,
      losses: 23,
      winRate: 127 / 150,
      photos: [],
    });

    renderWithProviders(<IdolDetailComponent />);

    expect(await screen.findByText("SAKURA")).toBeInTheDocument();
    expect(screen.getByText("LE SSERAFIM")).toBeInTheDocument();
    expect(screen.getByText("1620")).toBeInTheDocument();
    expect(screen.getByText("127")).toBeInTheDocument();
    expect(screen.getByText("23")).toBeInTheDocument();
    expect(screen.getByText("85%")).toBeInTheDocument();
    expect(screen.getByText("A TIER")).toBeInTheDocument();
  });
});
