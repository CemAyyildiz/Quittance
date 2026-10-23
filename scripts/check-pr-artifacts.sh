#!/usr/bin/env bash
#
# PR artifact guard
#
# Scans the diff between two refs for file patterns associated with
# supply-chain payloads hidden inside otherwise unrelated/"feature" PRs:
#
#   - .vscode/ files (e.g. tasks.json with "runOn": "folderOpen" that
#     auto-executes code when the folder is opened in VS Code)
#   - new font/binary-looking files (.woff2, .eot, .ttf, .node, .wasm, ...)
#     that are sometimes disguised JS/payloads
#   - committed dist/ build output (direct payload, or just bad hygiene)
#   - added/changed npm lifecycle scripts (preinstall/postinstall/prepare/...)
#     that run automatically on `npm install`
#
# A match does NOT prove malice — it means the file(s) need a human look
# before merging. This script only flags patterns; it never auto-rejects
# based on file *contents*, since those can't be fetched without approval.
#
# Usage:
#   scripts/check-pr-artifacts.sh [BASE_REF] [HEAD_REF]
#
# BASE_REF/HEAD_REF default to $BASE_SHA/$HEAD_SHA env vars (set by CI),
# falling back to origin/main and HEAD for local runs.

set -euo pipefail

BASE_REF="${1:-${BASE_SHA:-origin/main}}"
HEAD_REF="${2:-${HEAD_SHA:-HEAD}}"

echo "PR artifact guard: diffing ${BASE_REF}...${HEAD_REF}"

CHANGED_FILES="$(git diff --name-only --diff-filter=ACMR "${BASE_REF}" "${HEAD_REF}")"

FAIL=0
FLAGGED=()

while IFS= read -r f; do
  [[ -z "$f" ]] && continue

  # 1. .vscode/ config — can auto-run tasks on folder open
  if [[ "$f" == .vscode/* ]]; then
    FLAGGED+=("$f  — editor auto-run config; check for \"runOn\": \"folderOpen\"")
    FAIL=1
  fi

  # 2. Suspicious binary/font-like extensions — sometimes disguised code
  if [[ "$f" =~ \.(woff2?|eot|ttf|otf|bin|exe|dll|so|dylib|node|wasm)$ ]]; then
    FLAGGED+=("$f  — binary/font asset; verify it's a real font/binary, not disguised code")
    FAIL=1
  fi

  # 3. Committed build output
  if [[ "$f" == dist/* || "$f" == */dist/* ]]; then
    FLAGGED+=("$f  — committed build output; should not be checked into git")
    FAIL=1
  fi
done <<< "$CHANGED_FILES"

# 4. package.json lifecycle scripts added/changed (preinstall/postinstall/prepare/...)
while IFS= read -r f; do
  [[ -z "$f" ]] && continue
  if [[ "$f" == "package.json" || "$f" == */package.json ]]; then
    added_lifecycle="$(git diff -U0 "${BASE_REF}" "${HEAD_REF}" -- "$f" \
      | grep -E '^\+' \
      | grep -E '"(pre|post)?(install|publish|prepare)"[[:space:]]*:' || true)"
    if [[ -n "$added_lifecycle" ]]; then
      FLAGGED+=("$f  — added/changed npm lifecycle script (runs automatically on install)")
      FAIL=1
    fi
  fi
done <<< "$CHANGED_FILES"

echo ""
if [[ "$FAIL" -eq 1 ]]; then
  echo "⚠️  Suspicious file pattern(s) found in this diff:"
  for item in "${FLAGGED[@]}"; do
    echo "  - $item"
  done
  echo ""
  echo "These patterns match known techniques for hiding payloads in PRs"
  echo "(editor auto-run tasks, disguised binaries, npm install-time hooks)."
  echo "This does not necessarily mean the PR is malicious, but a human must"
  echo "inspect the actual file contents before merging."
  exit 1
else
  echo "No suspicious artifact patterns found."
fi
