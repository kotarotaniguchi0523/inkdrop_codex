// @vitest-environment happy-dom

import type { Credential, CredentialStore, Provider } from "@earendil-works/pi-ai";
import type { Environment } from "@inkdropapp/types";
import { describe, expect, it } from "vitest";
import { OAuthController } from "../src/auth/oauth-controller";
import { DialogService } from "../src/ui/dialog";

class DeferredLogin {
  readonly result: Promise<Credential>;
  signal: AbortSignal | undefined;
  private resolveCredential: ((credential: Credential) => void) | null = null;

  constructor() {
    this.result = new Promise((resolve) => {
      this.resolveCredential = resolve;
    });
  }

  resolve(credential: Credential): void {
    this.resolveCredential?.(credential);
  }

  start(signal: AbortSignal | undefined): Promise<Credential> {
    this.signal = signal;
    return this.result;
  }
}

describe("account lifecycle", () => {
  it("settles a pending prompt as cancelled when the dialog closes", async () => {
    // Arrange
    const dialogs = new DialogService();
    const result = dialogs.prompt("Sign in", "Enter the code");

    // Act
    dialogs.close();

    // Assert
    await expect(result).rejects.toThrow("Cancelled");
    expect(document.querySelector(".inkdrop-codex-overlay")).toBeNull();
  });

  it("does not persist credentials when login completes after cancellation", async () => {
    // Arrange
    const login = new DeferredLogin();
    const provider = {
      id: "openai-codex",
      auth: {
        oauth: { login: (callbacks: { signal?: AbortSignal }) => login.start(callbacks.signal) },
      },
    } as unknown as Provider;
    let modificationCount = 0;
    const store = {
      delete: () => Promise.resolve(),
      modify: () => {
        modificationCount += 1;
        return Promise.resolve(undefined);
      },
      read: () => Promise.resolve(undefined),
    } as CredentialStore;
    const app = {
      notifications: { addSuccess: () => undefined },
    } as unknown as Environment;
    const controller = new OAuthController(app, provider, store, new DialogService());
    const result = controller.login();

    // Act
    controller.cancel();
    login.resolve({
      type: "oauth",
      access: "access-token",
      refresh: "refresh-token",
      expires: 1_900_000_000_000,
    });
    await result;

    // Assert
    expect(login.signal?.aborted).toBe(true);
    expect(modificationCount).toBe(0);
  });
});
