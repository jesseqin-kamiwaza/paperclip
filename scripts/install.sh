#!/usr/bin/env bash
set -euo pipefail

# install.sh — Install the Solo Unicorn CLI globally via npm.
#
# Usage:
#   curl -fsSL https://solounicornclub.com/install.sh | bash

PACKAGE_NAME="solo-unicorn"
REPO_URL="https://github.com/paperclipai/paperclip"

# ── Banner ────────────────────────────────────────────────────────────────────

cat <<'BANNER'

  ____        _          _   _       _
 / ___|  ___ | | ___    | | | |_ __ (_) ___ ___  _ __ _ __
 \___ \ / _ \| |/ _ \   | | | | '_ \| |/ __/ _ \| '__| '_ \
  ___) | (_) | | (_) |  | |_| | | | | | (_| (_) | |  | | | |
 |____/ \___/|_|\___/    \___/|_| |_|_|\___\___/|_|  |_| |_|

  Orchestrate AI agent teams to run a business
  https://solounicornclub.com

BANNER

# ── Dependency checks ────────────────────────────────────────────────────────

check_cmd() {
  command -v "$1" >/dev/null 2>&1
}

if ! check_cmd node; then
  echo "Error: Node.js is required but not installed."
  echo "Install it from https://nodejs.org (v20+ recommended)."
  exit 1
fi

NODE_MAJOR=$(node -p 'process.versions.node.split(".")[0]')
if [ "$NODE_MAJOR" -lt 20 ]; then
  echo "Warning: Node.js v20+ is recommended (found v$(node -p process.versions.node))."
fi

if ! check_cmd npm; then
  echo "Error: npm is required but not installed."
  echo "It usually ships with Node.js — see https://nodejs.org."
  exit 1
fi

# ── Install ──────────────────────────────────────────────────────────────────

echo "Installing ${PACKAGE_NAME} globally..."
npm install -g "${PACKAGE_NAME}"

# ── Verify ───────────────────────────────────────────────────────────────────

if check_cmd solounicorn; then
  echo ""
  echo "Solo Unicorn CLI installed successfully!"
  echo ""
  echo "Get started:"
  echo "  solounicorn onboard    # First-time setup wizard"
  echo "  solounicorn doctor     # Diagnose your setup"
  echo "  solounicorn run        # Start Solo Unicorn"
  echo ""
  echo "Documentation: https://solounicornclub.com"
  echo "Source:        ${REPO_URL}"
else
  echo ""
  echo "Installation completed, but 'solounicorn' was not found on PATH."
  echo "You may need to add npm's global bin directory to your PATH."
  echo ""
  echo "Try running:"
  echo "  export PATH=\"\$(npm config get prefix)/bin:\$PATH\""
  echo "  solounicorn --help"
fi
