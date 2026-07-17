#!/bin/sh

set -eu

tool_dir="$PWD/.pnpm-store/bin"
sisakulint="$tool_dir/sisakulint"
version="v0.3.4"
version_file="$tool_dir/sisakulint.version"

if [ ! -x "$sisakulint" ] || [ ! -f "$version_file" ] ||
  [ "$(cat "$version_file")" != "$version" ]; then
  mkdir -p "$tool_dir"
  GOBIN="$tool_dir" go install "github.com/sisaku-security/sisakulint/cmd/sisakulint@$version"
  printf '%s\n' "$version" >"$version_file"
fi

lint() {
  "$sisakulint" "$@" || test -z "$("$sisakulint" "$@" 2>&1)"
}

set --
for workflow in .github/workflows/*.yml .github/workflows/*.yaml; do
  [ -f "$workflow" ] || continue
  [ "$workflow" = ".github/workflows/ci.yml" ] || set -- "$@" "$workflow"
done

lint -ignore impostor-commit "$@"

# GitHub Actions supports parallel steps, but Sisakulint v0.3.4's schema does not.
# Defer ci.yml syntax validation to GitHub while keeping Sisakulint's security rules enabled.
# Syntax validation stays strict for every other workflow.
lint \
  -ignore impostor-commit \
  -ignore syntax \
  .github/workflows/ci.yml

node scripts/check-release-workflow.mjs
