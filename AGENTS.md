# Repository Guidelines

## Project Structure & Module Organization

This pnpm workspace contains three packages:

- `packages/plugin`: Inkdrop 6 extension. Source is split into `ai`, `auth`, `editor`, and `ui`; Inkdrop assets live in `keymaps`, `menus`, and `styles`.
- `packages/credential-helper`: Perry-native executable that encrypts credentials and accesses the OS credential vault.
- `packages/credential-contract`: Versioned request, response, and encrypted-envelope types shared across the process boundary.

Tests live beside each package in `test/`. Generated output in `packages/plugin/lib/` and `packages/credential-helper/dist/` must not be edited. See `docs/inkdrop-api.md` for architecture and live testing.

## Build, Test, and Development Commands

Enter the declared native toolchain with `nix develop`, then install dependencies with `pnpm install`.

- `pnpm quality`: required one-command gate; runs Biome, TypeScript, Vitest, Perry compatibility checks, and the plugin build.
- `pnpm biome:fix`: applies formatting, import organization, and safe lint fixes.
- `pnpm --filter inkdrop-codex build`: bundles the extension to CommonJS with esbuild.
- `pnpm build:helper`: compiles the platform-specific Perry credential helper.
- `pnpm test`: runs all workspace tests.

For live testing, run `ipm link --dev` from `packages/plugin`, enable Inkdrop Development Mode, and reload.

## Coding Style & Naming Conventions

Use TypeScript 7 targeting ECMAScript 2025. Biome enforces two-space indentation, double quotes, semicolons, organized imports, and a 100-column line width. Do not disable strict TypeScript or Biome rules to bypass errors. Use kebab-case filenames, PascalCase classes/types, camelCase functions, and SCREAMING_SNAKE_CASE only for constants. Keep dependencies directed toward interfaces and adapters; do not expose Perry details to editor modules.

## Testing Guidelines

Use Vitest and classical AAA tests. Test exported functions and classes through observable results, real `EditorState`/`EditorView`, and DOM state. Replace only external boundaries such as network AI with deterministic fakes. Avoid assertions about private state, internal helper calls, or invocation counts. Name tests `*.test.ts` and describe user-visible behavior.

## Commit & Pull Request Guidelines

No Git history exists yet. Use Conventional Commit subjects such as `feat(editor): add prediction acceptance` or `fix(auth): preserve encrypted credentials`. Pull requests should explain behavior changes, security implications, verification commands, and linked issues. Include Inkdrop screenshots for UI changes and document manual smoke-test results when editor, OAuth, or credential behavior changes.

## Security & Dependency Rules

Never log or persist plaintext access or refresh tokens. Credential operations must fail closed when Perry or the OS vault is unavailable. Add libraries with `pnpm add`; do not hand-edit lockfile dependency entries. Keep CodeMirror packages external in production bundles so Inkdrop supplies the runtime.
