#!/usr/bin/env bash
#
# build-sidecar.sh
#
# Compiles the Paperclip server into a standalone binary using @yao-pkg/pkg
# and places it in src-tauri/binaries/ with the correct target-triple suffix
# so that Tauri can locate it as a sidecar.
#
# Usage:
#   bash scripts/build-sidecar.sh
#
# Prerequisites:
#   - Node.js 20+
#   - pnpm (workspace dependencies must be installed)

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DESKTOP_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
REPO_ROOT="$(cd "$DESKTOP_DIR/../.." && pwd)"
BINARIES_DIR="$DESKTOP_DIR/src-tauri/binaries"

# ── Determine target triple ────────────────────────────────────────────
detect_target_triple() {
  local arch os triple

  arch="$(uname -m)"
  os="$(uname -s)"

  case "$arch" in
    x86_64|amd64)  arch="x86_64"  ;;
    arm64|aarch64)  arch="aarch64" ;;
    *)
      echo "Error: unsupported architecture: $arch" >&2
      exit 1
      ;;
  esac

  case "$os" in
    Darwin)  triple="${arch}-apple-darwin"        ;;
    Linux)   triple="${arch}-unknown-linux-gnu"    ;;
    MINGW*|MSYS*|CYGWIN*) triple="${arch}-pc-windows-msvc" ;;
    *)
      echo "Error: unsupported OS: $os" >&2
      exit 1
      ;;
  esac

  echo "$triple"
}

TARGET_TRIPLE="$(detect_target_triple)"
SIDECAR_NAME="solounicorn-server-${TARGET_TRIPLE}"

echo "╔═══════════════════════════════════════════════════════╗"
echo "║  Building Solo Unicorn server sidecar                 ║"
echo "║  Target: ${TARGET_TRIPLE}"
echo "╚═══════════════════════════════════════════════════════╝"
echo ""

# ── Step 1: Build the monorepo ──────────────────────────────────────────
echo "→ Building monorepo packages..."
(cd "$REPO_ROOT" && pnpm run build)

# ── Step 2: Bundle server with esbuild into a single file ───────────────
echo "→ Bundling server with esbuild..."
BUNDLE_DIR="$DESKTOP_DIR/tmp-bundle"
mkdir -p "$BUNDLE_DIR"

npx esbuild "$REPO_ROOT/server/dist/index.js" \
  --bundle \
  --platform=node \
  --target=node20 \
  --outfile="$BUNDLE_DIR/server-bundle.mjs" \
  --format=esm \
  --banner:js="import { createRequire } from 'module'; const require = createRequire(import.meta.url);" \
  --external:embedded-postgres \
  --external:better-sqlite3 \
  --external:pg-native \
  --external:cpu-features \
  --external:ssh2 \
  --external:fsevents \
  --external:lightningcss \
  --external:@tailwindcss/oxide \
  --external:vite \
  --external:rollup \
  --external:esbuild \
  --external:tsx \
  --sourcemap=external \
  --minify

# ── Step 3: Package into a standalone binary with pkg ───────────────────
echo "→ Packaging standalone binary with @yao-pkg/pkg..."

# Determine pkg target
PKG_ARCH="$(uname -m)"
case "$PKG_ARCH" in
  x86_64|amd64)  PKG_ARCH="x64"   ;;
  arm64|aarch64)  PKG_ARCH="arm64" ;;
esac

PKG_OS="$(uname -s)"
case "$PKG_OS" in
  Darwin)  PKG_OS="macos"   ;;
  Linux)   PKG_OS="linux"   ;;
  MINGW*|MSYS*|CYGWIN*) PKG_OS="win" ;;
esac

PKG_TARGET="node20-${PKG_OS}-${PKG_ARCH}"

mkdir -p "$BINARIES_DIR"

npx --yes @yao-pkg/pkg \
  "$BUNDLE_DIR/server-bundle.mjs" \
  --target "$PKG_TARGET" \
  --output "$BINARIES_DIR/$SIDECAR_NAME" \
  --compress GZip

# ── Step 4: Clean up ────────────────────────────────────────────────────
rm -rf "$BUNDLE_DIR"

# ── Step 5: Make executable ─────────────────────────────────────────────
chmod +x "$BINARIES_DIR/$SIDECAR_NAME"

echo ""
echo "✓ Sidecar binary built successfully:"
echo "  $BINARIES_DIR/$SIDECAR_NAME"
echo ""
ls -lh "$BINARIES_DIR/$SIDECAR_NAME"
