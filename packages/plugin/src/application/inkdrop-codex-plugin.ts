import path from "node:path";
import type { Extension } from "@codemirror/state";
import type { ConfigSchema, Environment, IInkdropPlugin } from "@inkdropapp/types";
import { PluginSettings } from "../config/plugin-settings";
import { PredictionController } from "../editor/prediction-controller";
import { predictionExtension } from "../editor/prediction-extension";
import { DialogService } from "../ui/dialog";
import { InlineAssistant } from "../ui/inline-assistant";
import {
  type AccountActions,
  createProductionServices,
  type PluginServicesFactory,
} from "./plugin-services";

const CONFIG_NAMESPACE = "inkdrop-codex";

const createErrorReporter =
  (app: Environment) =>
  (error: unknown): void => {
    app.notifications.addError("Inkdrop Codex", {
      detail: error instanceof Error ? error.message : String(error),
      dismissable: true,
    });
  };

export class InkdropCodexPlugin implements IInkdropPlugin {
  config: Record<string, ConfigSchema> = {
    predictionMode: {
      title: "Next edit prediction",
      type: "string",
      default: "manual",
      enum: ["automatic", "manual", "disabled"],
    },
    model: { title: "Codex model", type: "string", default: "" },
  };

  private readonly disposables: Readonly<{ dispose: () => void }>[] = [];
  private extension: Extension | null = null;
  private assistant: InlineAssistant | null = null;
  private prediction: PredictionController | null = null;
  private dialogs: DialogService | null = null;
  private account: AccountActions | null = null;
  private readonly createServices: PluginServicesFactory;

  constructor(createServices: PluginServicesFactory = createProductionServices) {
    this.createServices = createServices;
  }

  activate(app: Environment): void {
    const dialogs = new DialogService();
    const services = this.createServices(app, path.resolve(__dirname, ".."), dialogs);
    const model = () => PluginSettings.parseModelId(app.config.get(`${CONFIG_NAMESPACE}.model`));
    const report = createErrorReporter(app);
    const prediction = new PredictionController(
      services.generator,
      () =>
        PluginSettings.parsePredictionMode(app.config.get(`${CONFIG_NAMESPACE}.predictionMode`)),
      model,
      report,
    );
    const assistant = new InlineAssistant(services.generator, model, report);
    const extension = [predictionExtension(prediction), prediction.viewPlugin()];

    app.commands.dispatch(document.body, "editor:add-extension", { extension });
    this.disposables.push(
      app.commands.add(document.body, {
        "inkdrop-codex:edit": () => {
          const editor = app.getActiveEditor();
          if (editor) {
            assistant.open(editor);
          }
        },
        "inkdrop-codex:trigger-next-edit": () => {
          const editor = app.getActiveEditor();
          if (editor) {
            return prediction.trigger(editor);
          }
        },
        "inkdrop-codex:accept-next-edit": () => {
          const editor = app.getActiveEditor();
          if (editor) {
            prediction.accept(editor);
          }
        },
        "inkdrop-codex:dismiss-next-edit": () => {
          const editor = app.getActiveEditor();
          if (editor) {
            prediction.dismiss(editor);
          }
        },
        "inkdrop-codex:open-account": () =>
          services.account.openAccount().catch((error) => {
            report(error);
          }),
        "inkdrop-codex:login": () =>
          services.account.login().catch((error) => {
            report(error);
          }),
        "inkdrop-codex:logout": () =>
          services.account.logout().catch((error) => {
            report(error);
          }),
      }),
    );
    this.extension = extension;
    this.assistant = assistant;
    this.prediction = prediction;
    this.dialogs = dialogs;
    this.account = services.account;
  }

  deactivate(app: Environment): void {
    this.assistant?.close();
    this.prediction?.cancel();
    this.account?.cancel();
    this.dialogs?.close();
    this.disposables.splice(0).reduce((count, disposable) => {
      disposable.dispose();
      return count + 1;
    }, 0);
    if (this.extension) {
      app.commands.dispatch(document.body, "editor:remove-extension", {
        extension: this.extension,
      });
    }
    this.extension = null;
    this.account = null;
  }
}

export const createInkdropCodexPlugin = (
  createServices: PluginServicesFactory = createProductionServices,
): IInkdropPlugin => new InkdropCodexPlugin(createServices);
