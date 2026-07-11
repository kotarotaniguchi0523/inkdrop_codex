import { cp, mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const repositoryRoot = path.resolve(packageRoot, "../..");
const outputRoot = path.join(repositoryRoot, "artifacts", "inkdrop-codex");
const HELPER_BINARY_NAME = /^credential-helper(?:\.exe)?$/u;

const copyDirectory = async (name) => {
  await cp(path.join(packageRoot, name), path.join(outputRoot, name), { recursive: true });
};

const findHelperBinaries = async (directory) => {
  const entries = await readdir(directory, { recursive: true, withFileTypes: true });
  return entries.filter((entry) => entry.isFile() && HELPER_BINARY_NAME.test(entry.name));
};

const sourcePackage = JSON.parse(await readFile(path.join(packageRoot, "package.json"), "utf8"));
const publishPackage = {
  name: sourcePackage.name,
  version: sourcePackage.version,
  description: sourcePackage.description,
  license: sourcePackage.license,
  repository: sourcePackage.repository,
  keywords: sourcePackage.keywords,
  main: sourcePackage.main,
  engines: sourcePackage.engines,
  styleSheets: sourcePackage.styleSheets,
  keymaps: sourcePackage.keymaps,
  menus: sourcePackage.menus,
  configSchema: sourcePackage.configSchema,
};

await rm(outputRoot, { recursive: true, force: true });
await mkdir(outputRoot, { recursive: true });
await Promise.all(["styles", "keymaps", "menus", "bin"].map(copyDirectory));
await mkdir(path.join(outputRoot, "lib"), { recursive: true });
await cp(path.join(packageRoot, "lib", "index.cjs"), path.join(outputRoot, "lib", "index.cjs"));

const helpers = await findHelperBinaries(path.join(outputRoot, "bin"));
if (helpers.length === 0) {
  throw new Error("No credential helper binaries were staged under packages/plugin/bin");
}

await Promise.all([
  cp(path.join(repositoryRoot, "README.md"), path.join(outputRoot, "README.md")),
  cp(path.join(repositoryRoot, "README.ja.md"), path.join(outputRoot, "README.ja.md")),
  cp(path.join(repositoryRoot, "LICENSE"), path.join(outputRoot, "LICENSE")),
  writeFile(path.join(outputRoot, "package.json"), `${JSON.stringify(publishPackage, null, 2)}\n`),
]);

process.stdout.write(
  `Prepared ${outputRoot} with ${helpers.length} credential helper binary files\n`,
);
