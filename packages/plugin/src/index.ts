import { createInkdropCodexPlugin } from "./application/inkdrop-codex-plugin";

export type { TextGenerator } from "./ai/codex-client";
export {
  createInkdropCodexPlugin,
  InkdropCodexPlugin,
} from "./application/inkdrop-codex-plugin";
export type {
  AccountActions,
  PluginServices,
  PluginServicesFactory,
} from "./application/plugin-services";
export { EncryptedCredentialStore } from "./auth/encrypted-store";
export type { CredentialCryptography } from "./auth/helper-client";

export default createInkdropCodexPlugin();
