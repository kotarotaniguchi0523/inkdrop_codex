import { spawnSync } from "node:child_process";
import { isDeepStrictEqual } from "node:util";

const WORKSPACE_MANIFEST = /^packages\/[^/]+\/package\.json$/u;
const DEPENDENCY_SECTIONS = new Set([
  "dependencies",
  "devDependencies",
  "optionalDependencies",
  "peerDependencies",
]);
const DOCUMENTATION_FILES = new Set([
  "README.md",
  "README.ja.md",
  "LICENSE",
  ".github/CODEOWNERS",
  ".github/dependabot.yml",
]);
const FULL_CI_FILES = new Set([
  "flake.nix",
  "flake.lock",
  "tsconfig.json",
  "biome.json",
  "biome.jsonc",
  "scripts/classify-ci-changes.mjs",
  "scripts/check-release-workflow.mjs",
  "scripts/lint-workflows.sh",
]);
const [base = "HEAD^1", head = "HEAD"] = process.argv.slice(2);

const git = (...args) => {
  const result = spawnSync("git", args, { encoding: "utf8" });
  if (result.status !== 0) {
    throw result.error ?? new Error(result.stderr || `git ${args.join(" ")} failed`);
  }
  return result.stdout;
};

const changedFiles = git("diff", "--name-only", "--diff-filter=ACMR", base, head, "--")
  .split("\n")
  .filter(Boolean);

const result = {
  quality: false,
  helper: false,
  codeql: false,
  dependencies: false,
};

const enableAll = () => {
  result.quality = true;
  result.helper = true;
  result.codeql = true;
  result.dependencies = true;
};

const readJsonAt = (revision, file) => JSON.parse(git("show", `${revision}:${file}`));
const withoutDependencySections = (manifest) =>
  Object.fromEntries(Object.entries(manifest).filter(([key]) => !DEPENDENCY_SECTIONS.has(key)));

const rootManifestOnlyChangesDependencies = () => {
  try {
    const before = readJsonAt(base, "package.json");
    const after = readJsonAt(head, "package.json");
    return isDeepStrictEqual(withoutDependencySections(before), withoutDependencySections(after));
  } catch {
    return false;
  }
};

const manifests = changedFiles.filter(
  (file) => file === "package.json" || WORKSPACE_MANIFEST.test(file),
);
const lockfileChanged = changedFiles.includes("pnpm-lock.yaml");
const isDocumentation = (file) => DOCUMENTATION_FILES.has(file) || file.startsWith("docs/");
const isCredentialPackage = (file) =>
  file.startsWith("packages/credential-contract/") ||
  file.startsWith("packages/credential-helper/");
const requiresFullCi = (file) => FULL_CI_FILES.has(file) || file.startsWith(".github/workflows/");

const classifyFile = (file) => {
  if (isDocumentation(file)) {
    return;
  }

  if (file.startsWith("packages/plugin/")) {
    result.quality = true;
    if (file === "packages/plugin/package.json") {
      result.dependencies = true;
      return;
    }
    result.codeql = true;
    return;
  }

  if (isCredentialPackage(file)) {
    result.quality = true;
    result.helper = true;
    if (file.endsWith("/package.json")) {
      result.dependencies = true;
      return;
    }
    result.codeql = true;
    return;
  }

  if (file === "package.json") {
    result.quality = true;
    result.dependencies = true;
    if (rootManifestOnlyChangesDependencies()) {
      return;
    }
    result.helper = true;
    result.codeql = true;
    return;
  }

  if (file === "pnpm-lock.yaml") {
    result.quality = true;
    result.dependencies = true;
    return;
  }

  if (file === "pnpm-workspace.yaml") {
    enableAll();
    return;
  }

  if (requiresFullCi(file)) {
    enableAll();
    return;
  }

  // New paths are deliberately expensive until the policy explicitly classifies them.
  enableAll();
};

for (const file of changedFiles) {
  classifyFile(file);
}

// A lockfile-only edit cannot be attributed to a known workspace manifest, so build everything.
if (lockfileChanged && manifests.length === 0) {
  result.helper = true;
}

for (const [name, value] of Object.entries(result)) {
  process.stdout.write(`${name}=${value}\n`);
}
