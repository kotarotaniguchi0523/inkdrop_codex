import { StateEffect, StateField } from "@codemirror/state";
import { Decoration, type DecorationSet, EditorView, keymap, WidgetType } from "@codemirror/view";

export const setPrediction = StateEffect.define<{ position: number; text: string } | null>();

const predictionField = StateField.define<DecorationSet>({
  create: () => Decoration.none,
  update(value, transaction) {
    const prediction = transaction.effects.find((effect) => effect.is(setPrediction));
    if (prediction) {
      if (!prediction.value?.text) {
        return Decoration.none;
      }
      class PredictionWidget extends WidgetType {
        private readonly text: string;

        constructor(text: string) {
          super();
          this.text = text;
        }
        toDOM(): HTMLElement {
          const span = document.createElement("span");
          span.className = "inkdrop-codex-ghost";
          span.textContent = this.text;
          return span;
        }
      }
      const widget = Decoration.widget({
        side: 1,
        widget: new PredictionWidget(prediction.value.text),
      });
      return Decoration.set([widget.range(prediction.value.position)]);
    }
    return transaction.docChanged ? Decoration.none : value.map(transaction.changes);
  },
  provide: (field) => EditorView.decorations.from(field),
});

export interface PredictionActions {
  accept: (view: EditorView) => boolean;
  dismiss: (view: EditorView) => boolean;
}

export function predictionExtension(actions: PredictionActions) {
  return [
    predictionField,
    keymap.of([
      { key: "Tab", run: (view) => actions.accept(view) },
      { key: "Escape", run: (view) => actions.dismiss(view) },
    ]),
  ];
}
