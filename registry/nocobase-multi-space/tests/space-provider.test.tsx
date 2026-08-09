import { render, screen, waitFor } from "@testing-library/react";
import { useEffect } from "react";
import { describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  getMySpaces: vi.fn(),
  headerProvider: undefined as undefined | (() => Record<string, unknown>),
  observedHeaders: [] as Array<Record<string, unknown> | undefined>,
}));

vi.mock("@nocobase/portal-sdk/client", () => ({
  nocobaseClient: {
    addHeaderProvider: (provider: () => Record<string, unknown>) => {
      state.headerProvider = provider;
      return vi.fn();
    },
  },
}));

vi.mock("../space-api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../space-api")>()),
  getMySpaces: state.getMySpaces,
}));

import { MultiSpaceProvider } from "../space-provider";

function ChildRequest() {
  useEffect(() => {
    state.observedHeaders.push(state.headerProvider?.());
  }, []);
  return <div>Child ready</div>;
}

describe("MultiSpaceProvider bootstrap", () => {
  it("registers hydrated space headers before rendering request children", async () => {
    state.getMySpaces.mockResolvedValueOnce({
      spaces: [{ name: "alpha" }],
      defaultSpaceName: "alpha",
      viewableSpaceNames: [],
    });

    render(
      <MultiSpaceProvider>
        <ChildRequest />
      </MultiSpaceProvider>
    );

    expect(screen.queryByText("Child ready")).toBeNull();
    expect(await screen.findByText("Child ready")).toBeTruthy();
    await waitFor(() => expect(state.observedHeaders).toHaveLength(1));
    expect(state.observedHeaders[0]).toEqual({
      "x-spaces": "alpha",
      "x-spaces-view": "alpha",
    });
  });
});
