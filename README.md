# Inkdrop Codex

[日本語](./README.ja.md) | English

An Inkdrop 6 extension that uses a Codex subscription through
`@earendil-works/pi-ai`.

## Features

- Generate Markdown at the cursor or replace the current selection.
- Rewrite text and generate Mermaid diagrams or Markdown tables from presets.
- Show manual or automatic next-edit predictions as ghost text.
- Accept a prediction with `Tab` or dismiss it with `Escape`.
- Sign in through Codex browser OAuth or the device-code fallback.
- Encrypt OAuth credentials with AES-256-GCM and store the envelope key in the OS
  credential vault through Perry.

The extension does not store chat history or read other notes. It sends only the selected text
and a bounded portion of the active note to Codex.

## Development

```sh
nix develop
pnpm install
pnpm quality
```

`pnpm quality` runs Biome formatting and lint checks, TypeScript 7 checks, tests, Perry
compatibility checks, and the plugin build. Apply safe formatting and lint fixes with
`pnpm biome:fix`.

Nix declares the native development toolchain, and its input revisions become reproducible once
`flake.lock` is generated and committed. pnpm and `pnpm-lock.yaml` pin JavaScript dependencies.
The project targets Node.js 24 and ECMAScript 2025, so the Node 24 type definitions are
intentionally used instead of the incompatible latest major version.

See [Inkdrop API and hands-on testing](./docs/inkdrop-api.md) for the APIs used by this extension
and the procedure for loading it into Inkdrop 6.

## Native credential helper

Build the Perry helper once for every supported platform and architecture:

```sh
pnpm build:helper
```

Copy the executable from `packages/credential-helper/dist/<platform>-<arch>/` to
`packages/plugin/bin/<platform>-<arch>/` before packaging. There is no plaintext fallback.

## Commands

- `inkdrop-codex:edit`
- `inkdrop-codex:trigger-next-edit`
- `inkdrop-codex:accept-next-edit`
- `inkdrop-codex:dismiss-next-edit`
- `inkdrop-codex:open-account`
- `inkdrop-codex:login`
- `inkdrop-codex:logout`

The default bindings are `Ctrl-Enter` for inline editing and `Alt-\` for a manual prediction.
