import { spawn } from "node:child_process";
import { chmod, mkdir } from "node:fs/promises";

const { arch, platform } = process;
const extension = platform === "win32" ? ".exe" : "";
const output = `dist/${platform}-${arch}/credential-helper${extension}`;
await mkdir(`dist/${platform}-${arch}`, { recursive: true });

await new Promise((resolve, reject) => {
  const child = spawn("perry", ["compile", "src/main.ts", "-o", output], {
    stdio: "inherit",
    shell: platform === "win32",
  });
  child.on("error", reject);
  child.on("exit", (code) =>
    code === 0 ? resolve() : reject(new Error(`Perry exited with ${code}`)),
  );
});
if (platform !== "win32") {
  await chmod(output, 0o755);
}
