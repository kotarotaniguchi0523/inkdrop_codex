# Security Policy

## Supported Versions

This project is pre-release. Security fixes are applied to the latest commit on `main` only.

## Reporting a Vulnerability

Do not open a public issue for suspected vulnerabilities involving OAuth credentials, the native
credential helper, or unintended note disclosure. Use GitHub's private vulnerability reporting for
this repository and include affected versions, reproduction steps, impact, and relevant logs with
secrets removed.

The project will acknowledge a report within seven days. No service-level response or disclosure
timeline is guaranteed while the extension remains pre-release.

## Scope

The Inkdrop plugin, credential contract, Perry helper, packaging scripts, and CI workflows are in
scope. Vulnerabilities in Inkdrop, OpenAI, Pi, Perry, operating-system credential vaults, or GitHub
Actions should be reported to their respective maintainers unless this repository uses them
unsafely.
