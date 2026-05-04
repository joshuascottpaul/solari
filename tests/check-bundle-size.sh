#!/usr/bin/env bash
# check-bundle-size.sh -- verifies total deployed bundle stays under 250 KB.
# Exits 1 if the limit is exceeded.

set -euo pipefail

LIMIT_BYTES=256000   # 250 KB = 250 * 1024
REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"

# All files that ship to the browser.
FILES=(
  "$REPO_ROOT/index.html"
  "$REPO_ROOT/style.css"
  "$REPO_ROOT/app.js"
  "$REPO_ROOT/manifest.json"
  "$REPO_ROOT/lib/suncalc.js"
  "$REPO_ROOT/lib/perlin.js"
  "$REPO_ROOT/data/almanac.json"
  "$REPO_ROOT/data/tides.json"
  "$REPO_ROOT/data/alerts.json"
)

total=0
printf "%-40s %10s\n" "File" "Bytes"
printf "%-40s %10s\n" "----" "-----"

for f in "${FILES[@]}"; do
  if [ ! -f "$f" ]; then
    echo "ERROR: expected file not found: $f" >&2
    exit 1
  fi
  size=$(wc -c < "$f")
  printf "%-40s %10d\n" "${f#"$REPO_ROOT/"}" "$size"
  total=$((total + size))
done

printf "%-40s %10s\n" "----" "-----"
printf "%-40s %10d\n" "TOTAL" "$total"
printf "%-40s %10d\n" "LIMIT" "$LIMIT_BYTES"

if [ "$total" -gt "$LIMIT_BYTES" ]; then
  echo ""
  echo "FAIL: bundle is ${total} bytes -- exceeds ${LIMIT_BYTES}-byte limit ($(( (total - LIMIT_BYTES) / 1024 )) KB over)"
  exit 1
fi

echo ""
echo "OK: bundle is ${total} bytes ($(( (LIMIT_BYTES - total) / 1024 )) KB remaining)"
