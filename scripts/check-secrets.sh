#!/usr/bin/env bash
# check-secrets.sh — scan the mobile bundle source for committed secrets.
#
# Run this in CI (or locally before pushing) to catch keys that must never
# appear in the React Native bundle. The mobile app is shipped to users;
# anything in apps/mobile/ is effectively public.
#
# Exit codes:
#   0 — no secrets found
#   1 — one or more secrets found (prints each match)
#
# Usage:
#   bash scripts/check-secrets.sh
#   # or from apps/mobile/:
#   pnpm check-secrets

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SCAN_DIR="$ROOT/apps/mobile/src"

# Patterns that must never appear in mobile source files.
# Entries are POSIX extended-regex fragments passed to grep -E.
FORBIDDEN_PATTERNS=(
  "service_role"          # Supabase service-role key or literal string
  "sk-ant-"               # Anthropic API key prefix
  "SUPABASE_SERVICE_ROLE" # Env var name for the service-role key
  "ANTHROPIC_API_KEY"     # Env var name for the Anthropic key
)

FOUND=0

for pattern in "${FORBIDDEN_PATTERNS[@]}"; do
  # -r recursive, -n line numbers, -I skip binary files, --include TS/JS/JSON
  matches=$(grep -rInE "$pattern" \
    --include="*.ts" \
    --include="*.tsx" \
    --include="*.js" \
    --include="*.json" \
    "$SCAN_DIR" 2>/dev/null || true)

  if [[ -n "$matches" ]]; then
    echo "❌  FORBIDDEN pattern '$pattern' found in mobile source:"
    echo "$matches" | sed 's/^/    /'
    FOUND=1
  fi
done

if [[ $FOUND -eq 0 ]]; then
  echo "✅  No secrets found in $SCAN_DIR"
  exit 0
else
  echo ""
  echo "🚨  Secret scan FAILED. Remove the above values from mobile source."
  echo "    Use EXPO_PUBLIC_* env vars for publishable keys only."
  exit 1
fi
