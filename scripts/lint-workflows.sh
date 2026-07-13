#!/bin/sh

set -eu

tool_dir="$PWD/.pnpm-store/bin"
sisakulint="$tool_dir/sisakulint"
version="v0.2.4"
version_file="$tool_dir/sisakulint.version"

if [ ! -x "$sisakulint" ] || [ ! -f "$version_file" ] ||
  [ "$(cat "$version_file")" != "$version" ]; then
  mkdir -p "$tool_dir"
  GOBIN="$tool_dir" go install "github.com/sisaku-security/sisakulint/cmd/sisakulint@$version"
  printf '%s\n' "$version" >"$version_file"
fi

"$sisakulint" -ignore impostor-commit ||
  test -z "$("$sisakulint" -ignore impostor-commit 2>&1)"

node scripts/check-release-workflow.mjs
