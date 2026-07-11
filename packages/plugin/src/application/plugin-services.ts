import type { Environment } from "@inkdropapp/types";
import { CodexClient, type TextGenerator } from "../ai/codex-client";
import { EncryptedCredentialStore } from "../auth/encrypted-store";
import { CredentialHelperClient } from "../auth/helper-client";
import { OAuthController } from "../auth/oauth-controller";
import type { DialogService } from "../ui/dialog";

export type AccountActions = Readonly<{
  cancel: () => void;
  openAccount: () => Promise<void>;
  login: () => Promise<void>;
  logout: () => Promise<void>;
}>;

export type PluginServices = Readonly<{
  account: AccountActions;
  generator: TextGenerator;
}>;

export type PluginServicesFactory = (
  app: Environment,
  packageRoot: string,
  dialogs: DialogService,
) => PluginServices;

export const createProductionServices: PluginServicesFactory = (app, packageRoot, dialogs) => {
  const store = new EncryptedCredentialStore(
    app.userDataPath,
    new CredentialHelperClient(packageRoot),
  );
  const client = new CodexClient(store);
  return {
    account: new OAuthController(app, client.provider, store, dialogs),
    generator: client,
  };
};
