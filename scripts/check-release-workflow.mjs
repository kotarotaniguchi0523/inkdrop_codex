import { readFile } from "node:fs/promises";

const normalizeLineEndings = (source) => source.replaceAll("\r\n", "\n");
const ci = normalizeLineEndings(await readFile(".github/workflows/ci.yml", "utf8"));
const release = normalizeLineEndings(await readFile(".github/workflows/release.yml", "utf8"));
const releaseConcurrencyPolicy = [
  "group: release-",
  "$",
  "{{ github.run_id }}\n  cancel-in-progress: false",
].join("");

const requirePolicy = (condition, message) => {
  if (!condition) {
    throw new Error(`Release workflow policy violation: ${message}`);
  }
};

const count = (source, pattern) => [...source.matchAll(pattern)].length;

requirePolicy(!ci.includes("workflow_dispatch"), "normal CI must not build release artifacts");
requirePolicy(!ci.includes("Publish approved release"), "publishing must stay isolated from CI");
requirePolicy(
  release.includes("on:\n  workflow_dispatch:\n\npermissions:\n  contents: read"),
  "release must be manual and read-only by default",
);
requirePolicy(!release.includes("pull_request_target"), "pull_request_target is forbidden");
requirePolicy(!release.includes("pull_request:"), "pull requests must not invoke release jobs");
requirePolicy(!release.includes("push:"), "pushes and tags must not invoke release jobs");
requirePolicy(
  release.includes(releaseConcurrencyPolicy),
  "a pending approval must not be cancelled or replaced by another run",
);
requirePolicy(
  release.includes('test "$GITHUB_REF" = "refs/heads/main"') &&
    release.includes('test "$GITHUB_ACTOR" = "$REPOSITORY_OWNER"') &&
    release.includes('test "$TRIGGERING_ACTOR" = "$REPOSITORY_OWNER"'),
  "only an owner-triggered main build may reach the release boundary",
);
requirePolicy(
  release.includes("environment: inkdrop-production") &&
    release.includes("needs: [preflight, bundle]") &&
    release.includes("contents: write\n      id-token: write\n      attestations: write"),
  "write and signing permissions must exist only behind production approval",
);
requirePolicy(
  count(release, /name: inkdrop-codex-release-bundle/gu) === 2,
  "the upload and publish jobs must use the same release artifact name",
);
requirePolicy(
  !(release.includes("run-id:") || release.includes("github-token:")),
  "release artifacts must come from the current workflow run",
);
requirePolicy(
  release.includes('test "$current_main" = "$GITHUB_SHA"') &&
    release.includes("sha256sum --check checksums.txt") &&
    release.includes('--target "$GITHUB_SHA"'),
  "publication must target the tested current-main commit after checksum verification",
);
requirePolicy(
  release.includes("actions/attest-build-provenance@"),
  "published archives must receive a provenance attestation",
);

for (const [name, workflow] of [
  ["CI", ci],
  ["release", release],
]) {
  const uses = [...workflow.matchAll(/^\s*uses:\s*([^\s#]+).*$/gmu)].map((match) => match[1]);
  requirePolicy(uses.length > 0, `${name} workflow must contain actions`);
  for (const action of uses) {
    requirePolicy(
      /@\p{ASCII_Hex_Digit}{40}$/u.test(action),
      `${action} must use a full commit SHA`,
    );
  }

  const checkoutCount = count(workflow, /uses: actions\/checkout@/gu);
  const credentialBlockCount = count(workflow, /persist-credentials: false/gu);
  requirePolicy(
    checkoutCount === credentialBlockCount,
    `${name} workflow checkouts must not persist credentials`,
  );
}

process.stdout.write("Release workflow security policy passed\n");
