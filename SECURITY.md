# Security Policy

## Supported Versions

This project is pre-release. Security fixes are applied to the latest commit on `main` only. After
the first release, security fixes will be provided for the latest released version. Pre-release test
bundles are supported only while their corresponding GitHub Actions artifacts remain available.

## Reporting a Vulnerability

Do not open a public issue for a suspected vulnerability or exposed credential. Use
[GitHub private vulnerability reporting](https://github.com/kotarotaniguchi0523/inkdrop_codex/security/advisories/new)
so the report and follow-up discussion remain private.

Include the affected version, operating system, reproduction steps, expected impact, and any
suggested mitigation. Do not include real access tokens, refresh tokens, credential-vault contents,
or private Inkdrop notes in the report.

The project will acknowledge a report within seven days. No service-level response or disclosure
timeline is guaranteed while the extension remains pre-release.

## Scope

The Inkdrop plugin, credential contract, Perry helper, packaging scripts, and CI workflows are in
scope. Vulnerabilities in Inkdrop, OpenAI, Pi, Perry, operating-system credential vaults, or GitHub
Actions should be reported to their respective maintainers unless this repository uses them
unsafely.

## Release Integrity

Official releases are created from immutable `v*` tags by GitHub Actions. Verify the published
SHA-256 checksums and GitHub artifact attestation before installing a release bundle.
