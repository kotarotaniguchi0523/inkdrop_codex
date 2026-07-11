// @vitest-environment happy-dom

import { EditorState } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { afterEach, describe, expect, it } from "vitest";
import {
  arrangeExtension,
  DeferredTextGenerator,
  disposePluginHarnesses,
  trackEditor,
} from "./plugin-harness";

afterEach(() => {
  disposePluginHarnesses();
});

describe("Inkdrop Codex extension", () => {
  it("inserts the visible next-edit prediction when the user accepts it", async () => {
    // Arrange
    const { harness } = arrangeExtension("Hello", " world");
    harness.editor.dispatch({ selection: { anchor: 5 } });

    // Act
    await harness.run("inkdrop-codex:trigger-next-edit");
    const editorTextWhilePredicted = harness.editor.dom.textContent;
    await harness.run("inkdrop-codex:accept-next-edit");

    // Assert
    expect(editorTextWhilePredicted).toContain("Hello world");
    expect(harness.editor.state.doc.toString()).toBe("Hello world");
    expect(harness.editor.state.selection.main.head).toBe(11);
  });

  it("leaves the note unchanged when the user dismisses a prediction", async () => {
    // Arrange
    const { harness } = arrangeExtension("Hello", " world");
    harness.editor.dispatch({ selection: { anchor: 5 } });
    await harness.run("inkdrop-codex:trigger-next-edit");

    // Act
    await harness.run("inkdrop-codex:dismiss-next-edit");

    // Assert
    expect(harness.editor.state.doc.toString()).toBe("Hello");
    expect(harness.editor.dom.textContent).toBe("Hello");
  });

  it("does not accept a prediction after the source note changes", async () => {
    // Arrange
    const { harness } = arrangeExtension("Hello", " world");
    harness.editor.dispatch({ selection: { anchor: 5 } });
    await harness.run("inkdrop-codex:trigger-next-edit");

    // Act
    harness.editor.dispatch({ changes: { from: 0, insert: "Updated: " } });
    await harness.run("inkdrop-codex:accept-next-edit");

    // Assert
    expect(harness.editor.state.doc.toString()).toBe("Updated: Hello");
  });

  it("does not accept a prediction in a different active editor", async () => {
    // Arrange
    const { harness } = arrangeExtension("First", " predicted");
    harness.editor.dispatch({ selection: { anchor: 5 } });
    await harness.run("inkdrop-codex:trigger-next-edit");
    const parent = document.createElement("div");
    document.body.append(parent);
    const secondEditor = new EditorView({
      parent,
      state: EditorState.create({ doc: "Second" }),
    });
    trackEditor(secondEditor);

    // Act
    harness.setActiveEditor(secondEditor);
    await harness.run("inkdrop-codex:accept-next-edit");

    // Assert
    expect(secondEditor.state.doc.toString()).toBe("Second");
    expect(harness.editor.state.doc.toString()).toBe("First");
  });

  it("shows a next-edit prediction after the user stops typing in automatic mode", async () => {
    // Arrange
    const { harness } = arrangeExtension("Hello", " world", "automatic");

    // Act
    harness.editor.dispatch({
      changes: { from: 5, insert: "!" },
      selection: { anchor: 6 },
    });
    await new Promise((resolve) => setTimeout(resolve, 800));
    const visibleEditorText = harness.editor.dom.textContent;
    await harness.run("inkdrop-codex:accept-next-edit");

    // Assert
    expect(visibleEditorText).toContain("Hello! world");
    expect(harness.editor.state.doc.toString()).toBe("Hello! world");
  });

  it("does not run automatic prediction when the external setting is invalid", async () => {
    // Arrange
    const { harness } = arrangeExtension("Hello", " world", "unexpected-mode");

    // Act
    harness.editor.dispatch({ changes: { from: 5, insert: "!" }, selection: { anchor: 6 } });
    await new Promise((resolve) => setTimeout(resolve, 800));

    // Assert
    expect(harness.editor.state.doc.toString()).toBe("Hello!");
    expect(harness.editor.dom.textContent).toBe("Hello!");
  });

  it("replaces only the selected text through the public edit command", async () => {
    // Arrange
    const { harness } = arrangeExtension("Before old text after", "**new text**");
    harness.editor.dispatch({ selection: { anchor: 7, head: 15 } });

    // Act
    await harness.run("inkdrop-codex:edit");
    const instruction = document.querySelector<HTMLTextAreaElement>("textarea");
    const generate = [...document.querySelectorAll<HTMLButtonElement>("button")].find(
      (button) => button.textContent === "Generate",
    );
    if (!(instruction && generate)) {
      throw new Error("The edit prompt was not shown");
    }
    instruction.value = "Improve this";
    generate.click();

    // Assert
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(harness.editor.state.doc.toString()).toBe("Before **new text** after");
    expect(harness.editor.state.selection.main.head).toBe(19);
  });

  it("inserts generated Markdown at the cursor when no text is selected", async () => {
    // Arrange
    const { harness } = arrangeExtension("Start\n", "```mermaid\ngraph TD\nA-->B\n```");
    harness.editor.dispatch({ selection: { anchor: 6 } });

    // Act
    await harness.run("inkdrop-codex:edit");
    const instruction = document.querySelector<HTMLTextAreaElement>("textarea");
    const generate = [...document.querySelectorAll<HTMLButtonElement>("button")].find(
      (button) => button.textContent === "Generate",
    );
    if (!(instruction && generate)) {
      throw new Error("The edit prompt was not shown");
    }
    instruction.value = "Generate a flowchart";
    generate.click();
    await new Promise((resolve) => setTimeout(resolve, 0));

    // Assert
    expect(harness.editor.state.doc.toString()).toBe("Start\n```mermaid\ngraph TD\nA-->B\n```");
  });

  it("discards an inline result when the note changes while generation is pending", async () => {
    // Arrange
    const generator = new DeferredTextGenerator();
    const { harness } = arrangeExtension("Before old text after", generator);
    harness.editor.dispatch({ selection: { anchor: 7, head: 15 } });
    await harness.run("inkdrop-codex:edit");
    const instruction = document.querySelector<HTMLTextAreaElement>("textarea");
    const generate = [...document.querySelectorAll<HTMLButtonElement>("button")].find(
      (button) => button.textContent === "Generate",
    );
    if (!(instruction && generate)) {
      throw new Error("The edit prompt was not shown");
    }
    instruction.value = "Improve this";
    generate.click();

    // Act
    harness.editor.dispatch({ changes: { from: 0, insert: "Updated: " } });
    generator.resolve("replacement");
    await new Promise((resolve) => setTimeout(resolve, 0));

    // Assert
    expect(harness.editor.state.doc.toString()).toBe("Updated: Before old text after");
    expect(document.querySelector("textarea")).toBeNull();
  });

  it("removes its public commands and open UI when deactivated", async () => {
    // Arrange
    const { harness, plugin } = arrangeExtension("Hello", " world");
    await harness.run("inkdrop-codex:edit");
    expect(document.querySelector("textarea")).not.toBeNull();

    // Act
    plugin.deactivate?.(harness.environment);

    // Assert
    expect(document.querySelector("textarea")).toBeNull();
    expect(harness.accountCancelled).toBe(true);
    await expect(harness.run("inkdrop-codex:edit")).rejects.toThrow("Command is unavailable");
  });
});
