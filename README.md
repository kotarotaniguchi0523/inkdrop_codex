# Inkdrop Codex

[![CI](https://github.com/kotarotaniguchi0523/inkdrop_codex/actions/workflows/ci.yml/badge.svg)](https://github.com/kotarotaniguchi0523/inkdrop_codex/actions/workflows/ci.yml)
[![CodeQL](https://github.com/kotarotaniguchi0523/inkdrop_codex/actions/workflows/codeql.yml/badge.svg)](https://github.com/kotarotaniguchi0523/inkdrop_codex/actions/workflows/codeql.yml)

[日本語](./README.ja.md) | English

Inkdrop Codex is an Inkdrop 6 extension for writing and editing Markdown with your Codex
subscription. It provides an inline assistant, rewrite presets, and next-edit predictions without
leaving the editor.

## Features and shortcuts

Shortcuts work while the Markdown editor is focused.

| Feature | Shortcut | What it does |
| --- | --- | --- |
| Open the inline assistant | `Ctrl+Enter` | Opens an instruction popover at the cursor or selection. |
| Request a next-edit prediction | `Alt+\` | Shows a suggested continuation as ghost text at the cursor. |
| Accept a visible prediction | `Tab` | Inserts the ghost text into the note. Active only while a prediction is visible. |
| Dismiss a visible prediction | `Escape` | Removes the ghost text without changing the note. |
| Close the inline assistant | `Escape` | Closes the instruction popover without changing the note. |

### Windows and Linux keymap

The default Windows and Linux bindings are identical.

| Feature | Windows | Linux | When available |
| --- | --- | --- | --- |
| Open the inline assistant | `Ctrl+Enter` | `Ctrl+Enter` | While the Markdown editor is focused |
| Request a manual prediction | `Alt+\` | `Alt+\` | At an empty cursor when prediction mode is not disabled |
| Accept a prediction | `Tab` | `Tab` | Only while ghost text is visible |
| Dismiss a prediction | `Escape` | `Escape` | Only while ghost text is visible |
| Close the inline assistant | `Escape` | `Escape` | While the instruction popover is open |
| Open Account | No default shortcut | No default shortcut | Use **Plugins → Inkdrop Codex → Account** |
| Automatic prediction | No shortcut required | No shortcut required | Runs after typing pauses in `automatic` mode |

On a Japanese keyboard, the `\` key used by `Alt+\` may be labeled `¥`.

### Write new Markdown

Place the cursor where the new content should go and press `Ctrl+Enter`. Enter an instruction, then
select **Generate**. The generated Markdown is inserted at the cursor.

Examples:

- Draft a release checklist.
- Explain this section with an example.
- Create a Mermaid sequence diagram.
- Create a Markdown comparison table.

You can also open the assistant from **Plugins → Inkdrop Codex → Edit with Codex** or the editor
context menu.

### Rewrite selected text

Select text and press `Ctrl+Enter`. The generated result replaces only that selection. The popover
provides these presets:

- **Improve writing** — improve clarity and structure while preserving meaning.
- **Make shorter** — make the selection concise without losing important information.
- **Expand** — add useful detail and a clearer structure.
- **Fix grammar** — fix grammar, spelling, and punctuation.
- **Generate Mermaid** — return a fenced Mermaid diagram.
- **Generate table** — return a concise Markdown table.

Selecting a preset fills the instruction field. You can edit the instruction before selecting
**Generate**. Press `Escape` or select **Cancel** to close the popover without modifying the note.

### Use next-edit predictions

Place the cursor with no text selected and press `Alt+\`. When a suggestion appears as ghost text:

- Press `Tab` to insert it.
- Press `Escape` to discard it.

The prediction is also discarded if the note or cursor position changes before acceptance.

Choose the prediction behavior in Inkdrop's plugin settings:

- **manual** — request predictions with `Alt+\`.
- **automatic** — request a prediction after you pause typing.
- **disabled** — do not request predictions.

### Connect your Codex account

Open **Plugins → Inkdrop Codex → Account**, then select **Sign in**. The extension first attempts
browser OAuth and provides the device-code flow when required. Use the same Account menu to check
the connection, sign in again, or sign out.

The commands `inkdrop-codex:login` and `inkdrop-codex:logout` are also available through Inkdrop's
command system, but do not have default shortcuts.

## Settings

Inkdrop exposes these settings for the extension:

- **Next edit prediction** — `automatic`, `manual`, or `disabled`.
- **Codex model** — an optional model ID. Leave it empty to use the provider default.

## Privacy and credential storage

The extension does not store chat history or read other notes. A request contains the current
selection and a bounded amount of nearby text from the active note.

OAuth credentials are encrypted with AES-256-GCM. The encrypted envelope is stored in Inkdrop's
user data directory, while its encryption key is stored in the operating system credential vault
through a native Perry helper. Credential operations fail closed if the helper or credential vault
is unavailable; there is no plaintext fallback.

## Development

Enter the declared native toolchain and run the complete quality gate:

```sh
nix develop
pnpm install
pnpm quality
```

`pnpm quality` runs workflow linting, Biome formatting and lint checks, TypeScript checks, Vitest,
Perry compatibility checks, and the production plugin build. Apply safe formatting and lint fixes
with `pnpm biome:fix`.

To build the native credential helper for the current platform:

```sh
pnpm build:helper
```

Copy the executable from `packages/credential-helper/dist/<platform>-<arch>/` to
`packages/plugin/bin/<platform>-<arch>/`, then link the extension into Inkdrop:

```sh
cd packages/plugin
ipm link --dev
```

Enable Development Mode in Inkdrop and reload it. See
[Inkdrop API and hands-on testing](./docs/inkdrop-api.md) for the complete smoke-test procedure.

## Continuous integration

Pull requests run the complete quality gate, dependency review, CodeQL, and native
credential-helper builds for x64 and ARM64 on Linux, Windows, and macOS without producing a release
archive. Manually running the **Release** workflow from `main` builds one
`inkdrop-codex-release-bundle` and then pauses at the
protected `inkdrop-production` environment. Download that artifact and complete the platform smoke
tests before approving the environment. Approval attests and publishes those exact archives without
rebuilding them, creating the version tag only at publication time. Reject the deployment if any
test fails. Publishing to the Inkdrop Registry remains a separate manual step after the GitHub
Release has been verified.

Perry does not publish a Windows ARM64 compiler. The workflow therefore builds the x64 helper on a
Windows x64 runner, transfers that exact artifact to a Windows 11 ARM runner, and verifies that it
starts under x64 emulation before packaging it in `bin/win32-arm64`.

## Commands

- `inkdrop-codex:edit`
- `inkdrop-codex:trigger-next-edit`
- `inkdrop-codex:accept-next-edit`
- `inkdrop-codex:dismiss-next-edit`
- `inkdrop-codex:open-account`
- `inkdrop-codex:login`
- `inkdrop-codex:logout`

## License

MIT. See [LICENSE](./LICENSE).
