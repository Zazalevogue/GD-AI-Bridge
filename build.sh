#!/usr/bin/env bash
# Builds the mod on macOS/Linux (needs Geode CLI + SDK, CMake, Ninja). Windows: use build.bat.
set -euo pipefail
cd "$(dirname "$0")"
if [ -z "${GEODE_SDK:-}" ]; then
  echo "GEODE_SDK is not set. Run 'geode sdk install' (or set GEODE_SDK to your Geode 6.0.0 SDK checkout)." >&2
  exit 1
fi
command -v geode >/dev/null || { echo "Geode CLI (>= 4.0.0) not found." >&2; exit 1; }
geode build
