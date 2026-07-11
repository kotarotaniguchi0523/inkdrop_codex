import { EditorState, type Extension, StateEffect } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import type { Environment } from "@inkdropapp/types";
import {
  createInkdropCodexPlugin,
  type PluginServicesFactory,
  type TextGenerator,
} from "../src/index";

type CommandHandler = () => unknown;

class FixedTextGenerator implements TextGenerator {
  private readonly result: string;

  constructor(result: string) {
    this.result = result;
  }

  complete(): Promise<string> {
    return Promise.resolve(this.result);
  }
}

export class DeferredTextGenerator implements TextGenerator {
  private resolveCompletion: ((value: string) => void) | null = null;

  complete(): Promise<string> {
    return new Promise((resolve) => {
      this.resolveCompletion = resolve;
    });
  }

  resolve(value: string): void {
    this.resolveCompletion?.(value);
  }
}

export class InkdropHarness {
  accountCancelled = false;
  readonly editor: EditorView;
  readonly environment: Environment;
  readonly services: PluginServicesFactory;
  private activeEditor: EditorView;
  private readonly commands = new Map<string, CommandHandler>();
  private commandCompletion: Promise<unknown> = Promise.resolve();

  constructor(documentText: string, generator: TextGenerator, predictionMode: unknown = "manual") {
    const parent = document.createElement("div");
    document.body.append(parent);
    this.editor = new EditorView({
      parent,
      state: EditorState.create({ doc: documentText }),
    });
    this.activeEditor = this.editor;
    this.environment = this.createEnvironment(predictionMode);
    this.services = () => ({
      account: {
        cancel: () => {
          this.accountCancelled = true;
        },
        login: () => Promise.resolve(),
        logout: () => Promise.resolve(),
        openAccount: () => Promise.resolve(),
      },
      generator,
    });
  }

  private createEnvironment(predictionMode: unknown): Environment {
    return {
      commands: {
        add: (_target: Element, commandMap: Record<string, CommandHandler>) => {
          Object.entries(commandMap).reduce(
            (commands, [name, handler]) => commands.set(name, handler),
            this.commands,
          );
          return {
            dispose: () => {
              Object.keys(commandMap).reduce((commands, name) => {
                commands.delete(name);
                return commands;
              }, this.commands);
            },
          };
        },
        dispatch: (_target: Element, name: string, detail?: { extension: Extension }) => {
          if (name === "editor:add-extension" && detail) {
            this.editor.dispatch({ effects: StateEffect.appendConfig.of(detail.extension) });
            return true;
          }
          if (name === "editor:remove-extension") {
            return true;
          }
          const handler = this.commands.get(name);
          if (!handler) {
            return false;
          }
          this.commandCompletion = Promise.resolve(handler());
          return true;
        },
      },
      config: {
        get: (key: string) => (key.endsWith("predictionMode") ? predictionMode : ""),
      },
      getActiveEditor: () => this.activeEditor,
      notifications: { addError: () => undefined },
      userDataPath: "/tmp/inkdrop-codex-test",
    } as unknown as Environment;
  }

  async run(commandName: string): Promise<void> {
    const dispatched = this.environment.commands.dispatch(document.body, commandName);
    if (!dispatched) {
      throw new Error(`Command is unavailable: ${commandName}`);
    }
    await this.commandCompletion;
  }

  setActiveEditor(editor: EditorView): void {
    this.activeEditor = editor;
  }

  dispose(): void {
    this.editor.destroy();
  }
}

const harnesses: InkdropHarness[] = [];
const extraEditors: EditorView[] = [];

export const arrangeExtension = (
  documentText: string,
  generatedText: string | TextGenerator,
  predictionMode: unknown = "manual",
) => {
  const generator =
    typeof generatedText === "string" ? new FixedTextGenerator(generatedText) : generatedText;
  const harness = new InkdropHarness(documentText, generator, predictionMode);
  const plugin = createInkdropCodexPlugin(harness.services);
  plugin.activate(harness.environment);
  harnesses.push(harness);
  return { harness, plugin };
};

export const trackEditor = (editor: EditorView): void => {
  extraEditors.push(editor);
};

export const disposePluginHarnesses = (): void => {
  harnesses.splice(0).reduce((count, harness) => {
    harness.dispose();
    return count + 1;
  }, 0);
  extraEditors.splice(0).reduce((count, editor) => {
    editor.destroy();
    return count + 1;
  }, 0);
  document.body.replaceChildren();
};
