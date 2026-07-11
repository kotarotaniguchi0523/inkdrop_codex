# Contributing

## Development

Use the pinned pnpm version and Node.js 24. The Nix development shell supplies the native compiler
and credential-vault dependencies on supported Unix systems.

```sh
nix develop
pnpm install --frozen-lockfile
pnpm quality
```

## Changes

Keep changes scoped to one behavior. Add dependencies with `pnpm add`, preserve the encrypted
credential boundary, and never add plaintext credential fallbacks or token logging. Tests must use
Arrange, Act, Assert and verify exported behavior or real boundary results.

Use Conventional Commit subjects. Pull requests must explain user-visible behavior, security or
privacy implications, verification commands, and any Inkdrop desktop testing performed. UI changes
should include screenshots.

## Distribution

CI artifacts are for desktop testing only. Do not publish the plugin to the Inkdrop registry or
create a public release without maintainer approval and a complete multi-platform helper set.
