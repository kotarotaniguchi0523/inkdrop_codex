import type { EditorView } from "@codemirror/view";
import type { TextGenerator } from "../ai/codex-client";
import { inlinePrompt, PRESETS } from "../ai/prompts";

type AssistantControls = Readonly<{
  root: HTMLFormElement;
  input: HTMLTextAreaElement;
  generate: HTMLButtonElement;
}>;

const positionPopover = (root: HTMLElement, view: EditorView, position: number): void => {
  const coordinates = view.coordsAtPos(position);
  const editorBounds = view.dom.getBoundingClientRect();
  const left = coordinates?.left ?? editorBounds.left + 12;
  const bottom = coordinates?.bottom ?? editorBounds.top + 36;
  root.style.left = `${Math.max(12, Math.min(left, window.innerWidth - 390))}px`;
  root.style.top = `${Math.max(12, Math.min(bottom + 6, window.innerHeight - 220))}px`;
};

const createControls = (isSelectionEmpty: boolean, close: () => void): AssistantControls => {
  const root = document.createElement("form");
  root.className = "inkdrop-codex-popover";
  const input = document.createElement("textarea");
  input.rows = 2;
  input.placeholder = isSelectionEmpty ? "Describe what to write..." : "Describe how to edit...";
  const toolbar = document.createElement("div");
  toolbar.className = "inkdrop-codex-preset-list";
  toolbar.append(
    ...PRESETS.map((preset) => {
      const button = document.createElement("button");
      button.type = "button";
      button.textContent = preset.label;
      button.onclick = () => {
        input.value = preset.instruction;
        input.focus();
      };
      return button;
    }),
  );
  const footer = document.createElement("div");
  footer.className = "inkdrop-codex-actions";
  const cancel = document.createElement("button");
  cancel.type = "button";
  cancel.textContent = "Cancel";
  cancel.onclick = close;
  const generate = document.createElement("button");
  generate.type = "submit";
  generate.textContent = "Generate";
  footer.append(cancel, generate);
  root.append(toolbar, input, footer);
  return { generate, input, root };
};

export class InlineAssistant {
  private element: HTMLElement | null = null;
  private request: AbortController | null = null;
  private readonly client: TextGenerator;
  private readonly getModel: () => string | undefined;
  private readonly onError: (error: unknown) => void;

  constructor(
    client: TextGenerator,
    getModel: () => string | undefined,
    onError: (error: unknown) => void,
  ) {
    this.client = client;
    this.getModel = getModel;
    this.onError = onError;
  }

  close(): void {
    this.request?.abort();
    this.request = null;
    this.element?.remove();
    this.element = null;
  }

  private async generate(
    view: EditorView,
    controls: AssistantControls,
    from: number,
    to: number,
  ): Promise<void> {
    const instruction = controls.input.value.trim();
    if (!instruction) {
      return;
    }
    controls.input.disabled = true;
    controls.generate.disabled = true;
    controls.generate.textContent = "Generating...";
    const sourceDocument = view.state.doc;
    const selected = view.state.doc.sliceString(from, to);
    const context = view.state.doc.sliceString(
      Math.max(0, from - 3000),
      Math.min(view.state.doc.length, to + 3000),
    );
    const request = new AbortController();
    this.request = request;
    try {
      const result = await this.client.complete(
        inlinePrompt(instruction, selected, context),
        this.getModel(),
        request.signal,
      );
      if (this.request !== request || view.state.doc !== sourceDocument) {
        if (this.request === request) {
          this.close();
        }
        return;
      }
      view.dispatch({
        changes: { from, to, insert: result },
        selection: { anchor: from + result.length },
        scrollIntoView: true,
      });
      view.focus();
      this.close();
    } catch (error) {
      if (!request.signal.aborted) {
        this.onError(error);
      }
      controls.input.disabled = false;
      controls.generate.disabled = false;
      controls.generate.textContent = "Generate";
    }
  }

  open(view: EditorView): void {
    this.close();
    const { from, to, empty } = view.state.selection.main;
    const controls = createControls(empty, () => this.close());
    positionPopover(controls.root, view, to);
    controls.root.onsubmit = (event) => {
      event.preventDefault();
      this.generate(view, controls, from, to).catch(this.onError);
    };
    controls.root.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        this.close();
        view.focus();
      }
    });
    document.body.append(controls.root);
    this.element = controls.root;
    controls.input.focus();
  }
}
