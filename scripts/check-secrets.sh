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
# CI wiring (GitHub Actions example):
#   - name: Secret scan
#     run: bash scripts/check-secrets.sh
#
# Usage:
#   bash scripts/check-secrets.sh
#   # or from apps/mobile/:
#   pnpm check-secrets

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
MOBILE_DIR="$ROOT/apps/mobile"

# Directories and files to scan — all code that ends up in the RN bundle.
SCAN_TARGETS=(
  "$MOBILE_DIR/src"
  "$MOBILE_DIR/App.tsx"
  "$MOBILE_DIR/index.ts"
  "$MOBILE_DIR/app.json"
  "$MOBILE_DIR/app.config.ts"
  "$MOBILE_DIR/app.config.js"
)

# Patterns that must never appear in mobile source files.
# Entries are POSIX extended-regex fragments passed to grep -E.
FORBIDDEN_PATTERNS=(
  "service_role"            # Supabase service-role key or literal string
  "sk-ant-"                 # Anthropic API key prefix
  "SUPABASE_SERVICE_ROLE"   # Env var name for the service-role key
  "ANTHROPIC_API_KEY"       # Env var name for the Anthropic key
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9\.[A-Za-z0-9_-]{20}" # raw JWT fragment
)

FOUND=0

for pattern in "${FORBIDDEN_PATTERNS[@]}"; do
  for target in "${SCAN_TARGETS[@]}"; do
    [[ -e "$target" ]] || continue

    if [[ -d "$target" ]]; then
      matches=$(grep -rInE "$pattern" \
        --include="*.ts" \
        --include="*.tsx" \
        --include="*.js" \
        --include="*.json" \
        "$target" 2>/dev/null || true)
    else
      matches=$(grep -InE "$pattern" "$target" 2>/dev/null || true)
    fi

    if [[ -n "$matches" ]]; then
      echo "❌  FORBIDDEN pattern '$pattern' found:"
      echo "$matches" | sed 's/^/    /'
      FOUND=1
    fi
  done
done

if [[ $FOUND -eq 0 ]]; then
  echo "✅  Secret scan passed — no forbidden patterns found in mobile source"
  exit 0
else
  echo ""
  echo "🚨  Secret scan FAILED. Remove the above values from mobile source."
  echo "    Use EXPO_PUBLIC_* env vars for publishable keys only."
  echo "    Service-role keys and API keys belong in EAS Secrets or Supabase"
  echo "    Edge Function env vars — never in the mobile bundle."
  exit 1
fi
