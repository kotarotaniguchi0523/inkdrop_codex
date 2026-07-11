// @vitest-environment happy-dom

import { EditorState } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { describe, expect, it } from "vitest";
import type { TextGenerator } from "../src/ai/codex-client";
import { PredictionController } from "../src/editor/prediction-controller";
import { predictionExtension } from "../src/editor/prediction-extension";

class IgnoringAbortGenerator implements TextGenerator {
  readonly requests: Array<{
    reject: (error: Error) => void;
    resolve: (value: string) => void;
    signal: AbortSignal | undefined;
  }> = [];

  complete(_prompt: string, _model: string | undefined, signal?: AbortSignal): Promise<string> {
    return new Promise((resolve, reject) => {
      this.requests.push({ reject, resolve, signal });
    });
  }

  requestAt(index: number) {
    const request = this.requests[index];
    if (!request) {
      throw new Error(`Missing request at index ${index}`);
    }
    return request;
  }
}

describe("prediction cancellation", () => {
  it("ignores a canceled provider response after a newer request starts", async () => {
    // Arrange
    const generator = new IgnoringAbortGenerator();
    const controller = new PredictionController(
      generator,
      () => "manual",
      () => undefined,
      () => {
        throw new Error("Unexpected prediction error");
      },
    );
    const parent = document.createElement("div");
    document.body.append(parent);
    const view = new EditorView({
      parent,
      state: EditorState.create({ doc: "Hello", extensions: predictionExtension(controller) }),
    });
    view.dispatch({ selection: { anchor: 5 } });
    const first = controller.trigger(view);
    const second = controller.trigger(view);

    // Act
    generator.requestAt(0).resolve(" stale");
    await first;
    generator.requestAt(1).resolve(" current");
    await second;

    // Assert
    expect(generator.requestAt(0).signal?.aborted).toBe(true);
    expect(view.dom.textContent).toContain("Hello current");
    expect(view.dom.textContent).not.toContain("Hello stale");
    view.destroy();
  });

  it("does not report an error from a canceled request after teardown", async () => {
    // Arrange
    const generator = new IgnoringAbortGenerator();
    let errorCount = 0;
    const controller = new PredictionController(
      generator,
      () => "manual",
      () => undefined,
      () => {
        errorCount += 1;
      },
    );
    const parent = document.createElement("div");
    document.body.append(parent);
    const view = new EditorView({ parent, state: EditorState.create({ doc: "Hello" }) });
    const request = controller.trigger(view);
    controller.cancel();

    // Act
    generator.requestAt(0).reject(new Error("late failure"));
    await request;

    // Assert
    expect(errorCount).toBe(0);
    view.destroy();
  });
});
