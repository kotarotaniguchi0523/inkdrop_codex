export type InlinePreset =
  | "improve"
  | "shorten"
  | "expand"
  | "fix"
  | "mermaid"
  | "table"
  | "custom";

export const PRESETS: ReadonlyArray<{ id: InlinePreset; label: string; instruction: string }> = [
  {
    id: "improve",
    label: "Improve writing",
    instruction: "Improve clarity and structure while preserving meaning.",
  },
  {
    id: "shorten",
    label: "Make shorter",
    instruction: "Make the text concise without losing important information.",
  },
  {
    id: "expand",
    label: "Expand",
    instruction: "Expand the text with useful detail and coherent structure.",
  },
  { id: "fix", label: "Fix grammar", instruction: "Fix grammar, spelling, and punctuation." },
  {
    id: "mermaid",
    label: "Generate Mermaid",
    instruction: "Return a valid fenced mermaid diagram matching the request.",
  },
  {
    id: "table",
    label: "Generate table",
    instruction: "Return a concise Markdown table matching the request.",
  },
];

export function inlinePrompt(instruction: string, selected: string, context: string): string {
  return `Instruction:\n${instruction}\n\n${selected ? `Text to replace:\n${selected}` : "Insert new Markdown at the cursor."}\n\nNearby note context:\n${context}\n\nReturn only the final Markdown. Do not wrap ordinary text in a code fence.`;
}

export function nextEditPrompt(before: string, after: string): string {
  return `Predict the single most useful continuation at the cursor in this Markdown note. Return only the text to insert. Keep it short and do not repeat existing text.\n\nBefore cursor:\n${before}\n\nAfter cursor:\n${after}`;
}
