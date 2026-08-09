import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  switchSpace: vi.fn(),
}));

vi.mock("../space-provider", () => ({
  useMultiSpace: () => ({
    spaces: [
      { name: "alpha", title: "Alpha" },
      { name: "beta", title: "Beta" },
      {
        name: "__unassigned__",
        title:
          '{{t("(Unassigned Space)", { ns: "@nocobase/plugin-multi-space" })}}',
      },
    ],
    current: ["alpha"],
    viewed: ["alpha"],
    loading: false,
    switchSpace: state.switchSpace,
    refresh: vi.fn(),
  }),
}));

vi.mock("../i18n", () => ({
  useMultiSpaceTranslation: () =>
    (_key: string, fallback: string) => fallback,
}));

import { SpaceSwitcher } from "../space-switcher";

describe("SpaceSwitcher", () => {
  it("is visible on a page and switches the active space", () => {
    render(<SpaceSwitcher />);

    const select = screen.getByRole("combobox", { name: "Switch workspace" });
    expect((select as HTMLSelectElement).value).toBe("alpha");
    fireEvent.change(select, { target: { value: "beta" } });
    expect(state.switchSpace).toHaveBeenCalledWith("beta");
  });

  it("resolves translatable space titles returned by the API", () => {
    render(<SpaceSwitcher />);

    expect(screen.getByRole("option", { name: "(Unassigned Space)" })).toBeTruthy();
    expect(
      screen.queryByText(
        '{{t("(Unassigned Space)", { ns: "@nocobase/plugin-multi-space" })}}'
      )
    ).toBeNull();
  });
});
