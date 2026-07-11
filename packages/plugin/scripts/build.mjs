import { mkdir } from "node:fs/promises";
import { build } from "esbuild";

await mkdir("lib", { recursive: true });
await build({
  entryPoints: ["src/index.ts"],
  outfile: "lib/index.cjs",
  bundle: true,
  platform: "node",
  format: "cjs",
  target: "node24",
  sourcemap: true,
  external: ["inkdrop", "react", "@codemirror/state", "@codemirror/view", "@codemirror/commands"],
  logLevel: "info",
});
