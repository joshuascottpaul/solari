#!/usr/bin/env bash
# check-html.sh -- verifies index.html contains required meta tags,
# script tags, and element IDs. Exits 1 on any missing item.

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
HTML="$REPO_ROOT/index.html"

if [ ! -f "$HTML" ]; then
  echo "ERROR: index.html not found at $HTML" >&2
  exit 1
fi

failures=0

check() {
  local description="$1"
  local pattern="$2"
  if grep -q "$pattern" "$HTML"; then
    echo "  OK  $description"
  else
    echo "  FAIL $description"
    failures=$((failures + 1))
  fi
}

echo "Checking $HTML"
echo ""

# Required meta tags
echo "--- meta tags ---"
check 'charset UTF-8'                     'charset="UTF-8"'
check 'viewport meta'                     'name="viewport"'
check 'apple-mobile-web-app-capable'      'name="apple-mobile-web-app-capable"'
check 'apple-mobile-web-app-status-bar'   'name="apple-mobile-web-app-status-bar-style"'
check 'theme-color'                       'name="theme-color"'

# Required link tags
echo ""
echo "--- link tags ---"
check 'manifest.json linked'              'href="manifest.json"'
check 'style.css linked'                  'href="style.css"'

# Required script tags
echo ""
echo "--- script tags ---"
check 'lib/perlin.js loaded'              'src="lib/perlin.js"'
check 'lib/suncalc.js loaded'             'src="lib/suncalc.js"'
check 'app.js loaded'                     'src="app.js"'

# Required element IDs
echo ""
echo "--- element IDs ---"
check 'id="time"'                         'id="time"'
check 'id="date"'                         'id="date"'
check 'id="moon-disc"'                    'id="moon-disc"'
check 'id="slot"'                         'id="slot"'
check 'id="refresher-overlay"'            'id="refresher-overlay"'

echo ""
if [ "$failures" -gt 0 ]; then
  echo "FAIL: $failures check(s) failed"
  exit 1
fi

echo "OK: all checks passed"
