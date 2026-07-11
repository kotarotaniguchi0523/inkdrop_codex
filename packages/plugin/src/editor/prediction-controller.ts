import type { EditorView, ViewUpdate } from "@codemirror/view";
import { ViewPlugin } from "@codemirror/view";
import type { TextGenerator } from "../ai/codex-client";
import { nextEditPrompt } from "../ai/prompts";
import type { PredictionMode } from "../config/plugin-settings";
import { setPrediction } from "./prediction-extension";

export class PredictionController {
  private current: {
    document: EditorView["state"]["doc"];
    position: number;
    text: string;
    view: EditorView;
  } | null = null;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private request: AbortController | null = null;
  private readonly client: TextGenerator;
  private readonly getMode: () => PredictionMode;
  private readonly getModel: () => string | undefined;
  private readonly onError: (error: unknown) => void;

  constructor(
    client: TextGenerator,
    getMode: () => PredictionMode,
    getModel: () => string | undefined,
    onError: (error: unknown) => void,
  ) {
    this.client = client;
    this.getMode = getMode;
    this.getModel = getModel;
    this.onError = onError;
  }

  viewPlugin() {
    const controller = this;
    return ViewPlugin.fromClass(
      class {
        readonly view: EditorView;

        constructor(view: EditorView) {
          this.view = view;
        }
        update(update: ViewUpdate) {
          if (update.docChanged && controller.getMode() === "automatic") {
            controller.schedule(update.view);
          }
        }
        destroy() {
          controller.cancel();
        }
      },
    );
  }

  schedule(view: EditorView): void {
    this.cancel();
    this.timer = setTimeout(() => {
      this.trigger(view).catch(this.onError);
    }, 700);
  }

  async trigger(view: EditorView): Promise<void> {
    if (this.getMode() === "disabled" || !view.state.selection.main.empty) {
      return;
    }
    this.cancel();
    const sourceDocument = view.state.doc;
    const position = view.state.selection.main.head;
    const before = view.state.doc.sliceString(Math.max(0, position - 4000), position);
    const after = view.state.doc.sliceString(
      position,
      Math.min(view.state.doc.length, position + 1000),
    );
    const request = new AbortController();
    this.request = request;
    try {
      const text = await this.client.complete(
        nextEditPrompt(before, after),
        this.getModel(),
        request.signal,
      );
      if (
        this.request !== request ||
        view.state.doc !== sourceDocument ||
        view.state.selection.main.head !== position ||
        !text
      ) {
        return;
      }
      this.current = { document: sourceDocument, position, text, view };
      view.dispatch({ effects: setPrediction.of(this.current) });
    } catch (error) {
      if (this.request !== request || request.signal.aborted) {
        return;
      }
      this.onError(error);
    }
  }

  accept(view: EditorView): boolean {
    if (!this.current) {
      return false;
    }
    const { document, position, text, view: sourceView } = this.current;
    if (
      view !== sourceView ||
      view.state.doc !== document ||
      view.state.selection.main.head !== position
    ) {
      this.clearCurrent();
      return false;
    }
    view.dispatch({
      changes: { from: position, insert: text },
      selection: { anchor: position + text.length },
      effects: setPrediction.of(null),
    });
    this.current = null;
    return true;
  }

  dismiss(view: EditorView): boolean {
    if (!this.current) {
      return false;
    }
    const isSourceView = this.current.view === view;
    this.clearCurrent();
    if (!isSourceView) {
      return false;
    }
    return true;
  }

  private clearCurrent(): void {
    const { current } = this;
    this.current = null;
    current?.view.dispatch({ effects: setPrediction.of(null) });
  }

  cancel(): void {
    if (this.timer) {
      clearTimeout(this.timer);
    }
    this.timer = null;
    this.request?.abort();
    this.request = null;
    this.clearCurrent();
  }
}
