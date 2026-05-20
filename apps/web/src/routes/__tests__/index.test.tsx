import { describe, expect, test, vi, beforeEach } from "vitest";
import { screen } from "@testing-library/react";
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

import { renderWithProviders } from "../../test/helpers";
import { HomeComponent } from "../index";

describe("HomeComponent (トップ画面)", () => {
  beforeEach(() => {
    mockNavigate.mockReset();
  });

  test("タイトルと CTA ボタンが表示される", () => {
    renderWithProviders(<HomeComponent />);

    expect(screen.getByText("WHO IS YOUR")).toBeInTheDocument();
    expect(screen.getByText(/OSHI/)).toBeInTheDocument();
    expect(screen.getByText(/BATTLE/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /PRESS START/ })).toBeInTheDocument();
  });

  test("PRESS START を押すと /battle に遷移する", async () => {
    const user = userEvent.setup();
    renderWithProviders(<HomeComponent />);

    await user.click(screen.getByRole("button", { name: /PRESS START/ }));

    expect(mockNavigate).toHaveBeenCalledWith({ to: "/battle" });
  });
});
