import type { AuthLoginCallbacks, CredentialStore, Provider } from "@earendil-works/pi-ai";
import type { Environment } from "@inkdropapp/types";
import type { DialogService } from "../ui/dialog";

export class OAuthController {
  private operation = 0;
  private readonly app: Environment;
  private readonly provider: Provider;
  private readonly store: CredentialStore;
  private readonly dialogs: DialogService;
  private loginAbortController: AbortController | null = null;

  constructor(
    app: Environment,
    provider: Provider,
    store: CredentialStore,
    dialogs: DialogService,
  ) {
    this.app = app;
    this.provider = provider;
    this.store = store;
    this.dialogs = dialogs;
  }

  async login(): Promise<void> {
    this.loginAbortController?.abort();
    this.operation += 1;
    const { operation } = this;
    const loginAbortController = new AbortController();
    this.loginAbortController = loginAbortController;
    const { oauth } = this.provider.auth;
    if (!oauth) {
      throw new Error("Codex OAuth is unavailable");
    }
    const callbacks: AuthLoginCallbacks = {
      signal: loginAbortController.signal,
      prompt: (prompt) => {
        const options: {
          placeholder?: string;
          secret?: boolean;
          choices?: readonly { id: string; label: string; description?: string }[];
          signal?: AbortSignal;
        } = {};
        if ("placeholder" in prompt && prompt.placeholder) {
          options.placeholder = prompt.placeholder;
        }
        if (prompt.type === "secret") {
          options.secret = true;
        }
        if (prompt.type === "select") {
          options.choices = prompt.options;
        }
        if (prompt.signal) {
          options.signal = prompt.signal;
        }
        return this.dialogs.prompt("Sign in to Codex", prompt.message, options);
      },
      notify: (event) => {
        if (event.type === "auth_url") {
          this.app.appDelegate.openExternal(event.url).catch(() => undefined);
          this.dialogs.info(
            "Browser opened",
            event.instructions ??
              "Complete sign-in in your browser. You can paste the redirected URL if the callback does not complete.",
          );
        }
        if (event.type === "device_code") {
          this.app.appDelegate.openExternal(event.verificationUri).catch(() => undefined);
          this.dialogs.info("Device code", `Enter this code in the browser: ${event.userCode}`);
        }
        if (event.type === "progress") {
          this.app.notifications.addInfo(event.message, { dismissable: true });
        }
      },
    };
    try {
      const credential = await oauth.login(callbacks);
      if (operation !== this.operation) {
        return;
      }
      await this.store.modify(this.provider.id, async () => credential);
      if (operation !== this.operation) {
        return;
      }
      this.app.notifications.addSuccess("Signed in to Codex");
    } finally {
      if (this.loginAbortController === loginAbortController) {
        this.loginAbortController = null;
      }
    }
  }

  cancel(): void {
    this.operation += 1;
    this.loginAbortController?.abort();
    this.loginAbortController = null;
    this.dialogs.close();
  }

  async logout(): Promise<void> {
    this.operation += 1;
    await this.store.delete(this.provider.id);
    this.app.notifications.addSuccess("Signed out of Codex");
  }

  async openAccount(): Promise<void> {
    const credential = await this.store.read(this.provider.id);
    const choice = await this.dialogs.prompt(
      "Codex account",
      credential ? "Codex is connected." : "Connect your ChatGPT account to use Codex.",
      {
        choices: credential
          ? [
              { id: "login", label: "Sign in again" },
              { id: "logout", label: "Sign out" },
            ]
          : [{ id: "login", label: "Sign in" }],
      },
    );
    if (choice === "logout") {
      await this.logout();
    } else {
      await this.login();
    }
  }
}
