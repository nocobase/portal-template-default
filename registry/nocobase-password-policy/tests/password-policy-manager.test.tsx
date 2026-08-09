import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

const api = vi.hoisted(() => ({
  getPasswordPolicy: vi.fn(),
  listLockedUsers: vi.fn(),
}));

vi.mock("../password-policy-api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../password-policy-api")>()),
  getPasswordPolicy: api.getPasswordPolicy,
  listLockedUsers: api.listLockedUsers,
}));

import { PasswordPolicyManager } from "../password-policy-manager";

describe("PasswordPolicyManager", () => {
  it("shows an interactive demo policy when the backend plugin is unavailable", async () => {
    const user = userEvent.setup();
    const notFound = Object.assign(new Error("Not Found"), { status: 404 });
    api.getPasswordPolicy.mockRejectedValueOnce(notFound);
    api.listLockedUsers.mockRejectedValueOnce(notFound);

    render(<PasswordPolicyManager />);

    expect(await screen.findByText("Local demo mode")).toBeTruthy();
    expect(
      (screen.getByLabelText("Minimum password length") as HTMLInputElement)
        .value
    ).toBe("6");
    expect(screen.queryByText("Not Found")).toBeNull();

    const minLength = screen.getByLabelText("Minimum password length");
    await user.clear(minLength);
    await user.type(minLength, "12");
    await user.click(screen.getByRole("button", { name: "Save policy" }));
    expect((minLength as HTMLInputElement).value).toBe("12");

    await user.click(screen.getByRole("tab", { name: "Locked users (0)" }));
    await user.click(screen.getByRole("button", { name: "Lock user" }));
    await user.type(screen.getByLabelText("User ID"), "42");
    await user.type(screen.getByLabelText("Reason"), "Demo lock");
    await user.click(screen.getByRole("button", { name: /^Lock$/ }));

    expect(await screen.findByText("user-42")).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Unlock" }));
    expect(screen.queryByText("user-42")).toBeNull();
  });
});
